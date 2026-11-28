export const interactiveHelp = `Interactive commands (type after starting io-client):
  help                         Show this command reference
  sub <tag[,tag...]>            Subscribe; aliases: subscribe listen join
  unsub [tag[,tag...]]          Unsubscribe; omit tags to unsubscribe from all
  pub <tag> [args...]           Publish; alias: publish
  sig <tag> [args...]           Send a signal; alias: signal
  sig_bin <tag> <bytes>         Send zero-filled bytes (0..1048576; quota applies)
  call <target> <command> [args...]  Call a service
  sudo <command> [args...]     Call the sudo service (server permission required)
  auth <id> <key>              Set credentials for automatic login
  login <id> <key>             Attempt login with the server's auth challenge
                                Both also accept a single id.key argument
  id / ch / quota            Show connection / subscriptions / quota
  ping                         Ping the server
  pong                        Send protocol pong to server
  echo [text]                  Request an echo (one token)
  iam [name]                   Query or set the connection nickname (one token)
  encNo / encYes / encAuto    Set encryption mode
  encMode                     Show encryption mode
  hide / show                Hide / show received message and CID output
  close                       Close the connection; auto-reconnect may reopen it
  open [url]                  Reconnect; omit URL to reuse it; alias: connect
  quit / exit                Exit the client

Notes:
  Type command names without a leading dot; the old dot-prefixed syntax is rejected.
  listen and join are aliases of subscribe, using the shared output handler.
  Subscriptions are remembered for reconnection; unsub removes them.
  Arguments are whitespace-separated strings; shell quotes/JSON are not parsed.
  hide does not hide status or command responses. Echo/status output needs a TTY.
  open keeps the transport selected at startup; restart to switch WS/TCP.
  For CongSocket open, use a full cong://host:port URL.

Interactive examples:
  sub demo,alerts
  pub demo hello world
  call reply echo hello
  unsub demo
  help`

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
  --auth-param accepts id.key.cid[.role[.quota]] entries separated by commas.
  role: device (default), service or admin (admin may use sudo).
  quota: a profile from --quotas; none (no limits) by default.
  If combined, precedence is --auth-file > --auth-param > --auth-redis.
  Without an authentication option, no authentication provider is configured.
  --id-key and --shared-key enable logins without a key list for local tests:
  every ID logs in as its own CID, with key = ID or with the shared key.
  Anyone who knows the rule can log in under any ID; use a trusted network.
  They cannot be combined with each other or with another auth option.
  --members-only drops signals from anonymous connections.
  Clients log in with io-client -i <id> -k <key>.

Limits:
  Nothing is limited by default. Turn on what your deployment needs:
  -q msgPerSec=100,maxMessageBytes=262144   limits for unauthenticated connections
     (maxMessageBytes, fanout, msgPerSec, bytesPerSec, maxSubscriptions, deliveriesPerSec)
  --quotas profiles.json   named profiles { "basic": { "msgPerSec": 200 } } for the
     quota field of key entries (id.key.cid.device.basic) or -q <name>
  --connection-limits maxPerAddress=200,newPerAddressPerMin=300   per public address
     (also failedPerAddressPerMin, msgPerAddressPerSec, bytesPerAddressPerSec)

Dashboard:
  --dashboard serves a live status page on the WebSocket port (needs -l):
  http://<host>:<port>/dashboard. Access is open by default, meant for a LAN;
  on a server reachable from the Internet use --dashboard-access admin
  (an admin account logs in on the page) or token (IOSIGNAL_DASHBOARD_TOKEN).

Behind a proxy:
  A client's address decides its home channel (# tags), so it must be right.
  --trust-proxy private (default) uses X-Forwarded-For only from loopback or
  private peers, such as nginx or Caddy on the same host or Docker network;
  never ignores it (clients connect directly); <hops> trusts that many proxies.

Redis:
  --auth-redis and the redis service use REDIS_HOST (default: localhost)
  and REDIS_PORT (default: 6379). Connect timeout: 5000 ms; no auto-reconnect.

Examples:
  io-server -l 7777
  io-server -L 8888
  io-server -l 7777 -L 8888 -t 50000
  io-server -l 7777 -q msgPerSec=100,maxMessageBytes=262144 --connection-limits maxPerAddress=200
  io-server -l 7777 -d ./auth_file_sample/auth_file.json
  io-server -l 7777 -e uno.uno-key.uno,admin.admin-key.admin.admin
  io-server -l 7777 -L 8888 --id-key
  io-server -l 7777 -k lab2026 -M
  io-server -l 7777 -r -a reply redis
  io-server -l 7777 -m 5000 -s
  io-server -l 7777 -L 8888 --dashboard
  io-server -l 7777 -d ./auth.json --dashboard --dashboard-access admin
  io-server -l 7777 --trust-proxy never

  Alias: ios. Use io-client -h for client and interactive command help.`
