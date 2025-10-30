/** Socket event wiring */
const { sessions, generateRoundId, broadcastState, logSessionState, scheduleSessionCleanup } = require('./sessions');
const { createLogger } = require('./logger');
const { MAX_CONNECTIONS } = require('./constants');
const { v4: uuidv4 } = require('uuid');

function attachSocketHandlers(io) {
  const logger = createLogger(io);
  io.on('connection', (socket) => {
    logger.logGlobal('socketConnection', 'socketId='+socket.id, 'total='+io.of('/').sockets.size);

    if (io.of('/').sockets.size > MAX_CONNECTIONS) {
      socket.emit('full', { message: 'Maximum number of connections reached. Please try again later.' });
      socket.disconnect(true);
      logger.logGlobal('connectionRefused:maxConnections');
      return;
    }

    socket.on('createSession', ({ sessionName }) => {
      const sessionId = uuidv4();
      const roundId = generateRoundId();
      sessions[sessionId] = { sessionName: sessionName || 'Planning Session', clients: {}, revealed: false, roundId };
      socket.emit('sessionCreated', { sessionId, sessionName: sessions[sessionId].sessionName });
      socket.emit('serverLog', { message: `createSession ${sessionId} name=${sessions[sessionId].sessionName}`, ts: Date.now() });
      logger.logSession(sessionId, 'createSession', 'name='+sessions[sessionId].sessionName);
      logSessionState(io, logger, 'afterCreate', sessionId);
    });

    socket.on('joinSession', ({ sessionId, clientId, displayName }) => {
      const normId = (sessionId||'').trim().toLowerCase();
      if (!normId || !sessions[normId]) {
        socket.emit('error', { message: 'Session not found' });
        socket.emit('serverLog', { message: `joinSessionFailed ${sessionId} normalized=${normId}`, ts: Date.now() });
        return;
      }
      socket.join(normId);
      socket.sessionId = normId;
      socket.clientId = clientId;
      const session = sessions[normId];
      if (session.clients[clientId]) {
        session.clients[clientId].socketId = socket.id;
        session.clients[clientId].displayName = displayName || session.clients[clientId].displayName;
        logger.logSession(normId, 'rejoinSession', clientId, 'displayName='+session.clients[clientId].displayName);
      } else {
        session.clients[clientId] = { socketId: socket.id, vote: null, displayName: displayName || `User ${clientId.slice(0,6)}` };
        logger.logSession(normId, 'joinSession', clientId, 'displayName='+session.clients[clientId].displayName);
      }
      socket.emit('sessionJoined', { sessionId: normId, sessionName: session.sessionName, roundId: session.roundId });
      broadcastState(io, normId);
      logSessionState(io, logger, 'afterJoin', normId);
    });

    socket.on('updateDisplayName', ({ sessionId, clientId, displayName }) => {
      const s = sessions[sessionId];
      if (!s || !s.clients[clientId]) return;
      s.clients[clientId].displayName = displayName;
      logger.logSession(sessionId, 'updateDisplayName', clientId, 'new='+displayName);
      broadcastState(io, sessionId);
    });

    socket.on('updateSessionName', ({ sessionId, sessionName }) => {
      const s = sessions[sessionId];
      if (!s) return;
      s.sessionName = sessionName;
      logger.logSession(sessionId, 'updateSessionName', 'new='+sessionName);
      broadcastState(io, sessionId);
    });

    socket.on('vote', ({ sessionId, clientId, value }) => {
      const s = sessions[sessionId];
      if (!s || !s.clients[clientId]) return;
      s.clients[clientId].vote = value;
      logger.logSession(sessionId, 'vote', clientId, 'value='+value, 'revealed='+s.revealed);
      broadcastState(io, sessionId);
    });

    socket.on('reveal', ({ sessionId }) => {
      const s = sessions[sessionId];
      if (!s) return;
      s.revealed = true;
      logger.logSession(sessionId, 'reveal');
      broadcastState(io, sessionId);
      logSessionState(io, logger, 'afterReveal', sessionId);
    });

    socket.on('reset', ({ sessionId }) => {
      const s = sessions[sessionId];
      if (!s) return;
      Object.keys(s.clients).forEach(id => { s.clients[id].vote = null; });
      s.revealed = false; s.roundId = generateRoundId();
      logger.logSession(sessionId, 'reset', 'newRoundId='+s.roundId);
      broadcastState(io, sessionId);
      logSessionState(io, logger, 'afterReset', sessionId);
    });

    socket.on('leaveSession', ({ sessionId, clientId }) => {
      const normId = (sessionId||'').trim().toLowerCase();
      const s = sessions[normId];
      if (!s || !s.clients[clientId]) return;
      delete s.clients[clientId];
      socket.leave(normId);
      logger.logSession(normId, 'leaveSession', clientId);
      if (Object.keys(s.clients).length === 0) {
        scheduleSessionCleanup(io, logger, normId);
        logger.logSession(normId, 'scheduleCleanup');
      }
      broadcastState(io, normId);
      logSessionState(io, logger, 'afterLeave', normId);
    });

    socket.on('disconnect', () => {
      const sessionId = socket.sessionId;
      const clientId = socket.clientId;
      if (sessionId && sessions[sessionId] && clientId) {
        delete sessions[sessionId].clients[clientId];
        logger.logSession(sessionId, 'disconnectEvent', clientId);
        if (Object.keys(sessions[sessionId].clients).length === 0) {
          scheduleSessionCleanup(io, logger, sessionId);
          logger.logSession(sessionId, 'scheduleCleanup');
        }
        broadcastState(io, sessionId);
        logSessionState(io, logger, 'afterDisconnect', sessionId);
      } else {
        logger.logGlobal('disconnectNoSession', clientId || 'unknown');
      }
    });
  });
}
module.exports = { attachSocketHandlers };
