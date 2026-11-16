import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { createPingSession } from '../lib/ping.js';
function fixture() {
 const io=new EventEmitter();Object.assign(io,{cid:'A',stateName:'ready'});const sent=[],pongs=[],timeouts=[];
 io.signal=(...args)=>sent.push(args);io.ping=()=>sent.push(['server']);
 const session=createPingSession(io,{onPong:cid=>pongs.push(cid),onTimeout:cid=>timeouts.push(cid),timeoutMs:20});
 return {io,session,sent,pongs,timeouts};
}
test('ping sends the protocol PING, one at a time; peer @ping/@pong signals are not answered or counted',()=>{
 const {io,session,sent,pongs}=fixture();session.ping();assert.throws(()=>session.ping(),/Already waiting/);
 io.emit('socket_data',new Uint8Array([0xce]));assert.deepEqual(pongs,['']);
 // Peer ping was removed: nothing is sent back, and a peer @pong is not a server pong.
 io.emit('@','@ping','C');io.emit('@ping','@ping','C');session.ping();io.emit('@','@pong','B');io.emit('@pong','@pong','B');
 assert.deepEqual(sent,[['server'],['server']]);assert.deepEqual(pongs,['']);session.dispose();
});
test('new library pong event and old raw packet path never duplicate output',()=>{
 const {io,session,pongs}=fixture();session.ping();io.emit('pong');io.emit('socket_data',new Uint8Array([0xce]));assert.deepEqual(pongs,['']);session.dispose();
});
test('a pong nobody asked for (the keep-alive ping) is not reported, and an answer carries its time',()=>{
 const io=new EventEmitter();Object.assign(io,{cid:'A',stateName:'ready',signal(){},ping(){}});const got=[];
 const session=createPingSession(io,{onPong:(cid,ms)=>got.push([cid,ms]),onTimeout(){},timeoutMs:50});
 io.emit('pong');assert.deepEqual(got,[]);
 session.ping();io.emit('pong');io.emit('pong');assert.equal(got.length,1);
 assert.equal(got[0][0],'');assert.ok(typeof got[0][1]==='number'&&got[0][1]>=0);session.dispose();
});
test('a ping times out, and disconnection/disposal cancel the pending timer',async()=>{
 const {io,session,timeouts,pongs}=fixture();session.ping();await delay(35);assert.deepEqual(timeouts,['']);
 session.ping();io.emit('closed');await delay(35);assert.deepEqual(timeouts,['']);
 session.ping();session.dispose();io.emit('pong');await delay(35);assert.deepEqual(pongs,[]);assert.deepEqual(timeouts,['']);assert.equal(io.eventNames().length,0);
});
test('a ping before the connection is ready is refused',()=>{
 const {io,session}=fixture();io.stateName='connecting';assert.throws(()=>session.ping(),/not ready/);session.dispose();
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
