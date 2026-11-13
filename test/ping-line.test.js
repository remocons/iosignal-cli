import test from 'node:test'
import assert from 'node:assert/strict'
import { createPingDisplay, sparkline } from '../lib/ping-line.js'

// A console that keeps its lines, like a terminal: rewrite replaces the last one.
function screen(live = true) {
  const out = []
  const timers = []
  const display = createPingDisplay({
    live,
    print: text => out.push(text),
    rewrite: text => { out[out.length - 1] = text },
    lines: () => out.length,
    setTimer: fn => { timers.push(fn); return timers.length },
    clearTimer: id => { timers[id - 1] = null },
  })
  const tick = () => timers.forEach(fn => fn?.())
  return { out, display, tick, type: text => out.push(text) }
}

test('a ping is one line: waiting, then the answer in its place', () => {
  const { out, display, tick } = screen()
  display.start()
  assert.equal(out.length, 1)
  assert.match(out[0], /^⠋ ping …$/)
  tick()
  assert.match(out[0], /^⠙ ping …$/)
  display.pong('', 23.4)
  assert.deepEqual(out, ['✓ pong 23 ms'])
  tick()
  assert.deepEqual(out, ['✓ pong 23 ms'], 'the turning mark stops with the answer')
})

test('pings one after another update the same line with a count, average and recent bars', () => {
  const { out, display } = screen()
  for (const ms of [20, 30, 10]) { assert.equal(display.continues(''), out.length > 0); display.start(); display.pong('', ms) }
  assert.deepEqual(out, ['✓ pong 10 ms · 3회 · 평균 20 ms  ▅█▁'])
})

test('another line in between, another target or a timeout starts a new line', () => {
  const { out, display, type } = screen()
  display.start('B'); display.pong('B', 5)
  type('› sub demo')
  assert.equal(display.continues('B'), false)
  display.start('B'); display.pong('B', 6)
  display.start(); display.pong('', 7)
  display.start(); display.timeout('', 3000)
  display.start(); display.pong('', 8)
  assert.deepEqual(out, ['✓ pong (B) 5 ms', '› sub demo', '✓ pong (B) 6 ms', '✗ ping timeout · 3 s', '✓ pong 8 ms'])
})

test('when the output is not a terminal, only the answers are written, one line each', () => {
  const { out, display } = screen(false)
  display.start('B'); display.pong('B', 12.6); display.start(); display.pong('', 3); display.start(); display.timeout('', 3000)
  assert.deepEqual(out, ['pong (B) 13 ms', 'pong 3 ms', 'ping timeout · 3 s'])
})

test('sparkline scales the recent times', () => {
  assert.equal(sparkline([]), '')
  assert.equal(sparkline([5, 5]), '▁▁')
  assert.equal(sparkline([0, 50, 100]), '▁▅█')
})
