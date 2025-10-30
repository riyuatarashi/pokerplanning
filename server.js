const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Application & server
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));

const MAX_CONNECTIONS = 50;
const sessions = {}; // sessionId -> { sessionName, clients, revealed, roundId }
const cleanupTimeouts = [];

function generateRoundId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 7); }
function generateId() { return uuidv4(); }
function getFibonacci() { return [1,2,3,5,8,13,21,34,55,89]; }

// Always-on server log emitter
function slogEmit(ioRef, ...args) {
  const printable = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  console.log('\x1b[35m🐾 [Server]\x1b[0m', printable);
  try { ioRef.emit('serverLog', { message: printable, ts: Date.now() }); } catch {/* noop */}
}

function computeConsensus(session) {
  const votes = Object.values(session.clients).map(c => c.vote).filter(v => v !== null && typeof v === 'number');
  if (!votes.length) return null;
  const first = votes[0];
  return votes.every(v => v === first) ? first : null;
}

function broadcastState(sessionId) {
  const session = sessions[sessionId];
  if (!session) { slogEmit(io, 'broadcastState:sessionNotFound', sessionId); return; }
  const payload = {};
  Object.keys(session.clients).forEach(id => {
    const c = session.clients[id];
    payload[id] = { displayName: c.displayName || `User ${id.slice(0,6)}`, vote: c.vote, hasVoted: c.vote !== null };
  });
  const consensus = session.revealed ? computeConsensus(session) : null;
  io.to(sessionId).emit('state', { revealed: session.revealed, votes: payload, sessionName: session.sessionName, roundId: session.roundId, consensus });
  slogEmit(io, 'broadcastState', sessionId, 'clients=', Object.keys(session.clients).length, 'revealed=', session.revealed, 'consensus=', consensus);
}

function logSessionState(label, sessionId) {
  const s = sessions[sessionId];
  if (!s) { slogEmit(io, label, sessionId, 'noSession'); return; }
  const clients = Object.keys(s.clients).length;
  const votesCount = Object.values(s.clients).filter(c => c.vote != null).length;
  slogEmit(io, label, sessionId, `name=${s.sessionName}`, `clients=${clients}`, `votes=${votesCount}`, `revealed=${s.revealed}`, `roundId=${s.roundId}`);
}

function scheduleSessionCleanup(sessionId) {
  if (process.env.NODE_ENV === 'test') return;
  const timeoutId = setTimeout(() => {
    if (sessions[sessionId] && Object.keys(sessions[sessionId].clients).length === 0) {
      delete sessions[sessionId];
      slogEmit(io, 'sessionCleaned', sessionId);
    }
  }, 60 * 60 * 1000);
  cleanupTimeouts.push(timeoutId);
}
function clearCleanupTimeouts() { cleanupTimeouts.forEach(id => clearTimeout(id)); cleanupTimeouts.length = 0; }

// API endpoints
app.get('/api/fibonacci', (_req, res) => res.json({ values: getFibonacci() }));
app.post('/api/sessions', (_req, res) => { const sessionId = generateId(); res.json({ sessionId }); });

