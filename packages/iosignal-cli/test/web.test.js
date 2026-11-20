import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'node:http'
import { createWebHandler, resolveFile, controlPage, DEVICES } from '../lib/web.js'

const skip = !DEVICES && 'needs iosignal with iosignal/devices (after 9.22.0)'

function tempSite(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'io-site-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  fs.mkdirSync(path.join(dir, 'sub'))
  fs.writeFileSync(path.join(dir, 'index.html'), '<h1>home</h1>')
  fs.writeFileSync(path.join(dir, 'sub', 'index.html'), '<h1>sub</h1>')
  fs.writeFileSync(path.join(dir, 'app.js'), 'export {}')
  fs.writeFileSync(path.join(dir, '.secret'), 'no')
  const outside = path.join(os.tmpdir(), `io-outside-${process.pid}.txt`)
  fs.writeFileSync(outside, 'outside')
  t.after(() => fs.rmSync(outside, { force: true }))
  fs.symlinkSync(outside, path.join(dir, 'link.txt'))
  return dir
}

async function serve(t, options) {
  const handle = createWebHandler(options)
  const http = createServer((req, res) => { if (!handle(req, res)) { res.writeHead(599); res.end() } })
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => http.close(resolve)))
  return `http://127.0.0.1:${http.address().port}`
}

test('resolveFile stays in its folder: no .., hidden names or links that lead out', t => {
  const dir = tempSite(t)
  assert.equal(resolveFile(dir, 'app.js'), fs.realpathSync(path.join(dir, 'app.js')))
  assert.equal(resolveFile(dir, ''), fs.realpathSync(path.join(dir, 'index.html')))
  assert.equal(resolveFile(dir, 'sub/'), fs.realpathSync(path.join(dir, 'sub', 'index.html')))
  for (const bad of ['../package.json', '..%2Fpackage.json', '.secret', 'sub/../.secret', 'link.txt', 'nope.js', '%00', '%E0%A4%A']) {
    assert.equal(resolveFile(dir, bad), null, bad)
  }
})

test('control page, building blocks and site on their paths; nothing else', { skip }, async t => {
  const site = tempSite(t)
  const base = await serve(t, { web: true, site, links: [{ label: 'Dash"<', href: '/dashboard' }] })
  const page = await fetch(`${base}/`)
  assert.equal(page.status, 200)
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'/)
  const html = await page.text()
  assert.match(html, /<iosignal-devices bus-info="off"><\/iosignal-devices>/)
  assert.match(html, /Dash&quot;&lt;/)
  for (const [url, type] of [['/components/iosignal-devices.js', /javascript/], ['/shared/discovery.js', /javascript/],
    ['/types/light.1.json', /json/], ['/lib/io.js', /javascript/], ['/site/', /html/], ['/site/app.js', /javascript/]]) {
    const res = await fetch(base + url)
    assert.equal(res.status, 200, url)
    assert.match(res.headers.get('content-type'), type, url)
    assert.equal(res.headers.get('access-control-allow-origin'), null, url)
  }
  assert.equal((await fetch(`${base}/site`, { redirect: 'manual' })).headers.get('location'), '/site/')
  for (const url of ['/site/.secret', '/site/link.txt', '/components/nope.js', '/site/%2E%2E%2Fsecret']) {
    assert.equal((await fetch(base + url)).status, 404, url)
  }
  // The URL parser resolves encoded dot segments too: this is /package.json, not this handler's.
  assert.equal((await fetch(`${base}/shared/%2E%2E/%2E%2E/package.json`)).status, 599)
  assert.equal((await fetch(`${base}/other`)).status, 599, 'other paths are left to the next handler')
  assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405)
  assert.equal((await fetch(`${base}/site/`, { method: 'HEAD' })).status, 200)
})

test('--cors, --home site, login page, site only', { skip }, async t => {
  const site = tempSite(t)
  const cors = await serve(t, { web: true, cors: true })
  assert.equal((await fetch(`${cors}/components/widgets.js`)).headers.get('access-control-allow-origin'), '*')
  assert.equal((await fetch(`${cors}/site/`)).status, 599, 'no site without --site')
  const home = await serve(t, { web: true, site, home: 'site' })
  assert.equal((await fetch(`${home}/`, { redirect: 'manual' })).headers.get('location'), '/site/')
  const siteOnly = await serve(t, { site })
  assert.equal((await fetch(`${siteOnly}/`)).status, 599, 'no control page without --web')
  assert.equal((await fetch(`${siteOnly}/components/iosignal-devices.js`)).status, 200)
  assert.match(controlPage({ login: true }), /<iosignal-devices bus-info="off" login>/)
  assert.throws(() => createWebHandler({ site: path.join(site, 'missing') }), /not a folder/)
})

test('the building blocks come from iosignal/devices', { skip }, () => {
  for (const file of ['components/iosignal-devices.js', 'shared/discovery.js', 'types/index.json', 'runner/device-runner.js', 'examples/lamp.device.js']) {
    assert.ok(fs.existsSync(path.join(DEVICES, file)), file)
  }
})
