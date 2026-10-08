import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { createPingSession } from '../lib/peer-ping.js';
function fixture() {
 const io=new EventEmitter();Object.assign(io,{cid:'A',stateName:'ready'});const sent=[],pongs=[],timeouts=[];
 io.signal=(...args)=>sent.push(args);io.ping=()=>sent.push(['server']);
 const session=createPingSession(io,{onPong:cid=>pongs.push(cid),onTimeout:cid=>timeouts.push(cid),timeoutMs:20});
 return {io,session,sent,pongs,timeouts};
}
test('ping without CID uses protocol; peer ping/response use one TEXT CID',()=>{
 const {io,session,sent,pongs}=fixture();session.ping();io.emit('socket_data',new Uint8Array([0xce]));
 session.ping('B');assert.throws(()=>session.ping('B'),/Already waiting/);io.emit('@','@pong','B');
 io.emit('@','@ping','C');assert.deepEqual(sent,[['server'],['B@ping','A'],['C@pong','A']]);assert.deepEqual(pongs,['','B']);
 io.emit('@','@ping','bad@route');io.emit('@','@ping',{cid:'C'});io.emit('@','@ping','C','extra');assert.equal(sent.length,3);session.dispose();
});
test('new library pong event and old raw packet path never duplicate output',()=>{
 const {io,session,pongs}=fixture();io.emit('pong');io.emit('socket_data',new Uint8Array([0xce]));assert.deepEqual(pongs,['']);session.dispose();
});
test('timeouts are per target, and disconnection/disposal cancel pending timers',async()=>{
 const {io,session,timeouts,pongs}=fixture();session.ping('B');await delay(35);assert.deepEqual(timeouts,['B']);
 session.ping('C');io.emit('closed');await delay(35);assert.deepEqual(timeouts,['B']);
 session.ping('D');session.dispose();io.emit('@','@pong','D');await delay(35);assert.deepEqual(pongs,[]);assert.deepEqual(timeouts,['B']);assert.equal(io.eventNames().length,0);
});

test('Node CLI reads legacy WebSocket control PONG and detaches old sockets', () => {
 const {io,session,pongs,timeouts}=fixture();
 const oldSocket=new EventEmitter();io.socket=oldSocket;io.emit('ready');
 session.ping();oldSocket.emit('pong');assert.deepEqual(pongs,['']);
 const nextSocket=new EventEmitter();io.socket=nextSocket;io.emit('ready');
 assert.equal(oldSocket.listenerCount('pong'),0);
 session.ping();nextSocket.emit('pong');assert.deepEqual(pongs,['','']);
 io.emit('close');assert.equal(nextSocket.listenerCount('pong'),0);
 session.dispose();assert.deepEqual(timeouts,[]);
});
