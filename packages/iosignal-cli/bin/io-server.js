#!/usr/bin/env node

import { connectRedis, closeRedis } from '../lib/redis.js'
import { port, heartbeatInterval, logStats, trustProxy, dashboardPath, dashboardAccess } from '../lib/cli.js'
import { program, InvalidArgumentError } from 'commander'
import { serverHelp } from '../lib/help.js'
import { serverInfo } from './serverInfo.js';
import { createServer as createHttpServer } from 'node:http'
import { createWebHandler, DEVICES, DEVICES_MISSING } from '../lib/web.js'
import { createDevices, deviceFiles } from '../lib/devices.js'
import {
  Server, serverOption, replyService, sudoService, RedisService, version as iosignal_version,
  BohoAuth, FileKeyProvider, StringKeyProvider, RedisKeyProvider
} from 'iosignal'

import pkg from '../package.json' with { type: 'json' };
const cli_version = pkg.version;
const version = `CLI ${cli_version} IOSignal ${iosignal_version}`


program
  .version(version)
  .description('Run an IOSignal WebSocket and/or CongSocket (TCP) server.')
  .usage('[options] (-l <port> | -L <port> | both)')
  .option('-l, --listen <port>', 'WebSocket port (0..65535; 0 = automatically assigned)', port)
  .option('-L, --listen-congport <port>', 'CongSocket TCP port (0..65535; 0 = automatically assigned)', port)
  .option('-d, --auth-file <path>', 'authentication data file (.json or .js)')
  .option('-e, --auth-param <id.key.cid[.role[.quota]]>', 'authentication entries, separated by commas')
  .option('-r, --auth-redis', 'authenticate using Redis (REDIS_HOST / REDIS_PORT)')
  .option('-i, --id-key', 'local test login without a key list: any ID whose key equals the ID (CID = ID)')
  .option('-k, --shared-key <key>', 'local test login without a key list: any ID with this shared key (CID = ID)')
  .option('-M, --members-only', 'drop signals from connections that are not authenticated')
  .option('-t, --heartbeat-interval <milliseconds>', 'liveness check interval (1000..2147483647 ms; default: 50000)', heartbeatInterval)
  .option('-m, --log-stats <milliseconds>', 'print a stats summary every N ms (0 = off, or 1000..2147483647)', logStats)
  .option('-s, --log-messages', 'log each received message: type and tag, never the payload')
  .option('-q, --anonymous-quota <profile>', 'quota profile of unauthenticated connections: anonymous (default), basic, pro, unlimited')
  .option('-f, --file-logger', 'write connection.log, auth.log and attack.log in the working directory')
  .option('-a, --attach-services [list...]', 'built-in services: reply sudo redis (space-separated; none by default)')
  .option('--dashboard [path]', 'serve the live status page on the WebSocket port (default path: /dashboard)', dashboardPath)
  .option('--dashboard-access <mode>', 'who may view the dashboard: open (default), admin, token (IOSIGNAL_DASHBOARD_TOKEN) or token:<value>', value => dashboardAccess(value))
  .option('--trust-proxy <mode>', 'use X-Forwarded-For from: private peers (default), always, never, or <hops>', trustProxy)
  .option('-w, --web', 'serve the device control page at / on the WebSocket port')
  .option('--web-access <mode>', 'home (default: devices in the home channel) or members (the page asks for an ID and key; needs -M)', webAccess)
  .option('--site <folder>', 'serve your own pages from this folder at /site/')
  .option('--home <page>', 'what / shows: panel (default, with --web) or site', homePage)
  .option('--cors', 'let pages on other sites load /components/, /shared/, /types/ and /lib/io.js')
  .option('--devices <path...>', 'run virtual devices: *.device.js / *.device.json files or folders of them')
  .option('--no-devices-watch', 'do not restart devices when their files change (watched by default)')
  .option('-o, --show-options', 'print initialization options and attached service names')
  .addHelpText('after', serverHelp)
  .showHelpAfterError('Use --help for options and examples.')
  .parse(process.argv)

function webAccess(value) {
  if (value !== 'home' && value !== 'members') throw new InvalidArgumentError('use home or members')
  return value
}
function homePage(value) {
  if (value !== 'panel' && value !== 'site') throw new InvalidArgumentError('use panel or site')
  return value
}

