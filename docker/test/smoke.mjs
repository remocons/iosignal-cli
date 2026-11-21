// Smoke test client, run inside the image: node smoke.mjs <server host>
// Checks an anonymous WebSocket call, an authenticated WebSocket login and a CongSocket call.
import { IO, IOCongSocket } from 'iosignal'

const host = process.argv[2] || 'localhost'

function check(name, io, event, run) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { io.stop(); reject(new Error(`${name}: timeout`)) }, 5000)
    io.on('error', () => {})
    io.on(event, async () => {
      try {
        const detail = await run(io)
        console.log(`ok   ${name}${detail ? ` (${detail})` : ''}`)
        resolve()
      } catch (error) {
        reject(new Error(`${name}: ${error.message}`))
      } finally {
        clearTimeout(timer)
        io.stop()
      }
    })
  })
}

const echo = async io => {
  const response = await io.call('reply', 'echo', 'hello')
  if (String(response.body) !== 'hello') throw new Error(`unexpected echo ${response.body}`)
  return 'echo'
}

try {
  await check('ws anonymous call', new IO(`ws://${host}:7777`), 'ready', echo)

  const authed = new IO(`ws://${host}:7777`)
  authed.auth('smoke', 'smoke-key')
  await check('ws login', authed, 'ready', async io => {
    if (io.cid !== 'smoke') throw new Error(`expected cid smoke, got ${io.cid}`)
    return `cid ${io.cid}`
  })

  await check('cong anonymous call', new IOCongSocket(`cong://${host}:55488`), 'ready', echo)

  // Web pages on the WebSocket port.
  for (const [path, want] of [['/healthz', /"status":"ok"/], ['/', /<iosignal-devices/], ['/components/iosignal-devices.js', /customElements/],
    ['/types/light.1.json', /"schema"/], ['/dashboard', /IOSignal Dashboard/]]) {
    const res = await fetch(`http://${host}:7777${path}`)
    if (!res.ok || !want.test(await res.text())) throw new Error(`GET ${path}: ${res.status}`)
  }
  console.log('ok   web pages (/healthz, /, /components, /types, /dashboard)')

  // The virtual device answers a search. The client is on another container (another private address),
  // which is the same home channel as the device on loopback: both are private.
  const app = new IO(`ws://${host}:7777`)
  app.on('error', () => {})
  const found = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('virtual device answers #search: no answer')), 5000)
    app.listen('#notify', (_tag, id) => app.subscribe(`${id}@$name`))
    app.on('message', (tag, name) => {
      if (tag.endsWith('@$name') && String(name).startsWith('거실 조명')) { clearTimeout(timer); resolve(`${tag} ${name}`) }
    })
  })
  app.on('ready', () => app.signal('#search'))
  console.log(`ok   virtual device answers #search (${await found})`)
  app.stop()
  process.exit(0)
} catch (error) {
  console.error(`FAIL ${error.message}`)
  process.exit(1)
}
