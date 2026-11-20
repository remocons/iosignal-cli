#!/usr/bin/env node
// Runs virtual devices against any IOSignal broker, without a server of its own.
// The device files use the IOSignal Desktop format (see io-device --help).
import { program } from 'commander'
import { createDevices, deviceFiles } from '../lib/devices.js'
import pkg from '../package.json' with { type: 'json' }

const AUTH = /^[^.\s]{1,8}\.\S+$/

program
  .name('io-device')
  .version(pkg.version)
  .description('Run virtual devices (*.device.js / *.device.json) on an IOSignal broker.')
  .argument('<path...>', 'device files, or folders of them')
  .option('-c, --connect <url>', 'broker URL: ws://, wss:// or cong:// (default: ws://localhost:7777)', 'ws://localhost:7777')
  .option('-a, --auth <id.key>', 'log every device in with this ID and key (over auth in the files)')
  .option('-w, --watch', 'restart a device when its file changes; start new files, stop removed ones')
  .addHelpText('after', `
Device file (one device per file, one process per device):

  // lamp.device.js
  export default {
    name: '내 조명:거실',            // $name: name:category
    type: 'light.1',                 // official type, or ui: 'on,off,toggle' buttons, or schema: a screen
    state: { on: '0' },              // $state, key=value
    view: { kind: 'bulb', on: 'on' },
    every: 2000,                     // onTick period in ms
    onReady(device) {},
    onCommand(command, device) {},   // return true to skip on, off, toggle, key=value handling
    onTick(device) {},               // device.set({ on: '1' }) publishes the new state
    onStop(device) {},
  }

  A *.device.json file holds the same fields without functions.
  channel: '#lab' makes the device a member of that group; auth: 'id.key' logs it in.
  Device code runs with your rights: run only files you trust.

Examples:
  io-device ./devices
  io-device lamp.device.js -c ws://192.168.0.24:7777
  io-device ./devices -c wss://io.iosignal.net/ws -a dev1.secret -w`)
  .showHelpAfterError('Use --help for options and examples.')
  .parse(process.argv)

const options = program.opts()
if (!/^(wss?|cong):\/\//.test(options.connect)) program.error('--connect needs a ws://, wss:// or cong:// URL')
if (options.auth !== undefined && !AUTH.test(options.auth)) program.error('--auth must be id.key with an ID of 8 characters or fewer')
let files
try { files = deviceFiles(program.args) } catch (error) { program.error(error.message) }
if (!files.length && !options.watch) program.error('no *.device.js or *.device.json files found')

const devices = createDevices({ targets: program.args, url: options.connect, auth: options.auth, watch: Boolean(options.watch) })
console.log(`${files.length} device file${files.length === 1 ? '' : 's'} on ${options.connect}${options.watch ? ' (watching)' : ''}`)

let stopping = false
async function shutdown() {
  if (stopping) return
  stopping = true
  await devices.close()
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
