import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { IO } from 'iosignal'

function launch(args, env = {}) {
  const child = spawn(process.execPath, args, { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] })
  child.output = ''
  child.stdout.on('data', data => { child.output += data })
  child.stderr.on('data', data => { child.output += data })
  child.done = new Promise(resolve => child.on('exit', resolve))
  return child
}
async function until(check, child) {
  for (let n = 0; n < 150; n++) {
    if (check()) return
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(child.output)
    await delay(40)
  }
  throw new Error(`Timed out: ${child?.output || ''}`)
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  child.kill('SIGTERM')
  const timer = setTimeout(() => child.kill('SIGKILL'), 2000)
  await child.done
  clearTimeout(timer)
}

test('real CLI receives all payload args, hides messages and survives invalid binary size', { timeout: 15000 }, async t => {
  const server = launch(['bin/io-server.js', '-l', '0'])
  t.after(() => stop(server))
  await until(() => /ws:\/\/localhost:\d+/.test(server.output), server)
  const url = server.output.match(/ws:\/\/localhost:\d+/)[0]
  const client = launch(['bin/io-client.js', '-c', url, '-j', 'cli-test'])
  t.after(() => stop(client))
  const publisher = new IO(url)
  publisher.autoReconnect = false
  t.after(() => publisher.destroy())
  await until(() => publisher.stateName === 'ready')
  const publish = setInterval(() => publisher.publish('cli-test', { marker: 'object-first' }, 'last-arg'), 80)
  t.after(() => clearInterval(publish))
  await until(() => client.output.includes('last-arg'), client)
  clearInterval(publish)
  assert.match(client.output, /object-first/)
  client.stdin.write('help\n')
  await until(() => client.output.includes('Interactive commands'), client)
  assert.match(client.output, /aliases of subscribe/)
  client.stdin.write('sig_bin cli-test -1\n')
  await until(() => client.output.includes('size must be an integer'), client)
  client.stdin.write('hide\nid\n')
  await until(() => client.output.includes('state:'), client)
  publisher.publish('cli-test', 'hidden-marker')
  await delay(200)
  assert.doesNotMatch(client.output, /hidden-marker/)
  client.stdin.write('show\nid\n')
  await until(() => (client.output.match(/state:/g) || []).length === 2, client)
  publisher.publish('cli-test', 'visible-marker')
  await until(() => client.output.includes('visible-marker'), client)

  // Commands have no prefix; periods inside tags/payload are ordinary data.
  const sent = []
  publisher.listen('cli.out', (tag, ...args) => sent.push([tag, ...args]))
  publisher.subscribe('cli.out')
  let subscriptionReady = false
  publisher.once('echo', () => { subscriptionReady = true })
  publisher.echo('sub-ready')
  await until(() => subscriptionReady)
  client.stdin.write('  \n\t sub cli.out  \n.pub cli.out rejected\n  publish cli.out .payload 1.25  \n')
  await until(() => sent.length === 1 && client.output.includes('-message: cli.out .payload 1.25'), client)
  assert.deepEqual(sent, [['cli.out', '.payload', '1.25']])
  assert.match(client.output, /without the leading dot/)
  client.stdin.write('unsub cli.out\nch\n')
  await until(() => client.output.includes('channels: cli-test'), client)
  client.stdin.write('exit\n')
  assert.equal(await client.done, 0, client.output)
})

test('invalid Redis configuration exits cleanly before server starts', { timeout: 10000 }, async () => {
  const child = launch(['bin/io-server.js', '-l', '0', '--auth-redis'], { REDIS_HOST: '127.0.0.1', REDIS_PORT: '0' })
  assert.equal(await child.done, 1)
  assert.match(child.output, /REDIS_PORT must be an integer/)
  assert.doesNotMatch(child.output, /Serving/)
})

