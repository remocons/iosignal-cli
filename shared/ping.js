// Server ping: io.ping() sends the protocol PING and the server answers PONG. The session times one
// ping at a time. onPong(target, ms) and onTimeout(target, ms) are called only for a ping this session
// sent (target is always ''): the client's own keep-alive pings (IOCore.keepAlive, after 40 s without
// traffic) are answered too, and are not shown.
// Peer ping ('<cid>@ping' / '@pong', an application convention no library implements) was removed on
// 2026-11-16: it answered whatever CID a message named, and showed anyone that a device was online.
// Shared file: shared/ in the iosignal-cli repository is the source. packages/iosignal-cli/lib,
// packages/remocon/lib and remocon_kr/src/lib/cli keep identical copies (npm run sync:shared), and
// tests compare them with it.
export function createPingSession(io, { onPong, onTimeout, timeoutMs = 3000, pongCode = 0xCE }) {
  let pending = null; // { timer, at }
  let hasPongEvent = false;
  let disposed = false;
  let socket;
  const controlPong = () => pong();
  function detachSocket() { socket?.off?.('pong', controlPong); socket = undefined; }
  function attachSocket() {
    detachSocket();
    if (typeof io.socket?.on === 'function') { socket = io.socket; socket.on('pong', controlPong); }
  }
  function clear() { clearTimeout(pending?.timer); pending = null; }
  function disconnected() { clear(); detachSocket(); }
  function pong() {
    const sent = pending;
    if (disposed || !sent) return;
    clear();
    onPong('', performance.now() - sent.at);
  }
  const handlers = {
    pong: () => { hasPongEvent = true; pong(); },
    // iosignal 7.0.4 discards protocol PONG without emitting an event.
    // The core's socket_data listener runs first; newer cores emit pong there.
    socket_data: packet => { if (!hasPongEvent && packet?.length === 1 && packet[0] === pongCode) pong(); },
    ready: attachSocket,
    close: disconnected,
    closed: disconnected,
    stop: disconnected
  };
  Object.entries(handlers).forEach(([event, handler]) => io.on(event, handler));
  if (io.stateName === 'ready') attachSocket();
  return {
    clear,
    ping() {
      if (disposed) return;
      if (io.stateName !== 'ready') throw new Error('Server connection is not ready.');
      if (pending) throw new Error('Already waiting for pong.');
      pending = { at: performance.now(), timer: setTimeout(() => { pending = null; if (!disposed) onTimeout('', timeoutMs); }, timeoutMs) };
      try { io.ping(); }
      catch (error) { clear(); throw error; }
    },
    dispose() { disposed = true; clear(); detachSocket(); Object.entries(handlers).forEach(([event, handler]) => io.off(event, handler)); }
  };
}
