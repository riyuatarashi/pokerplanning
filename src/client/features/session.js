/** Session feature */
import { state } from '../core/state.js';
import { Storage } from '../core/storage.js';
import { Vote } from './vote.js';
import { updateHeader, showScreen, refs, toast } from '../ui/dom.js';
import { log } from '../core/logger.js';

let socket;
export function attachSessionSocket(s) { socket = s; }

function setSessionQuery(sessionId) {
  if (!sessionId) return;
  try {
    const url = new URL(location.href);
    if (url.searchParams.get('session') === sessionId) return; // déjà à jour
    url.searchParams.set('session', sessionId);
    history.replaceState(null, '', url.toString());
    log('URL updated with session', sessionId);
  } catch (e) { log('Failed to update URL', e); }
}
function clearSessionQuery() {
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has('session')) return;
    url.searchParams.delete('session');
    const newUrl = url.pathname + (url.search ? url.search : '') + url.hash;
    history.replaceState(null, '', newUrl);
    log('Session param removed from URL');
  } catch (e) { log('Failed to clear URL param', e); }
}

export const Session = {
  /** Create a new session on the server. */
  create(name) { log('Session:create', name); socket && socket.emit('createSession', { sessionName: name }); },
  /** Join a session (ID normalized to lowercase, trimmed). */
  join(id) { const norm = (id||'').trim().toLowerCase(); log('Session:join', id, 'normalized='+norm); socket && socket.emit('joinSession', { sessionId: norm, clientId: state.clientId, displayName: state.displayName }); },
  /** Leave the current session (retain sessionId for quick rejoin/sharing). */
  leave() {
    if (!state.sessionId || !state.joined) { log('Session:leave:noop'); return; }
    const sid = state.sessionId;
    socket && socket.emit('leaveSession', { sessionId: sid, clientId: state.clientId });
    state.joined = false;
    state.revealed = false;
    state.roundId = null;
    state.selectedValue = null;
    clearSessionQuery(); // retire ?session= de l’URL
    toast('You left the session', 'success');
    updateHeader();
    showScreen(refs.setupScreen);
    log('Session:leave:done', sid);
  },
  /** Register socket listeners for session lifecycle and state updates. */
  registerEvents() {
    if (!socket) return;
    socket.on('sessionCreated', ({ sessionId, sessionName }) => {
      const norm = (sessionId||'').trim().toLowerCase();
      log('Socket:sessionCreated', sessionId, 'normalized='+norm, sessionName);
      state.sessionId = norm;
      state.sessionName = sessionName;
      Storage.persistSession();
      this.join(norm);
    });
    socket.on('sessionJoined', ({ sessionId, sessionName, roundId }) => {
      const norm = (sessionId||'').trim().toLowerCase();
      log('Socket:sessionJoined', sessionId, 'normalized='+norm, sessionName, roundId);
      state.sessionId = norm;
      state.sessionName = sessionName;
      state.roundId = roundId;
      state.revealed = false;
      state.joined = true;
      Storage.persistSession();
      setSessionQuery(sessionId);
      updateHeader();
      showScreen(refs.pokerScreen);
      Vote.loadCards();
      setTimeout(() => Vote.restoreVote(), 75);
    });
    socket.on('state', data => {
      log('Socket:state', { revealed: data.revealed, roundId: data.roundId, votes: Object.keys(data.votes).length });
      Vote.renderState(data);
      if (data.votes[state.clientId]) {
        const sv = data.votes[state.clientId].vote;
        if (sv != null && sv !== state.selectedValue) {
          state.selectedValue = sv;
          Storage.saveVote(state.sessionId, state.roundId, sv);
        }
      }
    });
    socket.on('error', ({ message }) => {
      log('Socket:error', message);
      toast(message, 'error');
      if (/Session not found/i.test(message)) {
        clearSessionQuery();
        Storage.clearSession();
        Object.assign(state, { sessionId: null, sessionName: '', roundId: null, selectedValue: null, joined: false });
        showScreen(refs.setupScreen);
        updateHeader();
      }
    });
    socket.on('full', ({ message }) => {
      log('Socket:full', message);
      if (refs.messageEl) {
        refs.messageEl.textContent = message;
        refs.messageEl.classList.remove('hidden');
      }
      if (refs.revealBtn) refs.revealBtn.disabled = true;
      if (refs.resetBtn) refs.resetBtn.disabled = true;
    });
    socket.on('disconnect', () => {
      log('Socket:disconnect');
      toast('Connection lost. Reconnecting...', 'error')
    });
    socket.on('reconnect', () => {
      log('Socket:reconnect');
      toast('Reconnected successfully!', 'success')
    });
    socket.on('connect', () => {
      log('Socket:connect');
      // Auto-rejoin après refresh même si displayName vide (server fournira fallback)
      if (state.sessionId) this.join(state.sessionId);
    });
  }
};
