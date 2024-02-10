# IOSignal CLI

iosignal supports real-time communication between web browsers, node.js, and arduino. It also provides secure authentication and encrypted communication. The signaling protocol is built-in, so the server can be used without programming.

iosignal-cli program that makes it simple to run a iosignal server and client. It uses the [iosignal](https://www.npmjs.com/package/iosignal)  library and uses Redis for authentication database functionality.

[Kr] iosignal 은 웹브라우저, node.js , arduino 간의 실시간 통신을 지원합니다. 또한 보안 인증과 암호통신 기능도 제공됩니다. 시그널링 프로토콜이 내장되어 있어서 서버는 프로그래밍 없이 사용 가능합니다.

## supports 

Windows, Mac, and Linux.

## install

Linux, Mac and shell

```sh
# global install.
$ npm install -g iosignal-cli

# If you encounter a permissions error, use sudo.
$ sudo npm install -g iosignal-cli
```
windows as admin permission
```sh
# global install.
$ npm install -g iosignal-cli
```

## IOSignal server

- use `io-server` command.
- `ios` is a shortened name for io-server.

```
% io-server -h
Usage: io-server [options] (--listen <port> )

Options:
  -V, --version                      output the version number
  -l, --listen <port>                listen on port (start WebSocket Server)
  -L, --listen-congport <port>       listen on cong port (start CongSocket
                                     Server)
  -d, --auth-file <path>             auth data file path
  -e, --auth-param <id.key.level>    auth data from argument:
                                     id.key.level,id2.key2.level2
  -E, --auth-env                     auth data from shell env BOHO_AUTH
  -r, --auth-redis                   connect to redis. if exist use env
                                     REDIS_HOST, REDIS_PORT or localhost:6379
  -t, --timeout <milliseconds>       ping period & timeout
  -m, --metric <type>                show metric <number> 1:traffic, 2:echo
  -s, --show-message <none|message>  show receive message.
  -f, --file-logger                  write log files.
  -a, --api-list [list...]           one or multiple api names:  -a api_1 api_2
  -o, --show-options                 show server init options.
  -h, --help                         display help for command

```

### IOSignal over WebSocket

- Use the -l option to specify the port number for websocket connections.

- Supports web browser and node.js client access.

```sh
 % io-server -l 7777
```

### IOSignal Over CongSocket

- Use the -L option to specify the port number for CongSocket connections.
- CongSocket is IOSignal's own protocol that is lighter than WebSocket. 
- It was developed specifically for low-end devices like Arduino.
- Supports Arduino and node.js client access.

```sh
 % io-server -L 8888
```

### WebSocket and CongSocket can be supported together.

- This allows the Arduino and web browser to communicate with each other.


```sh
% io-server -l 7777 -L 8888
opening WebSocket Server: 7777
opening CongSocket Server: 8888

   ┌───────────────────────────────────────────┐
   │                                           │
   │   Serving                                 │
   │                                           │
   │   IOSignal Over WebSocket                 │
   │                                           │
   │    Web Browser & Node.js                  │
   │    - Local:    ws://localhost:7777        │
   │    - Network:  ws://192.168.0.72:7777     │
   │                                           │
   │   IOSignal Over CongSocket                │
   │                                           │
   │    Node.js                                │
   │    - Local:    cong://localhost:8888      │
   │    - Network:  cong://192.168.0.72:8888   │
   │                                           │
   │    Arduino                                │
   │    - host: 192.168.0.72                   │
   │    - port: 8888                           │
   │                                           │
   └───────────────────────────────────────────┘



```

## Monitor Server

### Viewing incoming messages

- To view server incoming signal messages, use the -s option.
- `ios` is a shortened name for `io-server`.

```
% ios -l 7777 -s message 
... 

#1(undefined) [ CID_REQ ] <Buffer c1>
#1(?ayTp) [ SIGNAL ] <Buffer d0 02 68 69 00>
#1(?ayTp) [ PING ] <Buffer cd>

```

### Viewing metrics

- `-m 1` : channels, clients, traffic
- `-m 2` : clients
- `-m 3` : channels

```sh

$ ios -l 7777 -m 1
...

monitor metric type: 1
┌─────────┬───────────┬───────────┬──────────┬──────────┬──────────────┐
│ (index) │    rss    │ heapTotal │ heapUsed │ external │ arrayBuffers │
├─────────┼───────────┼───────────┼──────────┼──────────┼──────────────┤
│    0    │ 108232704 │ 57294848  │ 24523112 │ 1389925  │    59260     │
└─────────┴───────────┴───────────┴──────────┴──────────┴──────────────┘
┌─────────┬──────────┬─────────┬──────────┬─────────┬─────────┐
│ (index) │ lastSSID │ remotes │ channels │ txBytes │ rxBytes │
├─────────┼──────────┼─────────┼──────────┼─────────┼─────────┤
│    0    │    2     │    2    │    1     │   57    │   18    │
└─────────┴──────────┴─────────┴──────────┴─────────┴─────────┘


$ ios -l 7777 -m 2
...
monitor metric type: 2
┌─────────┬───────────────┐
│ (index) │    Values     │
├─────────┼───────────────┤
│    0    │ '#1:?9P-i(7)' │
│    1    │ '#2:?zNuW(7)' │
└─────────┴───────────────┘


$ ios -l 7777 -m 3
...
monitor metric type: 3
┌─────────┬───────────────────────┐
│ (index) │        Values         │
├─────────┼───────────────────────┤
│    0    │ 'PRIVATE:#homeButton' │
└─────────┴───────────────────────┘
```

## iosignal client

- use `io-client` command.
- `io` is a shortened name for io-client.

### usage

```
 % io -h
Usage: io [options] (--connect <url> )

Options:
  -V, --version                     output the version number
  -t, --timeout <milliseconds>      ping period & timeout
  -c, --connect <url>               connect to a server
  -i, --id <id>                     userId
  -k, --key <key>                   userKey
  -a, --auth-idKey <idkey>          auth id.key
  -j, --join-channel <channelName>  join to channel
  -h, --help                        display help for command

```

### connection
- To connect to a server, specify the server address and port number with the -c option.

- The server address specifies one of the following protocols:  ws, wss, or cong.
- `ws`://url:port (WebSocket)
- In the case of localhost, ws can be omitted. 
- `wss`://url:port (WebSocket TLS)
- `cong`://url:port ( CongSocket) 

```sh
% io -c ws://localhost:7777
{ connect: 'ws://localhost:7777' }
Connecting to ws://localhost:7777
ready:  cid: ?cybL
> 

```

```sh
% io -c cong://localhost:8888
{ connect: 'cong://localhost:8888' }
Connecting to cong://localhost:8888
ready:  cid: ?yVAQ
> 

```

- On successful client connection, the `cid` is displayed with a `ready` indication.
- The CID is a unique communication ID issued by the server.
- The CID of an unauthenticated client changes with each connection.
- Authenticated clients use a fixed, predefined CID.
- You can use CIDs for one-to-one communication or CID subscriptions.


### io-client cli command list

- When connected to the server with the io-client CLI program, you can communicate, subscribe, and issue signals with the commands below.
- The CLI program can also communicate with browsers and Arduino connected to the server.

```
io-client cli commands: 
 .sig
 .signal .publish .pub is the same as .sig.
 .sub 
 .subscribe is the same as .sub. 
 .listen : subscirbe and print the received messages to the screen.
 .unsub 
 .ping 
 .pong 
 .id 
 .iam 
 .open 
 .connect 
 .close 
 .login 
 .auth 
 .quit 
 .exit
```


## tutorial 

### signaling 

- multi-cast: publish/subscribe channel_name
- uni-cast: use cid(communication id)

1. start server
```sh
$ io-server -l 7777

```

2. start client A.

```sh
$ io -c localhost:7777
Connecting to ws://localhost:7777
ready:  cid: ?c3Nr 

> .subscribe channel_name  
# subscribe some channel
```

3. start client B.
```sh
$ io -c localhost:7777
Connecting to ws://localhost:7777
ready:  cid: ?rr75
> 
# multicast.
> .signal channel_name some_message   

# unicast to A.
> .signal ?c3Nr@ direct_message  
# IMPORTANT. 
# unicast signal tag must include '@' charactor.  tag = 'cid' + @
```

### authentication

#### type1. auth data from file.

- for personal use only
- raw plain password string. (Not Hashed)
- each device have 4 values: `deviceId`, `deviceKey`, `deviceCId`, `level`
- you can find sample auth_file.mjs and auth_file.json in root folder.
```sh
$ io-server -l 7777 -d auth_file.json
   or
$ io-server -l 7777 -d auth_file.mjs
```

auth_file.json structure
- deviceId string size limit: 8 charactors.
- No passphrase string limit. (It will be digested 32bytes with sha256.)
- CID string size limit: current 20 chars. can be changed.
- JSON file does not support comment.
```js
[
  ["id","key","cid",0],
  ["did2","did2key","did2-cid",0],
  ["uno3","uno3-key","uno3-cid",1]
]
```

### auth_file.mjs 
- support comments.

```js
// *.mjs file support comments.
export const authInfo = [
  // device id, key, communication id, level:Number(0~255)
  ["did","passowrd","cid",0],  
  ["device1","device1_key","device1_cid",0],
  ["root","root-key","root-cid",255],  // default admin_root level is 255
  ["uno","uno-key","uno",1]
]
```



#### type2. auth data from Redis(or other DataBase)
- Recommended
- you can find source and examples here.
  - `iosiganl` "/src/auth/"
  - `iosignal-cli` "/test_auth_redis/"

Before running the server, you need to make sure that your Redis server is up and running and that you have registered your device credentials. A simple credentials enrollment example is included in the source above.

start server with local redis-auth-system
```sh
$ io-server -l 7777 -r   # redis://localhost:6379
```


#### auth client
1. start auth server.
2. connect and login

```sh
$ io -c localhost:7777
ready:  cid: ?YXDr
> .login uno3 uno3-key
try manual login:  uno3
> >> QUOTA_LEVEL :  1
current quota: {"signalSize":255,"publishCounter":10,"trafficRate":100000}
ready:  cid: uno3-cid
 
# now device have (pre-registered) CID.

```

## Support for both web browsers and Arduino
### Specifying two types of ports
IOSignal uses websockets for web browser peer connections. If you want to use an Arduino connection, you must specify the use of the CongSocket port using the -L option.

The -l option specifies the Websocket port, and the -L option specifies the CongSocket port for the Arduino.

```sh

$ io-server -l 7777 -L 8888
# -l option for WebSocket port
# -L option for CongSocket port ( Arduino connection)
```

### IOSignal Arduino Library

Search for `IOSignal` in the Arduino library manager and install it, or see the [`iosignal-arduino`](https://github.com/remocons/iosignal-arduino) github repository


## iosignal stack
![IOSignal](./img/iosignal_stack.png)