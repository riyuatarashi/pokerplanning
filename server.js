const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

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
 * In‑memory state representing each connected client and their vote.
 * The key is the clientId supplied by the browser. Each entry contains
 * the socket ID and the vote value (null if not voted yet).
 *
 * Example:
 * {
 *   'abc123': { socketId: '<socket-id>', vote: 5 },
 *   'def456': { socketId: '<socket-id>', vote: null },
 * }
 */
const clients = {};

// Whether the current round has been revealed
let revealed = false;

/**
 * Compute the Fibonacci sequence up to a given length. Returns an array of
 * numbers starting at 0. The default set covers a typical planning poker
 * sequence. If the length is greater than the available values, it will
 * continue summing the last two numbers.
 * @param {number} length Number of Fibonacci values to generate
 */
function getFibonacci(length = 10) {
  const seq = [0, 1];
  while (seq.length < length) {
    const next = seq[seq.length - 1] + seq[seq.length - 2];
    seq.push(next);
  }
  return seq;
}

// HTTP endpoint to retrieve the Fibonacci sequence values for clients
app.get('/api/fibonacci', (_req, res) => {
  res.json({ values: getFibonacci(10) });
});

/**
 * Send the current state to all clients. If the round has been revealed,
 * send each client's vote; otherwise send only whether a user has voted or not.
 */
function broadcastState() {
  const payload = {};
  Object.keys(clients).forEach((id) => {
    if (revealed) {
      payload[id] = clients[id].vote;
    } else {
      // mask the actual value until reveal
      payload[id] = clients[id].vote !== null;
    }
  });
  io.emit('state', { revealed, votes: payload });
}

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

  // A client joins with an ID stored in localStorage. If the ID is new,
  // add it to the clients map; if it exists, update the socket ID.
  socket.on('join', (clientId) => {
    if (!clientId) return;
    // If this client ID already exists, update the socket ID
    if (clients[clientId]) {
      clients[clientId].socketId = socket.id;
    } else {
      clients[clientId] = { socketId: socket.id, vote: null };
    }
    broadcastState();
  });

  // A client submits their vote (one of the Fibonacci numbers)
  socket.on('vote', ({ clientId, value }) => {
    if (!clientId || !(clientId in clients)) return;
    clients[clientId].vote = value;
    broadcastState();
  });

  // Trigger reveal: show all votes to everyone
  socket.on('reveal', () => {
    revealed = true;
    broadcastState();
  });

  // Reset the round: clear all votes and hide values again
  socket.on('reset', () => {
    Object.keys(clients).forEach((id) => {
      clients[id].vote = null;
    });
    revealed = false;
    broadcastState();
  });

  // Handle client disconnect: remove the client from the state
  socket.on('disconnect', () => {
    const id = Object.keys(clients).find(
      (key) => clients[key].socketId === socket.id
    );
    if (id) {
      delete clients[id];
      broadcastState();
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`PokerPlanning server is running on port ${PORT}`);
});

module.exports = { app, server, getFibonacci, clients };