/** App orchestrator */
import { state } from './core/state.js'; // LS_KEYS removed
import { Storage } from './core/storage.js';
import { cacheRefs, refs, updateHeader, showScreen, toast } from './ui/dom.js';
import { Vote, attachVoteSocket } from './features/vote.js';
import { Session, attachSessionSocket } from './features/session.js';
import { log } from './core/logger.js';

/* global io */
function getQueryParam(name) { return new URLSearchParams(window.location.search).get(name); }
function wireEvents(socket) {
  if (refs.displayNameInput && state.displayName) { refs.displayNameInput.value = state.displayName; }
  refs.createSessionBtn?.addEventListener('click', () => {
    log('UI:createSessionBtn:click');
    const name = refs.displayNameInput?.value.trim();
    if (!name) { return toast('Please enter your display name', 'error'); }
    Storage.setDisplayName(name);
    refs.sessionNameModal?.classList.add('active');
    refs.sessionNameInput?.focus();
  });
  refs.confirmSessionNameBtn?.addEventListener('click', () => {
    log('UI:confirmSessionNameBtn:click');
    const sessionName = (refs.sessionNameInput?.value.trim() || 'Planning Session');
    refs.sessionNameModal?.classList.remove('active');
    Session.create(sessionName);
  });
  refs.sessionNameInput?.addEventListener('keypress', e => { if (e.key === 'Enter') { refs.confirmSessionNameBtn?.click(); } });
  refs.joinSessionBtn?.addEventListener('click', () => {
    log('UI:joinSessionBtn:click');
    const name = refs.displayNameInput?.value.trim();
    let sessionId = refs.sessionIdInput?.value.trim();
    if (!name) { return toast('Please enter your display name', 'error'); }
    if (!sessionId) { return toast('Please enter a session ID', 'error'); }
    sessionId = sessionId.toLowerCase();
    Storage.setDisplayName(name);
    Session.join(sessionId);
  });
  let editCallback = null;
  function showEdit(title, current, cb) {
    refs.editNameModal?.classList.add('active');
    if (refs.editModalTitle) { refs.editModalTitle.innerHTML = `<i class="fas fa-edit"></i> ${title}`; }
    if (refs.editNameInput) { refs.editNameInput.value = current; refs.editNameInput.focus(); refs.editNameInput.select(); }
    editCallback = cb;
  }
  refs.confirmEditBtn?.addEventListener('click', () => {
    const nv = refs.editNameInput?.value.trim();
    if (nv && editCallback) { editCallback(nv); }
    refs.editNameModal?.classList.remove('active');
    editCallback = null;
  });
  refs.cancelEditBtn?.addEventListener('click', () => { refs.editNameModal?.classList.remove('active'); editCallback = null; });
  refs.editNameInput?.addEventListener('keypress', e => {
    if (e.key === 'Enter') { refs.confirmEditBtn?.click(); }
    else if (e.key === 'Escape') { refs.cancelEditBtn?.click(); }
  });
  refs.editDisplayNameBtn?.addEventListener('click', () => {
    log('UI:editDisplayNameBtn:click');
    showEdit('Edit Display Name', state.displayName, nv => {
      Storage.setDisplayName(nv);
      updateHeader();
      socket.emit('updateDisplayName', { sessionId: state.sessionId, clientId: state.clientId, displayName: nv });
      toast('Display name updated');
    });
  });
  refs.editSessionNameBtn?.addEventListener('click', () => {
    log('UI:editSessionNameBtn:click');
    showEdit('Edit Session Name', state.sessionName, nv => {
      state.sessionName = nv;
      updateHeader();
      socket.emit('updateSessionName', { sessionId: state.sessionId, sessionName: nv });
      toast('Session name updated');
    });
  });
  refs.copySessionIdBtn?.addEventListener('click', () => {
    log('UI:copySessionIdBtn:click');
    if (!state.sessionId) { return toast('No session ID', 'error'); }
    navigator.clipboard.writeText(state.sessionId).then(() => { toast('Session ID copied'); }).catch(() => { toast('Copy failed', 'error'); });
  });
  refs.copyInviteLinkBtn?.addEventListener('click', () => {
    log('UI:copyInviteLinkBtn:click');
    if (!state.sessionId) { return toast('No session', 'error'); }
    const link = `${location.origin}?session=${state.sessionId}`;
    navigator.clipboard.writeText(link).then(() => { toast('Invite link copied'); }).catch(() => { toast('Copy failed', 'error'); });
  });
  refs.revealBtn?.addEventListener('click', () => {
    log('UI:revealBtn:click');
    if (!state.joined) { return toast('Join the session first', 'error'); }
    socket.emit('reveal', { sessionId: state.sessionId });
  });
  refs.resetBtn?.addEventListener('click', () => {
    log('UI:resetBtn:click');
    if (!state.joined) { return toast('Join the session first', 'error'); }
    state.selectedValue = null;
    Storage.saveVote(state.sessionId, state.roundId, null);
    socket.emit('reset', { sessionId: state.sessionId });
  });
  refs.backToMenuBtn?.addEventListener('click', () => {
    log('UI:backToMenuBtn:click');
    Session.leave();
  });
}
function init() {
  log('App:init');
  Storage.loadInitial();
  cacheRefs();
  const paramSession = getQueryParam('session');
  if (paramSession && (!state.sessionId || state.sessionId !== paramSession.trim().toLowerCase())) {
    state.sessionId = paramSession.trim().toLowerCase();
    log('Session param found', paramSession, 'normalized=' + state.sessionId);
  }
  updateHeader();
  const socket = io();
  log('Socket:init');
  socket.on('serverLog', ({ message, ts }) => { log('Socket:serverLog', new Date(ts).toISOString(), message); });
  attachVoteSocket(socket);
  attachSessionSocket(socket);
  wireEvents(socket);
  Session.registerEvents();
  Vote.loadCards();
  if (state.sessionId) {
    // waiting for connect event to rejoin
  } else {
    if (paramSession && refs.sessionIdInput) { refs.sessionIdInput.value = paramSession; }
    showScreen(refs.setupScreen);
    log('Show setup screen (no sessionId)');
  }
}
init();
window.PlanningPoker = { state };
