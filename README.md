# IOSignal CLI 
[ [한국어](./README.ko.md) | English ]

IOSignal facilitates real-time communication among web browsers, Node.js applications, and Arduino devices. It also offers secure authentication and encrypted communication. With its built-in signaling protocol, the server can be used without additional programming.

The `iosignal-cli` program simplifies the operation of an IOSignal server and client. It leverages the [iosignal](https://www.npmjs.com/package/iosignal) library and utilizes Redis for authentication database functionality.


## Supported Platforms

Windows, macOS, and Linux.

## Installation

### Linux, macOS, and Shell

```sh
# Global installation.
$ npm install -g iosignal-cli

# If you encounter a permissions error, use sudo.
$ sudo npm install -g iosignal-cli
```

### Windows (with Administrator Permissions)

```sh
# Global installation.
$ npm install -g iosignal-cli
```

## IOSignal Server

- Use the `io-server` command.
- `ios` is a shorthand alias for `io-server`.

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

- Use the `-l` option to specify the port number for WebSocket connections.
- Supports web browser and Node.js client access.

```sh
 % io-server -l 7777
```

### IOSignal Over CongSocket

- Use the `-L` option to specify the port number for CongSocket connections.
- CongSocket is IOSignal's proprietary protocol, designed to be lighter than WebSocket.
- It was developed specifically for low-end devices like Arduino.
- Supports Arduino and Node.js client access.

```sh
 % io-server -L 8888
```

### Simultaneous WebSocket and CongSocket Support

- This allows Arduino and web browsers to communicate with each other.


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

### Viewing Incoming Messages

- To view incoming signal messages on the server, use the `-s` option.
- `ios` is a shorthand alias for `io-server`.

```
% ios -l 7777 -s message 
... 

#1(undefined) [ CID_REQ ] <Buffer c1>
#1(?ayTp) [ SIGNAL ] <Buffer d0 02 68 69 00>
#1(?ayTp) [ PING ] <Buffer cd>

```


## IOSignal Client

- Use the `io-client` command.
- `io` is a shorthand alias for `io-client`.

### Usage

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

### Connection

- To connect to a server, specify the server address and port number using the `-c` option.
- The server address requires one of the following protocols: `ws`, `wss`, or `cong`.
  - `ws://url:port` (WebSocket)
  - For `localhost`, `ws://` can be omitted.
  - `wss://url:port` (WebSocket TLS)
  - `cong://url:port` (CongSocket)

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

- Upon successful client connection, the `cid` (Communication ID) is displayed with a `ready` indication.
- The CID is a unique communication ID issued by the server.
- The CID of an unauthenticated client changes with each connection.
- Authenticated clients use a fixed, predefined CID.
- You can use CIDs for one-to-one communication or CID subscriptions.


### `io-client` CLI Command List

- When connected to the server with the `io-client` CLI program, you can communicate, subscribe, and issue signals using the commands below.
- The CLI program can also communicate with browsers and Arduino devices connected to the server.

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


## Tutorial

### Signaling

- **Multicast**: Publish/subscribe to a channel name.
- **Unicast**: Use a CID (Communication ID).

1. Start the server:
```sh
$ io-server -l 7777

```

2. Start client A:

```sh
$ io -c localhost:7777
Connecting to ws://localhost:7777
ready:  cid: ?c3Nr 

> .subscribe channel_name  
# Subscribe to a channel
```

3. Start client B:
```sh
$ io -c localhost:7777
Connecting to ws://localhost:7777
ready:  cid: ?rr75
> 
# Multicast.
> .signal channel_name some_message   

# Unicast to A.
> .signal ?c3Nr@ direct_message  
# IMPORTANT: Unicast signal tags must include the '@' character (e.g., tag = 'cid' + @).
```

### Authentication

#### Type 1: Authentication Data from File

- For personal use only.
- Raw, plain password strings (not hashed).
- Each device has four values: `deviceId`, `deviceKey`, `deviceCId`, and `level`.
- You can find sample `auth_file.js` and `auth_file.json` in the root folder.
```sh
$ io-server -l 7777 -d auth_file.json
   or
$ io-server -l 7777 -d auth_file.js
```

auth_file.json structure:
- `deviceId` string size limit: 8 characters.
- No passphrase string limit (it will be digested to 32 bytes with SHA256).
- `CID` string size limit: currently 20 characters (can be changed).
- JSON files do not support comments.
```js
[
  ["id","key","cid",0],
  ["did2","did2key","did2-cid",0],
  ["uno3","uno3-key","uno3-cid",1]
]
```

### `auth_file.js`

- Supports comments.

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



#### Type 2: Authentication Data from Redis (or other Database)

- Recommended.
- You can find source code and examples here:
  - `iosignal`: `/src/auth/`
  - `iosignal-cli`: `/test_auth_redis/`

Before running the server, ensure your Redis server is operational and that you have registered your device credentials. A simple credentials enrollment example is included in the source above.

start server with local redis-auth-system
```sh
$ io-server -l 7777 -r   # redis://localhost:6379
```


### Authenticating Clients
1. Start the authentication server.
2. Connect and log in.

```sh
$ io -c localhost:7777
ready:  cid: ?YXDr
> .login uno3 uno3-key
try manual login:  uno3
> >> QUOTA_LEVEL :  1
current quota: {"signalSize":255,"publishCounter":10,"trafficRate":100000}
ready:  cid: uno3-cid
 
- Now the device has a (pre-registered) CID.

```

## Support for Both Web Browsers and Arduino

### Specifying Two Types of Ports

IOSignal uses WebSockets for web browser peer connections. If you want to use an Arduino connection, you must specify the CongSocket port using the `-L` option.

The `-l` option specifies the WebSocket port, and the `-L` option specifies the CongSocket port for Arduino connections.

```sh

$ io-server -l 7777 -L 8888
# -l option for WebSocket port
# -L option for CongSocket port ( Arduino connection)
```

### Local Network IP Address

If you need the server's IP address to access it from your local network, you can check it using the following command:

```sh
$ ioip
192.168.0.72
```


### IOSignal Arduino Library

Search for `IOSignal` in the Arduino library manager and install it, or refer to the [`iosignal-arduino`](https://github.com/remocons/iosignal-arduino) GitHub repository.


## iosignal stack
![IOSignal](./img/iosignal_architecture.png)