const options = program.opts()
if (options.listen === undefined && options.listenCongport === undefined) {
  program.error('specify --listen <port> or --listen-congport <port>')
}
const authOptions = ['authFile', 'authParam', 'authRedis', 'idKey', 'sharedKey'].filter(name => options[name] !== undefined)
if ((options.idKey || options.sharedKey !== undefined) && authOptions.length > 1) {
  program.error('--id-key and --shared-key cannot be combined with each other or with another authentication option')
}
if (options.sharedKey === '') program.error('--shared-key needs a non-empty key')
if (options.dashboardAccess !== undefined && options.dashboard === undefined) program.error('--dashboard-access needs --dashboard')
if (options.dashboard !== undefined && options.listen === undefined) program.error('--dashboard needs --listen <port>: it is served on the WebSocket port')
const pages = options.web || options.site !== undefined
if (pages && options.listen === undefined) program.error('--web and --site need --listen <port>: they are served on the WebSocket port')
if (options.webAccess !== undefined && !options.web) program.error('--web-access needs --web')
if (options.webAccess === 'members' && !options.membersOnly) {
  program.error('--web-access members needs --members-only (-M): the server, not the page, keeps anonymous connections out; devices then log in too')
}
if (options.home === 'site' && options.site === undefined) program.error('--home site needs --site <folder>')
if (options.cors && !pages) program.error('--cors needs --web or --site')
if ((pages || options.devices) && !DEVICES) program.error(`--web, --site and --devices ${DEVICES_MISSING}`)
let devicePaths = []
if (options.devices) {
  try { devicePaths = deviceFiles(options.devices) } catch (error) { program.error(`--devices: ${error.message}`) }
  if (!devicePaths.length) console.warn('--devices: no *.device.js or *.device.json files found (yet)')
}
// iosignal with server.handle() also has dashboard links and panels (the release after 9.22.0).
const newDashboard = typeof Server.prototype.handle === 'function'

// global shared serverOption
if (options.fileLogger) {
  serverOption.fileLogger.connection.use = true;
  serverOption.fileLogger.auth.use = true;
  serverOption.fileLogger.attack.use = true;
}

// settings of this server (see iosignal Server options)
let privateServerOptions = { };
if (options.heartbeatInterval !== undefined) privateServerOptions.heartbeatInterval = options.heartbeatInterval
if (options.logStats !== undefined) privateServerOptions.logStats = options.logStats
if (options.logMessages) privateServerOptions.logMessages = true
if (options.anonymousQuota !== undefined) privateServerOptions.anonymousQuota = options.anonymousQuota
let authLabel = null;
if (options.idKey) {
  privateServerOptions.localAuth = 'idKey'
  authLabel = 'local test: key = ID'
} else if (options.sharedKey !== undefined) {
  privateServerOptions.localAuth = { mode: 'sharedKey', key: options.sharedKey }
  authLabel = 'local test: shared key'
}
if (options.membersOnly) {
  privateServerOptions.membersOnly = true
}
if (options.trustProxy !== undefined) privateServerOptions.trustProxy = options.trustProxy
let dashboardLabel = null;
if (options.dashboard !== undefined) {
  const access = options.dashboardAccess ?? 'open'
  privateServerOptions.dashboard = { access, ...(options.dashboard === true ? {} : { path: options.dashboard }) }
  if (newDashboard && pages) {
    privateServerOptions.dashboard.links = [
      ...(options.web ? [{ label: '장치', href: '/' }] : []), ...(options.site !== undefined ? [{ label: '사이트', href: '/site/' }] : []),
    ]
    if (options.web) privateServerOptions.dashboard.cidHref = '/#{cid}'
  }
  dashboardLabel = access === 'open' ? 'open (anyone who can reach this port)'
    : access.token ? 'token' : 'admin login'
}
let http = null;
let web = null;
if (pages) {
  // Pages share the WebSocket port: this HTTP server answers them, and the IOSignal server its upgrades,
  // health check and dashboard.
  const dashboardHref = options.dashboard === undefined ? null : (options.dashboard === true ? '/dashboard' : options.dashboard)
  try {
    web = createWebHandler({
      web: Boolean(options.web), login: options.webAccess === 'members', site: options.site ?? null,
      home: options.home ?? 'panel', cors: Boolean(options.cors),
      links: [...(options.site !== undefined ? [{ label: '사이트', href: '/site/' }] : []), ...(dashboardHref ? [{ label: '대시보드', href: dashboardHref }] : [])],
    })
  } catch (error) { program.error(error.message) }
  http = createHttpServer((req, res) => {
    if (server?.handle ? server.handle(req, res) : server?.dashboard?.handle(req, res)) return
    if (web(req, res)) return
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  })
  privateServerOptions.httpServer = http
} else if (options.listen !== undefined) {
  privateServerOptions.port = parseInt(options.listen)
}

