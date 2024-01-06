import { Auth_Redis , serverOption , Server } from 'iosignal'
import { createClient  } from 'redis';

let redisClient = createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

let authManager = new Auth_Redis( redisClient)

serverOption.showMessage = 'message';
const server = new Server( serverOption ,authManager  )
console.log( 'serverOption:', serverOption )
