/** Session state & helpers (readable version) */
const { CLEANUP_DELAY_MS } = require('./constants');
const { v4: uuidv4 } = require('uuid');

// In-memory sessions: sessions[sessionId] = { sessionName, clients, revealed, roundId, cleanupTimeout? }
const sessions = {}; // client: { socketId, vote:number|null, displayName }

// --- ID & consensus ----------------------------------------------------
/** Generate a robust round identifier (uuid v4 truncated) */
function generateRoundId() {
  // 12 hex chars without dashes (adequate uniqueness, low collision risk)
  return uuidv4().replace(/-/g, '').slice(0, 12);
}
/** Return session object or null */
function getSession(sessionId) { return sessions[sessionId] || null; }
/** If all numeric votes identical returns that number, else null */
function computeConsensus(session) {
  const votes = Object.values(session.clients).map(c => c.vote).filter(v => typeof v === 'number');
  if (votes.length === 0) { return null; }
  return new Set(votes).size === 1 ? votes[0] : null;
}

// --- Payload building --------------------------------------------------
function buildVotesPayload(session) {
  const out = {};
  for (const id of Object.keys(session.clients)) {
    const c = session.clients[id];
    out[id] = {
      displayName: c.displayName || `User ${id.slice(0, 6)}`,
      vote: c.vote,
      hasVoted: c.vote !== null && c.vote !== undefined
    };
  }
  return out;
}

// --- Broadcasting & logging -------------------------------------------
function broadcastState(io, sessionId) {
  const session = getSession(sessionId);
  if (!session) {return;}
  io.to(sessionId).emit('state', {
    revealed: session.revealed,
    votes: buildVotesPayload(session),
    sessionName: session.sessionName,
    roundId: session.roundId,
    consensus: session.revealed ? computeConsensus(session) : null
  });
}
function logSessionState(io, logger, label, sessionId) {
  const s = getSession(sessionId);
  if (!s) { logger.logGlobal(label, sessionId, 'noSession'); return; }
  const clients = Object.keys(s.clients).length;
  const votesCount = Object.values(s.clients).filter(c => c.vote !== null && c.vote !== undefined).length;
  logger.logSession(sessionId, label,
    `name=${s.sessionName}`,
    `clients=${clients}`,
    `votes=${votesCount}`,
    `revealed=${s.revealed}`,
    `roundId=${s.roundId}`
  );
}

// --- Cleanup -----------------------------------------------------------
function scheduleSessionCleanup(io, logger, sessionId) {
  const s = getSession(sessionId);
  if (!s) { return; }
  if (s.cleanupTimeout) { clearTimeout(s.cleanupTimeout); s.cleanupTimeout = null; }
  s.cleanupTimeout = setTimeout(() => {
    const current = getSession(sessionId);
    if (current && Object.keys(current.clients).length === 0) {
      delete sessions[sessionId];
      logger.logGlobal('sessionCleaned', sessionId);
    }
  }, CLEANUP_DELAY_MS);
}
function clearCleanupTimeouts() {
  Object.values(sessions).forEach(s => {
    if (s.cleanupTimeout) { clearTimeout(s.cleanupTimeout); s.cleanupTimeout = null; }
  });
}

// --- Exports -----------------------------------------------------------
module.exports = {
  sessions,
  generateRoundId,
  broadcastState,
  logSessionState,
  scheduleSessionCleanup,
  clearCleanupTimeouts,
  // Internal helpers (kept for testability)
  _getSession: getSession,
  _buildVotesPayload: buildVotesPayload,
  _computeConsensus: computeConsensus,
};
