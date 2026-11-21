import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createProject, packageName, projectPackage, templateNames, TEMPLATES } from '../lib/init.js'
import { deviceFiles } from '../lib/devices.js'
import pkg from '../package.json' with { type: 'json' }

const BIN = fileURLToPath(new URL('../bin/io-init.js', import.meta.url))

function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'io-init-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('the starter template has pages and virtual devices', () => {
  assert.ok(templateNames().includes('starter'))
  const starter = path.join(TEMPLATES, 'starter')
  for (const file of ['www/index.html', 'www/robot.html', 'www/robot.js', 'www/signals.js', 'README.md']) {
    assert.ok(fs.existsSync(path.join(starter, file)), file)
  }
  const devices = deviceFiles([path.join(starter, 'devices')]).map(file => path.basename(file))
  assert.ok(devices.includes('robot-arm.device.js'))
  assert.ok(devices.length >= 5)
})

test('createProject copies the template and writes package.json and .gitignore', t => {
  const dir = path.join(tempDir(t), 'My Home!')
  const { files } = createProject(dir, { port: 8080 })
  assert.ok(files.includes('www/robot.html'))
  assert.ok(files.includes('devices/robot-arm.device.js'))
  assert.ok(files.includes('.gitignore'))
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  assert.equal(written.name, 'my-home')
  assert.equal(written.private, true)
  assert.equal(written.scripts.start, 'io-server -l 8080 -L 55488 --web --site ./www --devices ./devices --dashboard')
  assert.equal(written.dependencies['iosignal-cli'], `^${pkg.version}`)
})

test('createProject accepts an empty folder and refuses a used one or an unknown template', t => {
  const base = tempDir(t)
  const empty = path.join(base, 'empty')
  fs.mkdirSync(empty)
  createProject(empty)
  assert.throws(() => createProject(empty), /is not empty/)
  const file = path.join(base, 'file')
  fs.writeFileSync(file, 'x')
  assert.throws(() => createProject(file), /not a folder/)
  assert.throws(() => createProject(path.join(base, 'other'), { template: 'nope' }), /unknown template 'nope'/)
  assert.equal(fs.existsSync(path.join(base, 'other')), false, 'nothing is created for an unknown template')
})

test('package names come from the folder name', () => {
  assert.equal(packageName('/x/My Home'), 'my-home')
  assert.equal(packageName('/x/_hidden'), 'hidden')
  assert.equal(packageName('/x/!!!'), 'iosignal-home')
  assert.equal(projectPackage('a').scripts.devices, 'io-device ./devices -c ws://localhost:7777 -w')
})

test('the Arduino (CongSocket) port is open by default, can move or be left closed', t => {
  assert.equal(projectPackage('a').scripts.start, 'io-server -l 7777 -L 55488 --web --site ./www --devices ./devices --dashboard')
  assert.equal(projectPackage('a', 7777, 9000).scripts.start, 'io-server -l 7777 -L 9000 --web --site ./www --devices ./devices --dashboard')
  assert.equal(projectPackage('a', 7777, 0).scripts.start, 'io-server -l 7777 --web --site ./www --devices ./devices --dashboard')
  const base = tempDir(t)
  assert.throws(() => createProject(path.join(base, 'same'), { port: 9000, arduinoPort: 9000 }), /both 9000/)
  assert.equal(fs.existsSync(path.join(base, 'same')), false)
})

test('io-init command creates the folder and prints the next steps', t => {
  const base = tempDir(t)
  const result = spawnSync(process.execPath, [BIN, 'site', '--port', '7801'], { cwd: base, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Created site \(\d+ files, template starter\)/)
  assert.match(result.stdout, /npm start/)
  assert.match(result.stdout, /http:\/\/localhost:7801\/site\//)
  assert.match(result.stdout, /Arduino boards: .* port 55488/)
  const noArduino = spawnSync(process.execPath, [BIN, 'web-only', '--arduino-port', '0'], { cwd: base, encoding: 'utf8' })
  assert.equal(noArduino.status, 0, noArduino.stderr)
  assert.doesNotMatch(noArduino.stdout, /Arduino boards/)
  assert.doesNotMatch(fs.readFileSync(path.join(base, 'web-only', 'package.json'), 'utf8'), / -L /)
  assert.ok(fs.existsSync(path.join(base, 'site', 'devices', 'robot-arm.device.js')))

  const again = spawnSync(process.execPath, [BIN, 'site'], { cwd: base, encoding: 'utf8' })
  assert.equal(again.status, 1)
  assert.match(again.stderr, /site is not empty/)
  const badPort = spawnSync(process.execPath, [BIN, 'x', '--port', '0'], { cwd: base, encoding: 'utf8' })
  assert.equal(badPort.status, 1)
  assert.match(badPort.stderr, /fixed port/)
})
