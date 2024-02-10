#!/usr/bin/env node

import { createClient } from 'redis';
import { program } from 'commander'
import { version } from './getVersion.js'
import { serverInfo } from './serverInfo.js';
import {
  Server, serverOption, Auth_File, Auth_Env, Auth_Redis,
  api_reply, api_sudo, RedisAPI
} from 'iosignal'



program
  .version(version)
  .usage('[options] (--listen <port> )')
  .option('-l, --listen <port>', 'listen on port (start WebSocket Server)')
  .option('-L, --listen-congport <port>', 'listen on cong port (start CongSocket Server)')
  .option('-d, --auth-file <path>', 'auth data file path')
  .option('-e, --auth-param <id.key.level>', 'auth data from argument: id.key.level,id2.key2.level2')
  .option('-E, --auth-env', 'auth data from shell env BOHO_AUTH')
  .option('-r, --auth-redis', 'connect to redis. if exist use env REDIS_HOST, REDIS_PORT or localhost:6379')
  .option('-t, --timeout <milliseconds>', 'ping period & timeout')
  .option('-m, --metric <type>', 'show metric <number> 1:traffic, 2:echo')
  .option('-s, --show-message <none|message>', 'show receive message. ')
  .option('-f, --file-logger', 'write log files.')
  .option('-a, --api-list [list...]', 'one or multiple api names:  -a api_1 api_2 ')
  .option('-o, --show-options', 'show server init options.')
  .parse(process.argv)

const options = program.opts()

if (options.fileLogger) {
  serverOption.fileLogger.connection.use = true;
  serverOption.fileLogger.auth.use = true;
  serverOption.fileLogger.attack.use = true;
}

if (options.listen) {
  serverOption.port = parseInt(options.listen)
}

if (options.listenCongport) {
  serverOption.congPort = parseInt(options.listenCongport)
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


let authManager;
let redisClient;

if (options.authFile) {
  console.log("auth data origin: auth_file")
  let authFilePath = options.authFile;
  authManager = new Auth_File(authFilePath)
} else if (options.authParam) {
  authManager = new Auth_Env(options.authParam)
} else if (options.authEnv) {
  authManager = new Auth_Env()
} else if (options.authRedis) {
  console.log("auth data origin: redis")
  // console.log('####### default redis server url: redis://localhost:6379 ' )   
  redisClient = createClient();
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  redisClient.connect();
  authManager = new Auth_Redis(redisClient)
} else {
  // console.log("No authentication support.")

}


const server = new Server(serverOption, authManager)

if (options.apiList && options.apiList.length > 0) {
  let apiList = options.apiList
  console.log('api list', apiList)
  if (apiList.includes('reply')) server.api('reply', api_reply)
  if (apiList.includes('sudo')) server.api('sudo', api_sudo)
  if (apiList.includes('redis')) server.api('redis', new RedisAPI(redisClient))

}

if (options.showOptions) {
  console.log('ServerOptions:', serverOption)
  console.log('server api list', server.apiNames)
}

console.log( serverInfo( serverOption.port , serverOption.congPort ))