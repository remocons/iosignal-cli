// The files both CLIs use come from shared/ and are copied into each package's lib/, so a published
// package carries its own copy. Run after changing shared/: npm run sync:shared (npm test and each
// package's prepack run it too). test/shared.test.mjs fails while a copy differs.
// Outside this repository (an installed package) there is no shared/ and the script does nothing.
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const SHARED = ['ping.js', 'ping-line.js', 'log.js']
export const PACKAGES = ['iosignal-cli', 'remocon']
const root = new URL('../', import.meta.url)
const source = name => new URL(`shared/${name}`, root)
const target = (pkg, name) => new URL(`packages/${pkg}/lib/${name}`, root)

export function sync({ log = console.error } = {}) {
  if (!existsSync(new URL('shared/', root))) return
  for (const pkg of PACKAGES) {
    for (const name of SHARED) {
      const from = source(name), to = target(pkg, name)
      const same = existsSync(to) && readFileSync(from).equals(readFileSync(to))
      if (!same) copyFileSync(from, to)
      log(`${same ? 'same   ' : 'copied '} packages/${pkg}/lib/${name}`)
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) sync()
