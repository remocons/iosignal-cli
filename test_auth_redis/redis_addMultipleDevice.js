import { BohoAuth, RedisKeyProvider } from 'iosignal'
import { withRedis } from '../lib/redis.js'
import { integer } from '../lib/cli.js'

await withRedis(async redisClient => {
  let auth = new BohoAuth( new RedisKeyProvider( redisClient))

  // node filename base_id level number
  // node uno 1 10
  //addUSer(did,dey,cid,level)
  let baseId = process.argv[2] ? process.argv[2] : 'uno'
  let level = integer(process.argv[3] ?? 1, 'level', 0, 255);
  let n = integer(process.argv[4] ?? 10, 'count', 1, 10000);

  console.log( baseId, n )
  for(let i=0; i< n ;i++){
    let id = baseId + i;
    let addResult = await auth.addAuth( id, id, id ,level)
    console.log('add',addResult )
  }

  await auth.save();
})
