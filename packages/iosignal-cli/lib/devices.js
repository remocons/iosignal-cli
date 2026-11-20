// Runs virtual devices: one process per *.device.js or *.device.json file, with the runner of iosignal/devices
// (the format of IOSignal Desktop). A device that exits is started again after a growing wait; one whose file
// is invalid waits until the file changes. With watch, new files start, changed ones restart, removed ones stop.
// Device code runs with this process's rights: load files only from a folder you control.
import fs from 'node:fs'
import path from 'node:path'
import { fork } from 'node:child_process'
import { DEVICES, DEVICES_MISSING } from './web.js'

const RUNNER = DEVICES && path.join(DEVICES, 'runner', 'device-runner.js')
const DEVICE_FILE = /\.device\.(js|mjs|json)$/
const LOG_LINES = 20
const BACKOFF_MS = [1000, 2000, 5000, 10000, 30000]
const STOP_WAIT_MS = 3000

/** The device files given: files as they are, folders by their *.device.js / *.device.json files. */
export function deviceFiles(targets) {
  const files = []
  for (const target of targets) {
    const stat = fs.statSync(target, { throwIfNoEntry: false })
    if (!stat) throw new Error(`${target}: no such file or folder`)
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(target).filter(name => DEVICE_FILE.test(name)).sort()) files.push(path.resolve(target, name))
    } else files.push(path.resolve(target))
  }
  return files
}

export const deviceName = file => path.basename(file).replace(DEVICE_FILE, '')

/**
 * @param {object} options
 * @param {string[]} options.targets device files or folders
 * @param {string} options.url broker URL the devices connect to (ws:// or cong://)
 * @param {string} [options.auth] id.key for every device, over the auth in their files
 * @param {boolean} [options.watch] follow changes of the files and folders
 * @param {(line: string) => void} [options.log]
 */
export function createDevices({ targets, url, auth, watch = false, log = line => console.log(line) }) {
  if (!RUNNER) throw new Error(`virtual devices ${DEVICES_MISSING}`)
  const devices = new Map() // file -> entry
  let closed = false
  const watchers = []

  function start(file) {
    const entry = devices.get(file) ?? { file, name: deviceName(file), restarts: 0, logs: [], state: 'stopped' }
    devices.set(file, entry)
    if (closed || entry.child) return
    entry.state = 'starting'
    entry.error = ''
    entry.mtime = fs.statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? 0
    // The runner imports the client library this CLI uses, by its exact file.
    const config = { module: import.meta.resolve('iosignal'), network: 'local', url, ...(auth && { auth }) }
    const child = fork(RUNNER, [file], {
      cwd: path.dirname(file), stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: { ...process.env, IOSD_CONFIG: JSON.stringify(config) },
    })
    entry.child = child
    const output = data => {
      for (const line of String(data).split('\n').filter(Boolean)) {
        entry.logs.push(line)
        if (entry.logs.length > LOG_LINES) entry.logs.shift()
        log(`[${entry.name}] ${line}`)
      }
    }
    child.stdout.on('data', output)
    child.stderr.on('data', output)
    child.on('message', message => {
      if (message?.t === 'ready') entry.state = 'running'
      else if (message?.t === 'meta') {
        entry.cid = message.data?.cid ?? entry.cid
        entry.link = message.data?.link ?? entry.link
        if (message.data?.authFailed) entry.error = 'login failed'
      } else if (message?.t === 'fatal') {
        entry.error = String(message.error ?? 'error')
        entry.fatal = true
      }
    })
    child.on('exit', code => {
      entry.child = null
      entry.cid = ''
      if (closed || entry.stopping) { entry.state = 'stopped'; entry.stopping = false; return }
      if (entry.fatal) {
        // An invalid file: started again when it changes (with watch) or never.
        entry.state = 'failed'
        entry.fatal = false
        log(`[${entry.name}] stopped: ${entry.error}`)
        return
      }
      const wait = BACKOFF_MS[Math.min(entry.restarts, BACKOFF_MS.length - 1)]
      entry.restarts++
      entry.state = 'backoff'
      entry.error ||= `exited with code ${code}`
      entry.timer = setTimeout(() => { entry.timer = null; start(file) }, wait)
    })
  }

  function stop(file) {
    const entry = devices.get(file)
    if (!entry) return Promise.resolve()
    clearTimeout(entry.timer)
    entry.timer = null
    if (!entry.child) { entry.state = 'stopped'; return Promise.resolve() }
    entry.stopping = true
    const child = entry.child
    return new Promise(resolve => {
      const kill = setTimeout(() => child.kill('SIGKILL'), STOP_WAIT_MS)
      child.once('exit', () => { clearTimeout(kill); resolve() })
      child.kill('SIGTERM')
    })
  }

  async function restart(file) {
    await stop(file)
    const entry = devices.get(file)
    if (entry) entry.restarts = 0
    start(file)
  }

  // Compares the files with the ones running: starts new ones, restarts changed ones, stops removed ones.
  let scanning = null
  async function rescan() {
    let files
    try { files = deviceFiles(targets) } catch (error) { log(`devices: ${error.message}`); return }
    for (const file of devices.keys()) {
      if (!files.includes(file)) {
        await stop(file)
        devices.delete(file)
        log(`[${deviceName(file)}] removed`)
      }
    }
    for (const file of files) {
      const entry = devices.get(file)
      if (!entry) start(file)
      else if ((fs.statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? 0) !== entry.mtime) {
        log(`[${entry.name}] changed, restarting`)
        await restart(file)
      }
    }
  }

  for (const file of deviceFiles(targets)) start(file)
  if (watch) {
    let timer = null
    const later = () => {
      clearTimeout(timer)
      timer = setTimeout(() => { scanning = (scanning ?? Promise.resolve()).then(rescan) }, 200)
    }
    for (const target of targets) watchers.push(fs.watch(target, later))
  }

  return {
    /** [{ name, file, state, cid, restarts, error, logs }] */
    list() {
      return [...devices.values()].map(({ name, file, state, cid, restarts, error, logs }) =>
        ({ name, file, state, cid: cid ?? '', restarts, error: error ?? '', logs: [...logs] }))
    },
    restart,
    async close() {
      closed = true
      for (const watcher of watchers) watcher.close()
      await Promise.all([...devices.keys()].map(stop))
    },
  }
}