if (options.listenCongport !== undefined) {
  privateServerOptions.congPort = parseInt(options.listenCongport)
}

let authManager;
let redisClient;
let server;
try {

  if (options.authFile) {
    console.log("auth data origin: auth_file")
    let authFilePath = options.authFile;
    authManager = new BohoAuth( new FileKeyProvider(authFilePath) )
  } else if (options.authParam) {
    authManager = new BohoAuth( new StringKeyProvider(options.authParam) )
  } else if (options.authRedis) {
    console.log("auth data origin: redis")
    // console.log('####### default redis server url: redis://localhost:6379 ' )
    redisClient = await connectRedis();
    authManager = new BohoAuth( new RedisKeyProvider( redisClient))
  } else {
    // console.log("No authentication support.")

  }


  if (options.attachServices?.includes('redis') && !redisClient) redisClient = await connectRedis();
  server = new Server( privateServerOptions , authManager);
  // A port that cannot be opened (in use, no permission) ends the program with a plain message.
  server.on('error', async error => {
    console.error(`Error: ${error.code === 'EADDRINUSE' ? `port ${error.port ?? ''} is already in use` : error.message}`)
    process.exitCode = 1
    await devices?.close()
    await closeRedis(redisClient)
    process.exit()
  })
  if (http) http.listen(parseInt(options.listen))

  if (options.attachServices && options.attachServices.length > 0) {
    let attachServices = options.attachServices
    if (attachServices.includes('reply')){
      server.attach('reply', replyService)
    }
    if (attachServices.includes('sudo')){
      server.attach('sudo', sudoService)
    }
    if (attachServices.includes('redis')){
      server.attach('redis', new RedisService(redisClient))
    }
    console.log('registed service names', server.serviceNames)
  }

  if (options.showOptions) {
    console.log('global ServerOptions:', serverOption)
    const shown = { ...privateServerOptions }
    if (shown.localAuth?.key) shown.localAuth = { ...shown.localAuth, key: '(hidden)' }
    if (shown.dashboard?.access?.token) shown.dashboard = { ...shown.dashboard, access: { token: '(hidden)' } }
    console.log('private ServerOptions:', shown)
    console.log('server serviceNames:', server.serviceNames)
  }

  if (options.devices) server.once('ready', startDevices)

  setTimeout(async ()=>{
    console.log(serverInfo(server, authLabel && (options.membersOnly ? `${authLabel}, members only` : authLabel), dashboardLabel,
      { web: Boolean(options.web), site: options.site ?? null, devices: options.devices ? devicePaths.length : null }))
    if (server.dashboard && options.dashboardAccess?.login && !authManager && !privateServerOptions.localAuth) {
      console.warn('dashboard: admin access needs an authentication option (-d, -e, -r); nobody can log in now')
    }
    if ( server.port === null && server.congPort === null ) {
      await closeRedis(redisClient);
    }
  },1000)
} catch (error) {
  console.error('Error:', error.message);
  await closeRedis(redisClient);
  process.exitCode = 1;
}

let devices = null;
// Virtual devices connect to this server over loopback, so they are in the LAN home channel.
function startDevices() {
  const url = options.listen !== undefined ? `ws://127.0.0.1:${server.port}` : `cong://127.0.0.1:${server.congPort}`
  devices = createDevices({ targets: options.devices, url, watch: options.devicesWatch !== false })
  if (options.membersOnly) console.warn('devices: with --members-only, a device needs auth (id.key) in its file to be seen')
  server.dashboard?.panel?.('devices', {
    title: '가상 장치', columns: ['파일', '상태', 'CID', '재시작', '오류'],
    rows: () => devices.list().map(d => [d.name, d.state, d.cid, d.restarts, d.error]),
  })
}

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await devices?.close();
  if (server?.manager) {
    if (typeof server.wss?.close !== 'function') server.wss = null;
    await new Promise(resolve => server.close(resolve));
  }
  if (http) {
    http.closeAllConnections?.();
    await new Promise(resolve => http.close(() => resolve()));
  }
  await closeRedis(redisClient);
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
