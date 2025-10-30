const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { getFibonacci } = require('./src/server/fibonacci');
const { sessions, clearCleanupTimeouts } = require('./src/server/sessions');
const { attachSocketHandlers } = require('./src/server/socket');

// Application & server
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));

// Lightweight API route
app.get('/api/fibonacci', (_req, res) => res.json({ values: getFibonacci() }));
app.post('/api/sessions', (_req, res) => res.json({ sessionId: require('uuid').v4() }));

attachSocketHandlers(io);

const BASE_PORT = parseInt(process.env.PORT || '3001', 10);
function startWithFallback(port=BASE_PORT) {
  server.listen(port).once('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying ${port+1}...`);
      startWithFallback(port+1);
    } else {
      throw err;
    }
  }).once('listening', () => console.log(`PokerPlanning server running on port ${port}`));
}
if (process.env.NODE_ENV !== 'test') startWithFallback();

module.exports = { app, server, getFibonacci, sessions, clearCleanupTimeouts };
