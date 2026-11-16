import { createClient } from 'redis'
import { integer } from './cli.js'

export function redisOptions(env = process.env) {
  return { socket: {
    host: env.REDIS_HOST || 'localhost',
    port: integer(env.REDIS_PORT || 6379, 'REDIS_PORT', 1, 65535),
    connectTimeout: 5000,
    reconnectStrategy: false
  } }
}
export async function connectRedis() {
  const client = createClient(redisOptions())
  client.on('error', error => console.error('Redis error:', error.message))
  try {
    await client.connect()
    return client
  } catch (error) {
    await closeRedis(client)
    throw error
  }
}
export async function closeRedis(client) {
  if (!client?.isOpen) return
  try { await client.quit() } catch { if (client.isOpen) await client.disconnect() }
}
export async function withRedis(action) {
  let client
  try {
    client = await connectRedis()
    await action(client)
  } catch (error) {
    console.error('Error:', error.message)
    process.exitCode = 1
  } finally { await closeRedis(client) }
}
