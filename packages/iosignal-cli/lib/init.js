// io-init: copies a page-and-virtual-device template into a new folder and writes its package.json,
// whose `npm start` runs io-server on it. The templates live in this package (templates/<name>).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pkg from '../package.json' with { type: 'json' }

export const TEMPLATES = fileURLToPath(new URL('../templates/', import.meta.url))
export const DEFAULT_TEMPLATE = 'starter'
export const DEFAULT_PORT = 7777
// The CongSocket (TCP) port Arduino IOSignal connects to unless a sketch sets another (IOSignal.h).
export const ARDUINO_PORT = 55488

/** Template names: the folders under templates/. */
export function templateNames() {
  return fs.readdirSync(TEMPLATES, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
}

/** A package name from a folder name: lower case, a-z 0-9 - . _ only. */
export function packageName(dir) {
  const name = path.basename(path.resolve(dir)).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[._-]+|[-]+$/g, '')
  return name.slice(0, 214) || 'iosignal-home'
}

/**
 * The package.json of a new project: npm start runs io-server on www/ and devices/, with the
 * WebSocket port for pages and the CongSocket port for Arduino boards (0 leaves it closed).
 */
export function projectPackage(name, port = DEFAULT_PORT, arduinoPort = ARDUINO_PORT) {
  const cong = arduinoPort ? ` -L ${arduinoPort}` : ''
  return {
    name,
    version: '0.1.0',
    private: true,
    description: 'IOSignal pages and virtual devices',
    scripts: {
      start: `io-server -l ${port}${cong} --web --site ./www --devices ./devices --dashboard`,
      devices: `io-device ./devices -c ws://localhost:${port} -w`,
    },
    dependencies: { 'iosignal-cli': `^${pkg.version}` },
  }
}

/**
 * Creates the project. Refuses a folder that exists and is not empty.
 * @param {string} dir the new folder
 * @param {{ template?: string, port?: number, arduinoPort?: number }} [options] arduinoPort 0: no CongSocket port
 * @returns {{ dir: string, files: string[] }} the folder and the files written, relative to it
 */
export function createProject(dir, { template = DEFAULT_TEMPLATE, port = DEFAULT_PORT, arduinoPort = ARDUINO_PORT } = {}) {
  if (arduinoPort && arduinoPort === port) throw new Error(`the page port and the Arduino port are both ${port}: choose two ports`)
  const source = path.join(TEMPLATES, template)
  if (!templateNames().includes(template)) throw new Error(`unknown template '${template}' (${templateNames().join(', ')})`)
  const target = path.resolve(dir)
  if (fs.existsSync(target)) {
    if (!fs.statSync(target).isDirectory()) throw new Error(`${dir} exists and is not a folder`)
    if (fs.readdirSync(target).length) throw new Error(`${dir} is not empty: choose a new folder`)
  }
  fs.mkdirSync(target, { recursive: true })
  fs.cpSync(source, target, { recursive: true, errorOnExist: true, force: false })
  fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(projectPackage(packageName(target), port, arduinoPort), null, 2) + '\n')
  // npm leaves .gitignore out of packages, so it is written here.
  fs.writeFileSync(path.join(target, '.gitignore'), 'node_modules/\n*.log\n')
  return { dir: target, files: listFiles(target) }
}

function listFiles(root, base = root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(root, entry.name)
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full)]
  }).sort()
}
