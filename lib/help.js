export const interactiveHelp = `Interactive commands (type after starting io-client):
  .help                         Show this command reference
  .sub <tag[,tag...]>            Subscribe; aliases: .subscribe .listen .join
  .unsub [tag[,tag...]]          Unsubscribe; omit tags to unsubscribe from all
  .pub <tag> [args...]           Publish; alias: .publish
  .sig <tag> [args...]           Send a signal; alias: .signal
  .sig_bin <tag> <bytes>         Send zero-filled bytes (0..1048576; quota applies)
  .call <target> <command> [args...]  Call a service
  .sudo <command> [args...]     Call the sudo service (server permission required)
  .auth <id> <key>              Set credentials for automatic login
  .login <id> <key>             Attempt login with the server's auth challenge
                                Both also accept a single id.key argument
  .id / .ch / .quota            Show connection / subscriptions / quota
  .ping / .pong                 Send protocol ping / pong
  .pping <cid>                  Send a peer ping to a CID
  .echo [text]                  Request an echo (one token)
  .iam [name]                   Query or set the connection nickname (one token)
  .encNo / .encYes / .encAuto    Set encryption mode
  .encMode                     Show encryption mode
  .hide / .show                Hide / show received message and CID output
  .close                       Close the connection; auto-reconnect may reopen it
  .open [url]                  Reconnect; omit URL to reuse it; alias: .connect
  .quit / .exit                Exit the client

Notes:
  .listen and .join are aliases of .subscribe, using the shared output handler.
  Subscriptions are remembered for reconnection; .unsub removes them.
  Arguments are whitespace-separated strings; shell quotes/JSON are not parsed.
  .hide does not hide status or command responses. Echo/status output needs a TTY.
  .open keeps the transport selected at startup; restart to switch WS/TCP.
  For CongSocket .open, use a full cong://host:port URL.

Interactive examples:
  .sub demo,alerts
  .pub demo hello world
  .call reply echo hello
  .unsub demo
  .help`

export const clientHelp = `
Examples:
  io-client
  io-client -c
  io-client -c -j news,alerts
  io-client -c wss://example.com/ws -j news,alerts
  io-client -c cong://localhost:8888
  io-client -i uno -k uno-key
  io-client -a uno.uno-key

Connection:
  Omit -c to connect to ws://localhost:7777.
  Use -c or --connect without a URL for wss://io.iosignal.net/ws.

Authentication:
  Use --id and --key together, or --auth-idKey <id.key>.
  A complete --id/--key pair takes precedence over --auth-idKey.
  Aliases: io, iosignal-cli.

${interactiveHelp}`

export const serverHelp = `
Listening:
  Specify --listen, --listen-congport, or both. No port is enabled by default.
  Port 0 lets the operating system choose an available port.

Authentication:
  --auth-param accepts id.key.cid.level entries separated by commas.
  If combined, precedence is --auth-file > --auth-param > --auth-redis.
  Without an authentication option, no authentication provider is configured.

Redis:
  --auth-redis and the redis service use REDIS_HOST (default: localhost)
  and REDIS_PORT (default: 6379). Connect timeout: 5000 ms; no auto-reconnect.

Examples:
  io-server -l 7777
  io-server -L 8888
  io-server -l 7777 -L 8888 -t 50000
  io-server -l 7777 -d ./auth_file_sample/auth_file.json
  io-server -l 7777 -e uno.uno-key.uno.1
  io-server -l 7777 -r -a reply redis
  io-server -l 7777 -m 2 -s message

  Alias: ios. Use io-client -h for client and interactive command help.`
