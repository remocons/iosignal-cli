#!/usr/bin/env node

import { EventEmitter } from 'events'
import readline from 'readline'
import tty from 'tty'
import { format } from 'node:util'
import { formatLog } from '../lib/log.js'
import { createPingSession } from '../lib/peer-ping.js'
import { binarySize, formatPayload } from '../lib/cli.js'
import { program } from 'commander'
import { clientHelp, interactiveHelp } from '../lib/help.js'

import { IO, IOCongSocket, ENC_MODE, version as iosignal_version } from 'iosignal'
import pkg from '../package.json' with { type: 'json' };
const cli_version = pkg.version;
const version = `CLI ${cli_version} IOSignal ${iosignal_version}`


class Console extends EventEmitter {
  constructor() {
    super()

    this.showIncommingMessage = true
    this.stdin = process.stdin
    this.stdout = process.stdout
    this.stderr = process.stderr

    this.readlineInterface = readline.createInterface(this.stdin, this.stdout)
    this.readlineInterface.setPrompt(this.stdout.isTTY && !process.env.NO_COLOR ? '\x1b[38;5;109m›\x1b[39m ' : '› ')

    this.readlineInterface
      .on('line', (data) => {
        this.emit('line', data)
      })
      .on('close', () => {
        this.emit('close')
      })

    this._resetInput = () => {
      this.clear()
    }
  }

  static get Colors() {
    return {
      Red: '\u001b[31m',
      Green: '\u001b[32m',
      Yellow: '\u001b[33m',
      Blue: '\u001b[34m',
      Default: '\u001b[39m'
    }
  }

  static get Types() {
    return {
      Incoming: '< ',
      Control: '',
      Error: 'error: ',
      Put: '.'
    }
  }

  prompt() {
    this.readlineInterface.prompt(true)
  }

  print(type, msg, color, kind = type === Console.Types.Error ? 'error' : type === Console.Types.Control ? 'status' : 'reply') {
    if (tty.isatty(1)) {
      this.clear()
      const display = kind === 'incoming' ? msg.replace(/^CID Message: /, '직접 ').replace(/^-message: /, '채널 ') : msg
      this.stdout.write(formatLog(display, { kind, timestamps: this.timestamps, color: !process.env.NO_COLOR }) + '\n')
      this.prompt()
    } else if (type === Console.Types.Incoming) {
      this.stdout.write(msg + '\n')
    } else if (type === Console.Types.Error) {
      this.stderr.write(type + msg + '\n')
    } else if (type === Console.Types.Put) {
      // this.stdout.write( '.' )
    } else {
      // is a control message and we're not in a tty... drop it.
    }
  }

  reply(...args) {
    const msg = format(...args)
    if (tty.isatty(1)) this.print(Console.Types.Incoming, msg, Console.Colors.Default)
    else this.stdout.write(msg + '\n')
  }

  clear() {
    if (tty.isatty(1)) {
      this.stdout.write('\r\u001b[2K\u001b[3D')
    }
  }

  pause() {
    this.stdin.on('keypress', this._resetInput)
  }

  resume() {
    this.stdin.removeListener('keypress', this._resetInput)
  }
}

function noop() { }

program
  .version(version)
  .description('Interactive IOSignal client over WebSocket or CongSocket (TCP).')
  .usage('[options]')
  .option('-c, --connect [url]', 'server URL: ws://, wss:// or cong://; -c alone: wss://io.iosignal.net/ws; omitted: ws://localhost:7777; bare host:port uses ws://')
  .option('-i, --id <id>', 'authentication ID (use with --key)')
  .option('-k, --key <key>', 'authentication key (use with --id)')
  .option('-a, --auth-idKey <idkey>', 'combined authentication credentials: id.key')
  .option('--timestamps', 'show timestamps in interactive logs')
  .option('-j, --join-channel <tags>', 'subscribe on connection; comma-separated tags')
  .addHelpText('after', clientHelp)
  .showHelpAfterError('Use --help for startup options and interactive commands.')
  .parse(process.argv)

const options = program.opts()
const defaultWebSocketPort = 7777;



