# IOSignal CLI

[한국어](README.md) | [English](README.en.md)

The repository of two [IOSignal](https://iosignal.net) command-line tools. Each is installed as its own npm package.

| Package | Folder | What it does |
| --- | --- | --- |
| [iosignal-cli](https://www.npmjs.com/package/iosignal-cli) | [packages/iosignal-cli](packages/iosignal-cli/README.en.md) | IOSignal server (`io-server`), interactive client (`io-client`), key generation (`io-keygen`) and IP lookup (`ioip`) |
| [remocon](https://www.npmjs.com/package/remocon) | [packages/remocon](packages/remocon/README.en.md) | Command-sending CLI with one-shot, line input, key input and interactive modes (`remocon`, `remote`) |

```sh
npm install -g iosignal-cli
npm install -g remocon
```

## Development

Requires Node.js 22.16 or later. The repository uses npm workspaces.

```sh
npm ci
npm test              # shared file check and both packages' tests
npm run sync:shared   # copy shared/ into packages/*/lib/
```

Files both CLIs use (`ping.js`, `ping-line.js`, `log.js`) come from `shared/`. So that each published package carries its own copy, `npm run sync:shared` copies them into each package's `lib/`; `npm test` and publishing (`prepack`) run it too. The tests fail while a copy differs from its source.

Publish each package on its own: `npm publish -w iosignal-cli`, `npm publish -w remocon`.

## License

MIT
