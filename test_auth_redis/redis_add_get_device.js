import { BohoAuth, RedisKeyProvider } from 'iosignal'
import { withRedis } from '../lib/redis.js'

await withRedis(async redisClient => {
  let auth = new BohoAuth( new RedisKeyProvider( redisClient))

  // addAuth(did, key, cid, role, quota)
  let addResult = await auth.addAuth('uno','uno','uno','device')
  let getResult = await auth.getAuth('uno')
  let wrongResult = await auth.getAuth('noid')

  console.log('add',addResult )
  console.log('found:', Boolean(getResult))

  console.log('wrongResult',wrongResult)
})