if (options.connect === true) {
  options.connect = 'wss://io.iosignal.net/ws';
} else if (!options.connect) {
  options.connect = 'localhost:' + defaultWebSocketPort;
}


const wsConsole = new Console()
wsConsole.timestamps = options.timestamps || false

let connectUrl = options.connect
// console.log('connectUrl raw', connectUrl )

let io;


if (connectUrl.indexOf('cong') === 0) {
  //use TCP connection
  io = new IOCongSocket(connectUrl)
} else { // ws connection
  if (!connectUrl.match(/\w+:\/\/.*$/i)) {
    connectUrl = `ws://${connectUrl}`
  }
  io = new IO(connectUrl)
}

if (options.id && options.key) {
  io.auth(options.id, options.key)
} else if (options.authIdKey) {
  io.auth(options.authIdKey)
}


io.listen('@', (tag, ...args) => {
  if (wsConsole.showIncommingMessage && !['@ping', '@pong'].includes(tag)) wsConsole.print(Console.Types.Incoming, `CID Message: ${tag} ${formatPayload(args)}`, Console.Colors.Green, 'incoming')
})



if (options.joinChannel) {
  console.log('options joinchannel', options.joinChannel)
  io.channels.add(options.joinChannel)

}


wsConsole.print(Console.Types.Control, `[연결] 접속 중 · ${connectUrl}`, Console.Colors.Yellow)

const peerPings = createPingSession(io, {
  onPong: cid => wsConsole.print(Console.Types.Incoming, cid ? `pong (${cid})` : 'pong', Console.Colors.Yellow),
  onTimeout: cid => wsConsole.print(Console.Types.Error, `ping timeout${cid ? ` (${cid})` : ''}`, Console.Colors.Red)
})
process.once('exit', () => peerPings.dispose())

io.on('ready', () => {
  wsConsole.print(
    Console.Types.Control,
    '[연결] 접속 완료',
    Console.Colors.Green)
})

io.on('close', () => {
  wsConsole.print(Console.Types.Control,
    '[연결] 연결이 닫혔습니다.',
    Console.Colors.Yellow)
})


io.on('authorized', () => {
  wsConsole.print(
    Console.Types.Control,
    `[인증] 완료 · TLS: ${io.TLS}`,
    Console.Colors.Yellow)
})

io.on('auth_fail', () => {
  wsConsole.print(
    Console.Types.Control,
    '[인증] 인증에 실패했습니다.',
    Console.Colors.Yellow)
})

io.on('auth_clear', () => {
  wsConsole.print(
    Console.Types.Control,
    '[인증] 인증이 해제되었습니다.',
    Console.Colors.Yellow)
})

io.on('over_size', () => {
  wsConsole.print(
    Console.Types.Control,
    `OVER_SIZE: your signalSize limit is: ${io.quota.signalSize}`,
    Console.Colors.Yellow)
})

io.on('echo', (...args) => {
    wsConsole.print(
    Console.Types.Control,
    `ECHO ${args}`,
    Console.Colors.Yellow, 'reply')
})
io.on('iam_res', (...args) => {
  // console.log('log: ', args)
    wsConsole.print(
    Console.Types.Incoming,
    `IAM_RES ${args}`,
    Console.Colors.Yellow)
})

io.on('message',(tag,...args)=>{
  if (wsConsole.showIncommingMessage) wsConsole.print(Console.Types.Incoming, `-message: ${tag} ${formatPayload(args)}`, Console.Colors.Green, 'incoming')
})

