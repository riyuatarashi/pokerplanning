/** Centralized server logger (dependency-injected) */
function format(args) {
  return args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
}
function createLogger(io) {
  function emit(room, parts) {
    const printable = format(parts);
    if (room) {
      console.log('\x1b[36m🐾 [Session:' + room + ']\x1b[0m', printable);
      try { io.to(room).emit('serverLog', { message: printable, ts: Date.now() }); } catch {}
    } else {
      console.log('\x1b[35m🐾 [Server]\x1b[0m', printable);
      try { io.emit('serverLog', { message: printable, ts: Date.now() }); } catch {}
    }
  }
  return {
    logGlobal: (...parts) => emit(null, parts),
    logSession: (sessionId, ...parts) => emit(sessionId, parts),
    format,
  };
}
module.exports = { createLogger };
