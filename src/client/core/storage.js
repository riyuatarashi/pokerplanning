/**
 * Storage abstraction
 */
import { state, LS_KEYS, generateClientId } from './state.js';
import { log } from './logger.js';

function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key, val) { try { localStorage.setItem(key, val); } catch { /* empty */ } }
function safeRemove(key) { try { localStorage.removeItem(key); } catch { /* empty */ } }

export const Storage = {
  /** Initialize state from localStorage. */
  loadInitial() {
    log('Storage:loadInitial');
    state.clientId = safeGet(LS_KEYS.CLIENT_ID) || generateClientId();
    safeSet(LS_KEYS.CLIENT_ID, state.clientId);
    state.displayName = safeGet(LS_KEYS.DISPLAY_NAME) || '';
    state.sessionId = safeGet(LS_KEYS.SESSION_ID) || null;
    state.sessionName = safeGet(LS_KEYS.SESSION_NAME) || '';
  },
  /** Persist current session id and name. */
  persistSession() {
    log('Storage:persistSession', state.sessionId);
    if (!state.sessionId) { return; }
    safeSet(LS_KEYS.SESSION_ID, state.sessionId);
    safeSet(LS_KEYS.SESSION_NAME, state.sessionName);
  },
  /** Update and persist the display name. */
  setDisplayName(name) {
    log('Storage:setDisplayName', name);
    state.displayName = name;
    safeSet(LS_KEYS.DISPLAY_NAME, name);
  },
  /** Clear stored session id and name. */
  clearSession() { safeRemove(LS_KEYS.SESSION_ID); safeRemove(LS_KEYS.SESSION_NAME); },
  voteKey(sessionId, roundId) { return `vote_${sessionId}_${roundId}`; },
  /** Save the local vote (or remove if null). */
  saveVote(sessionId, roundId, value) {
    log('Storage:saveVote', sessionId, roundId, value);
    if (!sessionId || !roundId) { return; }
    const k = this.voteKey(sessionId, roundId);
    if (value === null || value === undefined) { safeRemove(k); } else { safeSet(k, String(value)); }
  },
  /** Retrieve the stored local vote value (number or null). */
  getVote(sessionId, roundId) {
    log('Storage:getVote', sessionId, roundId);
    if (!sessionId || !roundId) { return null; }
    const raw = safeGet(this.voteKey(sessionId, roundId));
    if (raw === null || raw === 'null') { return null; }
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  }
};
