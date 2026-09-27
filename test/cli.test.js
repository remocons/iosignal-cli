import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { port, timeout, binarySize, formatPayload } from '../lib/cli.js'
import { redisOptions } from '../lib/redis.js'

const run = (file, args) => spawnSync(process.execPath, [`bin/${file}.js`, ...args], { encoding: 'utf8', timeout: 5000 })
test('CLI help and version load with installed iosignal', () => {
  for (const file of ['io-client', 'io-server']) {
    for (const flag of ['-h', '--help', '--version']) {
      const result = run(file, [flag])
      assert.equal(result.status, 0, result.stderr)
      assert.ok(result.stdout.length)
    }
  }
})
test('invalid server options fail before listening', () => {
  for (const args of [['-l','7777oops'], ['-l','65536'], ['-L','-1'], ['-t','0'], ['-t','1000oops']]) {
    const result = run('io-server', args)
    assert.equal(result.status, 1, result.stderr)
    assert.match(result.stderr, /integer/)
  }
})
test('client rejects unsupported timeout', () => {
  const result = run('io-client', ['--timeout','1000'])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /unknown option/)
})
test('numeric bounds include ephemeral ports and reject malformed or excessive sizes', () => {
  assert.equal(port('0'), 0)
  assert.equal(port('65535'), 65535)
  assert.equal(timeout('1000'), 1000)
  assert.equal(binarySize('0'), 0)
  assert.equal(binarySize('1048576'), 1048576)
  for (const value of [undefined, '-1', 'NaN', '2.5', '3foo', '1048577']) assert.throws(() => binarySize(value))
})
test('payload formatting preserves later args, binary, bigint and circular objects', () => {
  const circular = {}; circular.self = circular
  const text = formatPayload([{ first: 1 }, 'second', Buffer.from([1,2]), 3n, circular])
  for (const pattern of [/first: 1/, /second/, /Buffer 01 02/, /3n/, /Circular/]) assert.match(text, pattern)
})
test('Redis environment is applied and invalid ports fail early', () => {
  assert.equal(redisOptions({}).socket.port, 6379)
  const options = redisOptions({ REDIS_HOST: 'redis.internal', REDIS_PORT: '6380' })
  assert.equal(options.socket.host, 'redis.internal')
  assert.equal(options.socket.port, 6380)
  for (const value of ['0','65536','123x']) assert.throws(() => redisOptions({ REDIS_PORT: value }))
})
