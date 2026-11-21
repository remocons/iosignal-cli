// Smoke test of the default start (no arguments), run inside the image:
//   node smoke-defaults.mjs <server host> <expected device count> <dashboard: on|off>
import { IO, IOCongSocket } from 'iosignal'

const [host = 'localhost', devicesWanted = '6', dashboard = 'on'] = process.argv.slice(2)
const wait = ms => new Promise(r => setTimeout(r, ms))
const ready = (io, name) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`${name}: no ready`)), 5000)
  io.on('error', () => {})
  io.once('ready', () => { clearTimeout(timer); resolve() })
})

try {
  // Pages: control page, the starter site in /data/www, and the dashboard only with a token.
  const pages = [['/', 200, /<iosignal-devices/], ['/site/', 200, /iosignal-devices/], ['/site/robot.html', 200, /robot\.js/],
    ['/dashboard', dashboard === 'on' ? 200 : 404, dashboard === 'on' ? /IOSignal Dashboard/ : /./]]
  for (const [path, status, want] of pages) {
    const res = await fetch(`http://${host}:7777${path}`)
    const text = await res.text()
    if (res.status !== status || !want.test(text)) throw new Error(`GET ${path}: ${res.status}, wanted ${status}`)
  }
  console.log(`ok   pages (/, /site/, /site/robot.html, /dashboard ${dashboard === 'on' ? '200' : '404'})`)

  const board = new IOCongSocket(`cong://${host}:55488`)
  await ready(board, 'cong 55488')
  console.log(`ok   cong 55488 ready (cid ${board.cid})`)
  board.stop()

  // Virtual devices answer #search (another container is a private address: the same home channel).
  const app = new IO(`ws://${host}:7777`)
  const names = new Map()
  app.listen('#notify', (_tag, id) => {
    if (typeof id === 'string' && !names.has(id)) {
      names.set(id, '')
      app.link('smoke', `${id}@$name`, (_t, name) => names.set(id, String(name)))
    }
  })
  await ready(app, 'ws 7777')
  app.signal('#search')
  await wait(2500)
  const found = [...names.values()].filter(Boolean).sort()
  if (found.length !== Number(devicesWanted)) throw new Error(`virtual devices: ${found.length} (${found.join(', ')}), wanted ${devicesWanted}`)
  console.log(`ok   virtual devices: ${found.length}${found.length ? ` (${found.join(', ')})` : ''}`)
  app.stop()
  process.exit(0)
} catch (error) {
  console.error(`FAIL ${error.message}`)
  process.exit(1)
}