test('Redis examples, authentication and graceful shutdown', { timeout: 20000, skip: !process.env.IOSIGNAL_TEST_REDIS_SERVER }, async t => {
  const { createServer } = await import('node:net')
  const { mkdtemp, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const reservation = createServer()
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve))
  const port = reservation.address().port
  await new Promise(resolve => reservation.close(resolve))
  const directory = await mkdtemp(join(tmpdir(), 'iosignal-cli-redis-'))
  const redis = spawn(process.env.IOSIGNAL_TEST_REDIS_SERVER, ['--bind', '127.0.0.1', '--port', String(port), '--dir', directory, '--save', '', '--appendonly', 'no'])
  redis.output = ''
  redis.stdout.on('data', data => { redis.output += data })
  redis.stderr.on('data', data => { redis.output += data })
  redis.done = new Promise(resolve => redis.on('exit', resolve))
  t.after(async () => { await stop(redis); await rm(directory, { recursive: true, force: true }) })
  await until(() => redis.output.includes('Ready to accept connections'), redis)
  const env = { REDIS_HOST: '127.0.0.1', REDIS_PORT: String(port) }
  for (const args of [
    ['test_auth_redis/redis_addAdmin.js', 'admin', 'test-secret-key', 'admin'],
    ['test_auth_redis/redis_addMultipleDevice.js', 'device', '1', '2'],
    ['test_auth_redis/redis_add_get_device.js']
  ]) {
    const example = launch(args, env)
    t.after(() => stop(example))
    assert.equal(await example.done, 0, example.output)
  }
  const server = launch(['test_auth_redis/server-auth-redis.js', '-l', '0'], env)
  t.after(() => stop(server))
  await until(() => /ws:\/\/localhost:\d+/.test(server.output), server)
  const client = launch(['bin/io-client.js', '-c', server.output.match(/ws:\/\/localhost:\d+/)[0], '-i', 'admin', '-k', 'test-secret-key'])
  t.after(() => stop(client))
  const timer = setInterval(() => client.stdin.write('id\n'), 80)
  t.after(() => clearInterval(timer))
  await until(() => client.output.includes('state: ready'), client)
  clearInterval(timer)
  assert.doesNotMatch(client.output, /test-secret-key/)
  await stop(client)
  await stop(server)
  assert.equal(server.exitCode, 0, server.output)
  await stop(redis)
  const failed = launch(['bin/io-server.js', '-l', '0', '--auth-redis'], env)
  t.after(() => stop(failed))
  assert.equal(await failed.done, 1, failed.output)
  assert.doesNotMatch(failed.output, /Serving/)
})


test('CLI ping CID and pping alias receive peer pong while both peers hide ordinary input', {timeout:10000},async t=>{
 const server=launch(['bin/io-server.js','-l','0']);t.after(()=>stop(server));
 await until(()=>/ws:\/\/localhost:\d+/.test(server.output),server);
 const url=server.output.match(/ws:\/\/localhost:\d+/)[0];
 const peer=new IO(url);t.after(()=>peer.destroy());await until(()=>peer.stateName==='ready');
 peer.on('@',(tag,from)=>{if(tag==='@ping')peer.signal(`${from}@pong`,peer.cid);});
 const cli=launch(['bin/io-client.js','-c',url,'-j','ready-check']);t.after(()=>stop(cli));
 // Echo an ordinary message back from the CLI to confirm it is connected.
 const timer=setInterval(()=>peer.publish('ready-check','ready-marker'),40);t.after(()=>clearInterval(timer));
 await until(()=>cli.output.includes('ready-marker'),cli);clearInterval(timer);
 cli.stdin.write(`hide\nping ${peer.cid}\n`);await until(()=>cli.output.includes(`pong (${peer.cid})`),cli);
 cli.stdin.write(`pping ${peer.cid}\n`);await until(()=>cli.output.split(`pong (${peer.cid})`).length===3,cli);
 cli.stdin.write('exit\n');assert.equal(await cli.done,0,cli.output);
});
