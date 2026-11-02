import { BohoAuth, RedisKeyProvider } from 'iosignal'
import { withRedis } from '../lib/redis.js'
import { integer } from '../lib/cli.js'

await withRedis(async redisClient => {
  let auth = new BohoAuth( new RedisKeyProvider( redisClient))

  // node test_auth_redis/redis_addMultipleDevice.js <base_id> [count] [quota]
  // e.g. node test_auth_redis/redis_addMultipleDevice.js uno 10 basic
  // addAuth(did, key, cid, role, quota): devices with key = id.
  let baseId = process.argv[2] ? process.argv[2] : 'uno'
  let n = integer(process.argv[3] ?? 10, 'count', 1, 10000);
  let quota = process.argv[4];

  console.log( baseId, n )
  for(let i=0; i< n ;i++){
    let id = baseId + i;
    let addResult = await auth.addAuth( id, id, id, 'device', quota)
    console.log('add',addResult )
  }

  await auth.save();
})