wsConsole.on('line', (data) => {
  try {
    const line = data.trim()
    if (!line) {
      wsConsole.prompt()
      return
    }
    if (line.startsWith('.')) {
      throw new Error('Command prefixes have been removed. Type commands without the leading dot (e.g. help, sub, pub).')
    }
    const toks = line.split(/\s+/)
    const cmd = toks[0]
    switch (cmd) {
      case 'help':
        wsConsole.reply(interactiveHelp)
        break;
      case 'login':
        toks.shift()
        io.login(...toks)
        break;
      case 'auth':
        toks.shift()
        io.auth(...toks)
        break;

      case 'encNo':
        io.encMode = ENC_MODE.NO
        wsConsole.print(Console.Types.Incoming, `encMode: ${ENC_MODE[io.encMode]}`, Console.Colors.Green)
        break;
      case 'encYes':
        io.encMode = ENC_MODE.YES
        wsConsole.print(Console.Types.Incoming, `encMode: ${ENC_MODE[io.encMode]}`, Console.Colors.Green)
        break;
      case 'encAuto':
        io.encMode = ENC_MODE.AUTO
        wsConsole.print(Console.Types.Incoming, `encMode: ${ENC_MODE[io.encMode]}`, Console.Colors.Green)
        break;
      case 'encMode':
        wsConsole.print(Console.Types.Incoming, `encMode: ${ENC_MODE[io.encMode]}`, Console.Colors.Green)
        break;

      case 'echo':
        io.echo(toks[1])
        break;

      case 'iam':
        io.iam(toks[1])
        break;

      case 'id':
        wsConsole.reply(`state: ${io.stateName} cid: ${io.cid} level: ${io.level}`)
        break;

      case 'sudo':
        toks.shift()
        io.call('sudo', ...toks).then(res => {
          if (res.ok) {
            wsConsole.reply('>> sudo response:', res.body)
          } else {
            wsConsole.reply('>> sudo response:', res.body)
          }
        }).catch(err => {
          wsConsole.print(Console.Types.Error, String(err), Console.Colors.Red)
        })

        break;


      case 'quota':
        wsConsole.reply(`quota: ${JSON.stringify(io.quota)}`)
        break;

      case 'ch':
        let chList = []
        io.channels.forEach(v => {
          chList.push(v)
        })
        wsConsole.reply(`channels: ${chList.toString()}`)
        break;

      case 'sig':
      case 'signal':
        toks.shift()
        io.signal(...toks)
        break;

      case 'sig_bin':
        toks.shift()
        let to = toks[0]
        if (!to) throw new Error('usage: sig_bin <tag> <size>')
        let size = binarySize(toks[1])
        wsConsole.reply(`signal tag: ${to} size: ${size}`)
        io.signal(to, new Uint8Array(size))
        break;

      case 'pub':
      case 'publish':
        toks.shift()
        io.publish(...toks)
        break;

      case 'call':
        toks.shift()
        if (toks.length < 2) {
          wsConsole.print(
            Console.Types.Error,
            '[call need at least two params]  call target command [, ..args]',
            Console.Colors.Yellow
          )
          return
        }
        io.call(...toks).then(result => {
          wsConsole.reply('>> response:', result)
        }).catch(e => {
          wsConsole.print(Console.Types.Error, String(e), Console.Colors.Red)
        })
        break;

      case 'join':
      case 'sub':
      case 'subscribe':
      case 'listen':
        toks.shift()
        let tag = toks[0]
        if(tag){
          io.subscribe( tag )
          let tagList = tag.split(',')
          tagList.forEach( (v)=>{
            io.channels.add( v )
          })
        }
        break;


      case 'unsub':
        io.unsubscribe(toks[1]);
        break;

      case 'pping':
        if (!toks[1]) throw new Error('Usage: pping <cid>')
      case 'ping':
        if (toks.length > 2) throw new Error('Usage: ping [cid]')
        peerPings.ping(toks[1])
        break;

      case 'pong':
        io.pong()
        break

      case 'close':
        io.close()
        break

      case 'open':
      case 'connect':
        if (toks[1]) {
          let url = toks[1]
          if (!url.match(/\w+:\/\/.*$/i)) {
            url = `ws://${url}`
          }
          io.open(url) // new url
        } else {
          io.open()  // last url
        }
        break
      case 'show':
        wsConsole.showIncommingMessage = true
        break;
      case 'hide':
        wsConsole.showIncommingMessage = false
        break;
      case 'quit':
      case 'exit':
        process.exit();
      default:
        wsConsole.print(
          Console.Types.Error,
          'Unknown command. Type help for commands and examples.',
          Console.Colors.Yellow
        )
    }
  } catch (error) {
    wsConsole.print(Console.Types.Error, error.message, Console.Colors.Red)
  }
  wsConsole.prompt()
})





