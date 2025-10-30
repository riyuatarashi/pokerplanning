const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Create Express application
const app = express();
const server = http.createServer(app);

// Create a new socket.io server and allow CORS for development
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Serve static files from the public directory
app.use(express.static('public'));

// Maximum number of simultaneous anonymous connections allowed
const MAX_CONNECTIONS = 50;

/**
 * In-memory state representing multiple poker planning sessions.
 * Each session has:
 * - sessionId: unique identifier
 * - sessionName: friendly name for the session
 * - clients: map of clientId -> { socketId, vote, displayName }
 * - revealed: whether votes are revealed
 *
 * Example:
 * {
 *   'session-abc': {
 *     sessionName: 'Sprint 42 Planning',
 *     clients: {
 *       'client-123': { socketId: 'socket-xyz', vote: 5, displayName: 'Alice' },
 *     },
 *     revealed: false
 *   }
 * }
 */
const sessions = {};

/**
 * Generate a simple round ID for vote tracking
 */
function generateRoundId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Return the standard planning poker Fibonacci sequence.
 * Starts at 1 and includes common values used in planning poker.
 */
function getFibonacci() {
  return [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
}

// HTTP endpoint to retrieve the Fibonacci sequence values for clients
app.get('/api/fibonacci', (_req, res) => {
  res.json({ values: getFibonacci() });
});

// HTTP endpoint to generate a unique session ID
app.post('/api/sessions', (_req, res) => {
  const sessionId = generateId();
  res.json({ sessionId });
});

/**
 * Generate a random unique identifier using UUID v4
 */
function generateId() {
  return uuidv4();
}

/**
 * Compute the consensus value for a session.
 * If all votes are the same, return that value; otherwise, return null.
 */
function computeConsensus(session) {
  const votes = Object.values(session.clients)
    .map(c => c.vote)
    .filter(v => v !== null && typeof v === 'number');
  if (!votes.length) return null;
  const first = votes[0];
  return votes.every(v => v === first) ? first : null;
}

/**
 * Send the current state to all clients in a specific session.
 * @param {string} sessionId The session identifier
 */
function broadcastState(sessionId) {
  const session = sessions[sessionId];
  if (!session) return;

  const payload = {};
  Object.keys(session.clients).forEach((id) => {
    const client = session.clients[id];
    payload[id] = {
      displayName: client.displayName || `User ${id.slice(0, 6)}`,
      vote: client.vote,
      hasVoted: client.vote !== null
    };
  });
  const consensus = session.revealed ? computeConsensus(session) : null;
  io.to(sessionId).emit('state', {
    revealed: session.revealed,
    votes: payload,
    sessionName: session.sessionName,
    roundId: session.roundId,
    consensus
  });
}

const cleanupTimeouts = [];
function scheduleSessionCleanup(sessionId) {
  if (process.env.NODE_ENV === 'test') return; // skip long timers during tests
  const timeoutId = setTimeout(() => {
    if (sessions[sessionId] && Object.keys(sessions[sessionId].clients).length === 0) {
      delete sessions[sessionId];
    }
  }, 60 * 60 * 1000);
  cleanupTimeouts.push(timeoutId);
}
function clearCleanupTimeouts() { cleanupTimeouts.forEach(id => clearTimeout(id)); cleanupTimeouts.length = 0; }

io.on('connection', (socket) => {
  // Enforce connection limit
  const totalConnections = io.of('/').sockets.size;
  if (totalConnections > MAX_CONNECTIONS) {
    socket.emit('full', {
      message: 'Maximum number of connections reached. Please try again later.',
    });
    socket.disconnect(true);
    return;
  }

  // Create or join a session
  socket.on('createSession', ({ sessionName }) => {
    const sessionId = generateId();
    const roundId = generateRoundId();
    sessions[sessionId] = {
      sessionName: sessionName || 'Planning Session',
      clients: {},
      revealed: false,
      roundId: roundId
    };
    socket.emit('sessionCreated', { sessionId, sessionName: sessions[sessionId].sessionName });
  });

  // Join an existing session
  socket.on('joinSession', ({ sessionId, clientId, displayName }) => {
    if (!sessionId || !sessions[sessionId]) {
      socket.emit('error', { message: 'Session not found' });
      return;
    }
    
    socket.join(sessionId);
    socket.sessionId = sessionId;
    socket.clientId = clientId;
    
    const session = sessions[sessionId];
    if (session.clients[clientId]) {
      session.clients[clientId].socketId = socket.id;
      session.clients[clientId].displayName = displayName || session.clients[clientId].displayName;
    } else {
      session.clients[clientId] = { 
        socketId: socket.id, 
        vote: null,
        displayName: displayName || `User ${clientId.slice(0, 6)}`
      };
    }
    
    socket.emit('sessionJoined', { 
      sessionId, 
      sessionName: session.sessionName,
      roundId: session.roundId
    });
    broadcastState(sessionId);
  });

  // Update display name
  socket.on('updateDisplayName', ({ sessionId, clientId, displayName }) => {
    const session = sessions[sessionId];
    if (!session || !session.clients[clientId]) return;
    
    session.clients[clientId].displayName = displayName;
    broadcastState(sessionId);
  });

  // Update session name
  socket.on('updateSessionName', ({ sessionId, sessionName }) => {
    const session = sessions[sessionId];
    if (!session) return;
    
    session.sessionName = sessionName;
    broadcastState(sessionId);
  });

  // A client submits their vote (one of the Fibonacci numbers)
  socket.on('vote', ({ sessionId, clientId, value }) => {
    const session = sessions[sessionId];
    if (!session || !session.clients[clientId]) return;
    if (session.revealed) return; // block voting after reveal until reset
    session.clients[clientId].vote = value;
    broadcastState(sessionId);
  });

  // Trigger reveal: show all votes to everyone
  socket.on('reveal', ({ sessionId }) => {
    const session = sessions[sessionId];
    if (!session) return;
    
    session.revealed = true;
    broadcastState(sessionId);
  });

  // Reset the round: clear all votes and hide values again
  socket.on('reset', ({ sessionId }) => {
    const session = sessions[sessionId];
    if (!session) return;
    
    Object.keys(session.clients).forEach((id) => {
      session.clients[id].vote = null;
    });
    session.revealed = false;
    session.roundId = generateRoundId(); // Generate new round ID
    broadcastState(sessionId);
  });

  // Handle client disconnect: remove the client from the session
  socket.on('disconnect', () => {
    const sessionId = socket.sessionId;
    const clientId = socket.clientId;
    
    if (sessionId && sessions[sessionId] && clientId) {
      delete sessions[sessionId].clients[clientId];
      
      // Clean up empty sessions after 1 hour of inactivity
      if (Object.keys(sessions[sessionId].clients).length === 0) {
        scheduleSessionCleanup(sessionId);
      }
      
      broadcastState(sessionId);
    }
  });
});

// Start the server only if not running under test environment
const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`PokerPlanning server is running on port ${PORT}`);
  });
}

module.exports = { app, server, getFibonacci, sessions, clearCleanupTimeouts };
