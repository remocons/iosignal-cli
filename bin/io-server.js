#!/usr/bin/env node

import { connectRedis, closeRedis } from '../lib/redis.js'
import { port, timeout } from '../lib/cli.js'
import { program } from 'commander'
import { serverHelp } from '../lib/help.js'
import { serverInfo } from './serverInfo.js';
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
  .option('-e, --auth-param <id.key.cid.level>', 'authentication entries: id.key.cid.level, separated by commas')
  .option('-r, --auth-redis', 'authenticate using Redis (REDIS_HOST / REDIS_PORT)')
  .option('-t, --timeout <milliseconds>', 'server heartbeat/check interval (1000..2147483647 ms; default: 50000)', timeout)
  .option('-m, --metric <mode>', 'monitor: 0=off, 1=summary, 2=connections, 3=channels (default: 0)')
  .option('-s, --show-message <none|message>', 'log received messages: none or message (default: none)')
  .option('-f, --file-logger', 'write connection.log, auth.log and attack.log in the working directory')
  .option('-a, --attach-services [list...]', 'built-in services: reply sudo redis (space-separated; none by default)')
  .option('-o, --show-options', 'print initialization options and attached service names')
  .addHelpText('after', serverHelp)
  .showHelpAfterError('Use --help for options and examples.')
  .parse(process.argv)

const options = program.opts()
if (options.listen === undefined && options.listenCongport === undefined) {
  program.error('specify --listen <port> or --listen-congport <port>')
}

// global shared serverOption
if (options.fileLogger) {
  serverOption.fileLogger.connection.use = true;
  serverOption.fileLogger.auth.use = true;
  serverOption.fileLogger.attack.use = true;
}

if (options.showMessage) {
  serverOption.showMessage = options.showMessage
}

if (options.metric) {
  serverOption.showMetric = options.metric
}

if (options.timeout) {
  serverOption.timeout = options.timeout
}

// private port, congPort
let privateServerOptions = { };
if (options.listen !== undefined) {
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
    console.log('private ServerOptions:', privateServerOptions)
    console.log('server serviceNames:', server.serviceNames)
  }

  setTimeout(async ()=>{
    console.log(serverInfo(server))
    if ( server.port === null && server.congPort === null ) {
      await closeRedis(redisClient);
    }
  },1000)
} catch (error) {
  console.error('Error:', error.message);
  await closeRedis(redisClient);
  process.exitCode = 1;
}
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  if (server?.manager) {
    if (typeof server.wss?.close !== 'function') server.wss = null;
    await new Promise(resolve => server.close(resolve));
  }
  await closeRedis(redisClient);
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
