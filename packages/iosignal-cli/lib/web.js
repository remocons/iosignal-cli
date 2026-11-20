// The web pages of io-server, on its WebSocket port:
//   /               the device control page (--web): <iosignal-devices> from iosignal/devices
//   /site/          the user's own pages (--site <dir>)
//   /components/, /shared/, /types/, /lib/io.js   what both are built from (with --web or --site)
// The files come from the iosignal package (iosignal/devices). IOSignal Desktop serves the same paths, so a
// page made for one works on the other.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const IO_BUNDLE = require.resolve('iosignal/io')

/** The devices folder of the installed iosignal (components/, shared/, types/, runner/, examples/), or null. */
export const DEVICES = (() => {
  try { return path.dirname(path.dirname(require.resolve('iosignal/devices'))) } catch { return null }
})()
export const DEVICES_MISSING = 'needs iosignal with device rules (iosignal/devices, after 9.22.0)'

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.map': 'application/json',
  '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm',
}
const BASE_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }
// The control page loads only this server's files; components draw with inline styles and blob: pictures.
const PAGE_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; img-src 'self' data: blob:"

const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** The device control page. */
export function controlPage({ login = false, links = [] } = {}) {
  const nav = [{ label: '장치', href: '/', current: true }, ...links]
    .map(l => `<a href="${esc(l.href)}"${l.current ? ' aria-current="page"' : ''}>${esc(l.label)}</a>`).join('')
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>IOSignal 장치</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; background: light-dark(#f4f6f8, #12151a); color: light-dark(#1a1f27, #e8ebef);
    font: 15px/1.5 system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
  header { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; padding: 12px 16px;
    border-bottom: 1px solid light-dark(#dde3ef, #263050); }
  h1 { margin: 0; font-size: 17px; }
  nav { display: flex; gap: 4px; }
  nav a { padding: 4px 10px; border-radius: 7px; color: inherit; text-decoration: none; font-size: 14px; }
  nav a[aria-current] { background: light-dark(#e3e8f4, #1d2640); font-weight: 600; }
  main { max-width: 1100px; margin: 0 auto; padding: 18px 16px 40px; }
</style>
<script type="module" src="/components/iosignal-devices.js"></script>
</head>
<body>
<header><h1>IOSignal</h1><nav aria-label="페이지">${nav}</nav></header>
<main><iosignal-devices bus-info="off"${login ? ' login' : ''}></iosignal-devices></main>
</body>
</html>
`
}

/**
 * Finds the file for a request path under a folder, or null: no '..', no hidden names, no symbolic link
 * that leads outside, a folder gives its index.html.
 */
export function resolveFile(root, relative) {
  let decoded
  try { decoded = decodeURIComponent(relative) } catch { return null }
  if (decoded.includes('\0') || decoded.split('/').some(part => part.startsWith('.'))) return null
  const base = fs.realpathSync(root)
  let file = path.resolve(base, '.' + path.sep + decoded)
  if (file !== base && !file.startsWith(base + path.sep)) return null
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    const real = fs.realpathSync(file)
    if (real !== base && !real.startsWith(base + path.sep)) return null
    return fs.statSync(real).isFile() ? real : null
  } catch { return null }
}

function sendFile(req, res, file, extra = {}) {
  res.writeHead(200, {
    ...BASE_HEADERS, 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache', ...extra,
  })
  if (req.method === 'HEAD') return res.end()
  fs.createReadStream(file).on('error', () => res.destroy()).pipe(res)
}

/**
 * @param {object} options
 * @param {boolean} [options.web] serve the device control page at /
 * @param {boolean} [options.login] the control page asks for an ID and key (members-only server)
 * @param {{ label: string, href: string }[]} [options.links] more pages in the control page's header
 * @param {string|null} [options.site] folder served at /site/
 * @param {'panel'|'site'} [options.home] what / shows: the control page, or a redirect to /site/
 * @param {boolean} [options.cors] let pages on other sites load /components/, /shared/, /types/, /lib/io.js
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => boolean}
 */
export function createWebHandler({ web = false, login = false, links = [], site = null, home = 'panel', cors = false } = {}) {
  if (!DEVICES) throw new Error(`--web and --site ${DEVICES_MISSING}`)
  if (site && !fs.statSync(site, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`--site: ${site} is not a folder`)
  const shared = cors ? { 'Access-Control-Allow-Origin': '*' } : {}
  const mounts = [
    ['/components/', path.join(DEVICES, 'components')],
    ['/shared/', path.join(DEVICES, 'shared')],
    ['/types/', path.join(DEVICES, 'types')],
  ]
  const page = web ? controlPage({ login, links }) : null
  return function handle(req, res) {
    let pathname
    try { pathname = new URL(req.url || '/', 'http://localhost').pathname } catch { return false }
    const known = pathname === '/' || pathname === '/lib/io.js' || pathname === '/site' ||
      (site && pathname.startsWith('/site/')) || mounts.some(([prefix]) => pathname.startsWith(prefix))
    if (!known) return false
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { ...BASE_HEADERS, Allow: 'GET, HEAD' })
      res.end()
      return true
    }
    if (pathname === '/') {
      if (home === 'site' && site) { res.writeHead(302, { Location: '/site/' }); res.end(); return true }
      if (!page) return false
      res.writeHead(200, { ...BASE_HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'Content-Security-Policy': PAGE_CSP })
      res.end(req.method === 'HEAD' ? undefined : page)
      return true
    }
    if (pathname === '/site') {
      if (!site) return false
      res.writeHead(301, { Location: '/site/' })
      res.end()
      return true
    }
    if (pathname === '/lib/io.js') { sendFile(req, res, IO_BUNDLE, shared); return true }
    if (site && pathname.startsWith('/site/')) return serve(req, res, site, pathname.slice('/site/'.length), {})
    for (const [prefix, root] of mounts) {
      if (pathname.startsWith(prefix)) return serve(req, res, root, pathname.slice(prefix.length), shared)
    }
    return false
  }
}

function serve(req, res, root, relative, extra) {
  const file = resolveFile(root, relative)
  if (!file) {
    res.writeHead(404, { ...BASE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
    return true
  }
  sendFile(req, res, file, extra)
  return true
}
