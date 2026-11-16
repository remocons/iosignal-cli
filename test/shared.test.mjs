import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SHARED, PACKAGES } from '../scripts/sync-shared.mjs'

// shared/ is the source; each package's lib/ keeps a copy (npm run sync:shared).
test('each package carries the same copy of the shared files', () => {
  for (const pkg of PACKAGES) {
    for (const name of SHARED) {
      const copy = readFileSync(new URL(`../packages/${pkg}/lib/${name}`, import.meta.url))
      assert.ok(copy.equals(readFileSync(new URL(`../shared/${name}`, import.meta.url))), `packages/${pkg}/lib/${name} differs from shared/: run npm run sync:shared`)
    }
  }
})
