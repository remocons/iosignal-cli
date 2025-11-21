#!/usr/bin/env node

import { createClient } from 'redis';
import { program } from 'commander'
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
  .usage('[options] (--listen <port> )')
  .option('-l, --listen <port>', 'listen on port (start WebSocket Server)')
  .option('-L, --listen-congport <port>', 'listen on cong port (start CongSocket Server)')
  .option('-d, --auth-file <path>', 'auth data file path')
  .option('-e, --auth-param <id.key.level>', 'auth data from argument: id1.key.cid1.level1,id2.key2.cid2.level2')
  .option('-r, --auth-redis', 'connect to redis. if exist use env REDIS_HOST, REDIS_PORT or localhost:6379')
  .option('-t, --timeout <milliseconds>', 'ping period & timeout')
  .option('-m, --metric <type>', 'show metric <number> 1:traffic, 2:echo')
  .option('-s, --show-message <none|message>', 'show receive message. ')
  .option('-f, --file-logger', 'write log files.')
  .option('-a, --attach-services [list...]', 'one or multiple service module names:  -a service1 service2')
  .option('-o, --show-options', 'show server init options.')
  .parse(process.argv)

const options = program.opts()

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
if (options.listen) {
  privateServerOptions.port = parseInt(options.listen)
}

if (options.listenCongport) {
  privateServerOptions.congPort = parseInt(options.listenCongport)
}

let authManager;
let redisClient;

if (options.authFile) {
  console.log("auth data origin: auth_file")
  let authFilePath = options.authFile;
  authManager = new BohoAuth( new FileKeyProvider(authFilePath) )
} else if (options.authParam) {
  authManager = new BohoAuth( new StringKeyProvider(options.authParam) )
} else if (options.authRedis) {
  console.log("auth data origin: redis")
  // console.log('####### default redis server url: redis://localhost:6379 ' )   
  redisClient = createClient();
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  redisClient.connect();
  authManager = new BohoAuth( new RedisKeyProvider( redisClient))
} else {
  // console.log("No authentication support.")

}


const server = new Server( privateServerOptions , authManager);

if (options.attachServices && options.attachServices.length > 0) {
  let attachServices = options.attachServices
  if (attachServices.includes('reply')){ 
    server.attach('reply', replyService)
  }
  if (attachServices.includes('sudo')){
    server.attach('sudo', sudoService)
  } 
  if (attachServices.includes('redis')){
    if(!redisClient){
      redisClient = createClient();
      redisClient.on('error', (err) => console.log('Redis Client Error', err));
      redisClient.connect();
    }
    server.attach('redis', new RedisService(redisClient))
  } 
  console.log('registed service names', server.serviceNames)
}

if (options.showOptions) {
  console.log('global ServerOptions:', serverOption)
  console.log('private ServerOptions:', privateServerOptions)
  console.log('server serviceNames:', server.serviceNames)
}

setTimeout(()=>{
  console.log(serverInfo(server))
  if ( server.port === null && server.congPort === null ) {
    process.exit();
  }
},1000)