// Socket layer
io.on('connection', socket => {
  slogEmit(io, 'socketConnection', 'socketId='+socket.id, 'totalConnections='+io.of('/').sockets.size);

  // Connection limit
  const totalConnections = io.of('/').sockets.size;
  if (totalConnections > MAX_CONNECTIONS) {
    socket.emit('full', { message: 'Maximum number of connections reached. Please try again later.' });
    socket.disconnect(true);
    slogEmit(io, 'connectionRefused:maxConnections');
    return;
  }

  socket.on('createSession', ({ sessionName }) => {
    const sessionId = generateId();
    const roundId = generateRoundId();
    sessions[sessionId] = { sessionName: sessionName || 'Planning Session', clients: {}, revealed: false, roundId };
    slogEmit(io, 'createSession', sessionId, 'name='+sessions[sessionId].sessionName);
    socket.emit('sessionCreated', { sessionId, sessionName: sessions[sessionId].sessionName });
    logSessionState('afterCreate', sessionId);
  });

  socket.on('joinSession', ({ sessionId, clientId, displayName }) => {
    const normId = (sessionId||'').trim().toLowerCase();
    if (!normId || !sessions[normId]) {
      slogEmit(io, 'joinSessionFailed', sessionId, clientId, 'normalized='+normId, 'reason=sessionNotFound');
      socket.emit('error', { message: 'Session not found' });
      return;
    }
    socket.join(normId);
    socket.sessionId = normId;
    socket.clientId = clientId;
    const session = sessions[normId];
    if (session.clients[clientId]) {
      session.clients[clientId].socketId = socket.id;
      session.clients[clientId].displayName = displayName || session.clients[clientId].displayName;
      slogEmit(io, 'rejoinSession', normId, clientId, 'displayName='+session.clients[clientId].displayName);
    } else {
      session.clients[clientId] = { socketId: socket.id, vote: null, displayName: displayName || `User ${clientId.slice(0,6)}` };
      slogEmit(io, 'joinSession', normId, clientId, 'displayName='+session.clients[clientId].displayName);
    }
    socket.emit('sessionJoined', { sessionId: normId, sessionName: session.sessionName, roundId: session.roundId });
    broadcastState(normId);
    logSessionState('afterJoin', normId);
  });

  socket.on('updateDisplayName', ({ sessionId, clientId, displayName }) => {
    const session = sessions[sessionId];
    if (!session || !session.clients[clientId]) { slogEmit(io, 'updateDisplayNameFailed', sessionId, clientId); return; }
    session.clients[clientId].displayName = displayName;
    slogEmit(io, 'updateDisplayName', sessionId, clientId, 'new='+displayName);
    broadcastState(sessionId);
  });

  socket.on('updateSessionName', ({ sessionId, sessionName }) => {
    const session = sessions[sessionId];
    if (!session) { slogEmit(io, 'updateSessionNameFailed', sessionId); return; }
    session.sessionName = sessionName;
    slogEmit(io, 'updateSessionName', sessionId, 'new='+sessionName);
    broadcastState(sessionId);
  });

  socket.on('vote', ({ sessionId, clientId, value }) => {
    const session = sessions[sessionId];
    if (!session || !session.clients[clientId]) { slogEmit(io, 'voteFailed', sessionId, clientId); return; }
    // Suppression du blocage après reveal pour permettre l'ajustement des votes
    session.clients[clientId].vote = value;
    slogEmit(io, 'vote', sessionId, clientId, 'value='+value, 'revealed='+session.revealed);
    broadcastState(sessionId);
  });

  socket.on('reveal', ({ sessionId }) => {
    const session = sessions[sessionId];
    if (!session) { slogEmit(io, 'revealFailed', sessionId); return; }
    session.revealed = true;
    slogEmit(io, 'reveal', sessionId);
    broadcastState(sessionId);
    logSessionState('afterReveal', sessionId);
  });

  socket.on('reset', ({ sessionId }) => {
    const session = sessions[sessionId];
    if (!session) { slogEmit(io, 'resetFailed', sessionId); return; }
    Object.keys(session.clients).forEach(id => { session.clients[id].vote = null; });
    session.revealed = false;
    session.roundId = generateRoundId();
    slogEmit(io, 'reset', sessionId, 'newRoundId='+session.roundId);
    broadcastState(sessionId);
    logSessionState('afterReset', sessionId);
  });

  socket.on('leaveSession', ({ sessionId, clientId }) => {
    const normId = (sessionId||'').trim().toLowerCase();
    const session = sessions[normId];
    if (!session || !session.clients[clientId]) { slogEmit(io, 'leaveSessionFailed', normId, clientId); return; }
    delete session.clients[clientId];
    socket.leave(normId);
    slogEmit(io, 'leaveSession', normId, clientId);
    if (Object.keys(session.clients).length === 0) {
      scheduleSessionCleanup(normId);
      slogEmit(io, 'scheduleCleanup', normId);
    }
    broadcastState(normId);
    logSessionState('afterLeave', normId);
  });

  socket.on('disconnect', () => {
    const sessionId = socket.sessionId;
    const clientId = socket.clientId;
    slogEmit(io, 'disconnectEvent', sessionId, clientId);
    if (sessionId && sessions[sessionId] && clientId) {
      delete sessions[sessionId].clients[clientId];
      if (Object.keys(sessions[sessionId].clients).length === 0) {
        scheduleSessionCleanup(sessionId);
        slogEmit(io, 'scheduleCleanup', sessionId);
      }
      broadcastState(sessionId);
      logSessionState('afterDisconnect', sessionId);
    }
  });
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => console.log(`PokerPlanning server is running on port ${PORT}`));
}

module.exports = { app, server, getFibonacci, sessions, clearCleanupTimeouts };
