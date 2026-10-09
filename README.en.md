# IOSignal CLI

[한국어](README.md) | [English](README.en.md)

The CLI package version is **7.2.0**, and the repository uses IOSignal **7.2.0**. The CLI includes server and peer ping handling and improved interactive logs.

iosignal-cli runs an IOSignal server or an interactive client.

## Installation

Requires Node.js 22.16.0 or later.

```sh
npm install -g iosignal-cli
```

For development from this repository:

```sh
npm ci
npm test
node bin/io-server.js --help
node bin/io-client.js --help
```

## Running a server and client

```sh
io-server -l 7777                     # WebSocket server
io-server -L 8888                     # CongSocket (TCP) server
io-server -l 7777 -L 8888              # Enable both transports
io-client                            # Connect to ws://localhost:7777
io-client -c                         # Connect to wss://io.iosignal.net/ws
io-client -c ws://localhost:7777
io-client -c cong://localhost:8888
```

`ios` is an alias for `io-server`; `io` and `iosignal-cli` are aliases for `io-client`.
`ioip` prints local IPv4 addresses, and `io-keygen` generates candidate authentication IDs and keys.
Ports must be integers from 0 to 65535; 0 lets the operating system select a port.

The server's `--timeout` sets the heartbeat and connection check interval in milliseconds: 1000–2147483647, default 50000.
Specify at least one of `-l` or `-L` for the server. Without `-c`, the client connects to `ws://localhost:7777`.
Using `-c` or `--connect` without an address connects to the official server at `wss://io.iosignal.net/ws`.
You can combine this with other options, for example `io-client -c -j demo`.

## Help and server output options

```sh
io-client -h                    # Startup options and all interactive commands
io-server -h                    # Server options and examples
io-client -V                    # CLI and IOSignal versions
io-server -l 7777 -m 2 -s message
```

Type `help` while the client is running. Command names have no leading dot (`.`).
The old `.help`, `.sub`, and `.pub` syntax is unsupported; use `help`, `sub`, and `pub`. Command names are case-sensitive.
`-h` is a startup option used in the shell; `help` is an interactive command.

| Server option | Description |
| --- | --- |
| `-m, --metric <mode>` | 0: off (default), 1: summary, 2: connections, 3: channels |
| `-s, --show-message <mode>` | `none` (default) or `message`: log received messages |
| `-f, --file-logger` | Write `connection.log`, `auth.log`, and `attack.log` in the current working directory |
| `-a, --attach-services [list...]` | Space-separated services: `reply`, `sudo`, `redis`; none by default |
| `-o, --show-options` | Print initial settings and registered service names |

Register built-in services when starting the server. For example, connect a client to this server and enter `call reply echo hello`:

```sh
io-server -l 7777 --attach-services reply
```

## Authentication

```sh
io-server -l 7777 --auth-file ./auth_file_sample/auth_file.json
io-client -i uno -k uno-key
```

See the [JSON example](auth_file_sample/auth_file.json) and [JavaScript example](auth_file_sample/auth_file.js) for authentication data formats.
A JSON file contains a list of `[id, key, cid, level]` arrays. A JavaScript file provides the same list as the named export `authInfo`.
Example paths are relative to the cloned repository. After a global installation, specify the path to your own authentication file.
Command-line entries use `id.key.cid.level`; separate multiple entries with commas.

```sh
io-server -l 7777 --auth-param 'uno.uno-key.uno.1,admin.admin-key.admin.255'
io-client --auth-idKey uno.uno-key
```

Use both `-i` and `-k`, or use `-a id.key`. A complete `-i`/`-k` pair takes priority when both forms are supplied.
When multiple server authentication options are supplied, only one is selected in this order: `--auth-file` → `--auth-param` → `--auth-redis`.
Without authentication options, no authentication provider is configured.

The CLI does not print authentication keys supplied through startup options.
Command-line arguments may appear in shell history or process listings, so an authentication file is recommended for server credentials.

## Subscribing and publishing

Start two clients and subscribe in the first:

```text
sub demo
```

Publish from the second:

```text
pub demo hello world
```

Use `io-client -j demo` or `io-client -j demo,alerts` to subscribe on startup.
`listen` and `join` are aliases for `subscribe`; received messages use the shared output handler.
These commands do not register a custom handler like the SDK's `io.listen(tag, handler)`.
Subscriptions are restored after reconnection and removed with `unsub`.
Interactive arguments are separated by whitespace; shell-style quoting is not interpreted.

