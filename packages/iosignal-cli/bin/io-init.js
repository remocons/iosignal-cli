#!/usr/bin/env node
// Creates a folder with example pages (www/) and virtual devices (devices/) for io-server.
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { program } from 'commander'
import { port } from '../lib/cli.js'
import { createProject, templateNames, DEFAULT_TEMPLATE, DEFAULT_PORT, ARDUINO_PORT } from '../lib/init.js'
import pkg from '../package.json' with { type: 'json' }

program
  .name('io-init')
  .version(pkg.version)
  .description('Create a folder with example pages and virtual devices for io-server.')
  .argument('[folder]', 'new folder (must not exist or be empty)', 'iosignal-home')
  .option('-t, --template <name>', `template: ${templateNames().join(', ')}`, DEFAULT_TEMPLATE)
  .option('-p, --port <port>', 'WebSocket port for the pages, browsers and Node.js', port, DEFAULT_PORT)
  .option('-a, --arduino-port <port>', 'CongSocket (TCP) port for Arduino boards; 0 leaves it closed', port, ARDUINO_PORT)
  .option('-i, --install', 'run npm install in the new folder')
  .addHelpText('after', `
Examples:
  npx -p iosignal-cli io-init my-home
  io-init my-home --port 8080 --arduino-port 0 --install

Then:
  cd my-home
  npm install
  npm start            io-server -l ${DEFAULT_PORT} -L ${ARDUINO_PORT} --web --site ./www --devices ./devices --dashboard
                       open http://localhost:${DEFAULT_PORT}/site/
                       boards: server = this computer's address (ioip), port ${ARDUINO_PORT}`)
  .showHelpAfterError('Use --help for options and examples.')
  .parse(process.argv)

const [folder] = program.args.length ? program.args : ['iosignal-home']
const options = program.opts()
if (options.port === 0) program.error('--port needs a fixed port (1..65535)')

let project
try {
  project = createProject(folder, { template: options.template, port: options.port, arduinoPort: options.arduinoPort })
} catch (error) {
  program.error(error.message)
}

const shown = path.relative(process.cwd(), project.dir) || '.'
console.log(`Created ${shown} (${project.files.length} files, template ${options.template})`)
for (const file of project.files) console.log(`  ${file}`)

if (options.install) {
  console.log('\nnpm install')
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npm, ['install'], { cwd: project.dir, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) {
    console.error(`npm install failed: run it in ${shown} yourself`)
    process.exit(result.status ?? 1)
  }
}

console.log(`
Next:
  cd ${shown}${options.install ? '' : '\n  npm install'}
  npm start
  open http://localhost:${options.port}/site/   (devices at /, status at /dashboard)${options.arduinoPort ? `
  Arduino boards: set the server to this computer's address (run ioip) and port ${options.arduinoPort}` : ''}`)
