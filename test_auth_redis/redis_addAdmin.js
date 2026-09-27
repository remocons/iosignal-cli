import { BohoAuth, RedisKeyProvider } from 'iosignal'
import { withRedis } from '../lib/redis.js'

await withRedis(async redisClient => {
  let auth = new BohoAuth( new RedisKeyProvider( redisClient))

  //addUSer(did,dkey,cid,level)
  if( process.argv.length != 5 ){
    throw new Error('usage: node test_auth_redis/redis_addAdmin.js <id> <key> <cid>')
  }

  let did = process.argv[2]
  let dkey = process.argv[3]
  let cid = process.argv[4]

  let addResult = await auth.addAuth( did, dkey, cid ,255)
  let getResult = await auth.getAuth( did )
  let saveResult = await auth.save();

  console.log('add',addResult )
  console.log('found:', Boolean(getResult))

  console.log('save result', saveResult)
})