| Command | Action |
| --- | --- |
| `help` | Show all interactive commands and usage notes |
| `sub <tag>` / `subscribe` / `listen` / `join` | Subscribe; separate multiple tags with commas |
| `unsub [tag]` | Unsubscribe from the specified tags, or all tags if omitted |
| `pub <tag> [args...]` / `publish` | Publish a message |
| `sig <tag> [args...]` / `signal` | Send a signal |
| `sig_bin <tag> <bytes>` | Send zero-filled binary data, 0–1048576 bytes; server quotas also apply |
| `call <target> <command> [args...]` | Call a service |
| `sudo <command> [args...]` | Call the sudo service; server permission required |
| `auth <id> <key>` / `login <id> <key>` | Configure automatic login / attempt login using the server's authentication challenge; a single `id.key` argument is also accepted |
| `hide` / `show` | Hide / show received channel and direct messages; control and status messages remain visible |
| `id` / `ch` / `quota` | Show the current connection, subscriptions, or quota |
| `ping [cid]` / `pong` / `pping <cid>` | Ping the server without a CID, or a peer with a CID; `pping` is an alias |
| `echo [text]` / `iam [name]` | Request an echo / query or set a nickname; text and name each use one token |
| `encNo` / `encYes` / `encAuto` / `encMode` | Change / inspect the encryption mode |
| `close` / `open [url]` / `connect [url]` | Close / reopen the connection; automatic reconnection may occur after `close` |
| `quit` / `exit` | Exit |

`open` keeps the transport selected at startup. Restart the client to switch between WS and TCP.
Stop the server with `Ctrl+C`. Stop the client with `exit`, `quit`, or `Ctrl+C`.
`exit` is a client command and cannot be used in the server.
For CongSocket reconnection, enter the full `cong://host:port` URL.
`hide` does not hide status or command responses. Echo and general status output are shown only in a TTY terminal.

Objects, binary data, and all payload arguments are displayed. Invalid interactive input prints an error and the CLI keeps running.

## Redis authentication and services

Requires a running Redis server. The default address is `localhost:6379`; environment variables can override it.

```sh
REDIS_HOST=127.0.0.1 REDIS_PORT=6379 io-server -l 7777 --auth-redis
io-server -l 7777 --auth-redis --attach-services reply redis
```

The server starts after Redis connects. A connection failure reports an error and exits with code 1.
The connection timeout is 5 seconds; automatic reconnection is disabled. Redis connections close when the server stops.

The [Redis authentication examples](test_auth_redis/) use the same environment variables.

```sh
node test_auth_redis/redis_addAdmin.js admin admin-key admin
node test_auth_redis/redis_addMultipleDevice.js uno 1 10
node test_auth_redis/redis_add_get_device.js
node test_auth_redis/server-auth-redis.js
```

The first three scripts write sample authentication data to Redis. The multiple-device example generates keys identical to the IDs.
The administrator and multiple-device examples also call Redis `SAVE`. The server example uses WebSocket port 7777 by default.
One-off examples close Redis connections when finished and exit with code 1 on error.

## Tests

`npm test` checks option validation and real local WebSocket communication.
Set `IOSIGNAL_TEST_REDIS_SERVER` to a Redis executable to start a temporary Redis instance and test authentication examples, authentication-key output, connection failures, and clean shutdown.
Existing Redis data is not used.

```sh
IOSIGNAL_TEST_REDIS_SERVER=redis-server npm test
```

## Interactive logs and ping

The interactive prompt uses `›` instead of the CID. Responses are indented, and received messages, connection status, and errors are distinguished.
Timestamps are hidden by default; enable them with `--timestamps`.
Set `NO_COLOR=1` to disable colors. Piped output has no decorations or timestamps.

`ping` requests a server response; `ping <cid>` requests a peer response. `pping <cid>` is an alias.
Replies print `pong` or `pong (<cid>)`; unanswered requests time out after 3 seconds. Disconnecting cancels pending requests.
Peer requests use a direct `@ping` signal with one TEXT argument containing the sender CID. The responder sends `@pong` back with its own CID.
CLI clients respond automatically, including when `hide` is enabled.
The Node CLI handles both legacy WebSocket control PONG frames and IOSignal PONG packets.
The browser CLI's default ping requires an IOSignal PONG packet from the server.
