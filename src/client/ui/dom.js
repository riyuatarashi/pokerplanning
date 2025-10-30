/** UI & DOM helpers */
import { state } from '../core/state.js';
import { log } from '../core/logger.js';

export const refs = {};

export function cacheRefs() {
  Object.assign(refs, {
    setupScreen: document.getElementById('setupScreen'),
    pokerScreen: document.getElementById('pokerScreen'),
    displayNameInput: document.getElementById('displayNameInput'),
    createSessionBtn: document.getElementById('createSessionBtn'),
    joinSessionBtn: document.getElementById('joinSessionBtn'),
    sessionIdInput: document.getElementById('sessionIdInput'),
    sessionNameModal: document.getElementById('sessionNameModal'),
    sessionNameInput: document.getElementById('sessionNameInput'),
    confirmSessionNameBtn: document.getElementById('confirmSessionNameBtn'),
    editNameModal: document.getElementById('editNameModal'),
    editModalTitle: document.getElementById('editModalTitle'),
    editNameInput: document.getElementById('editNameInput'),
    confirmEditBtn: document.getElementById('confirmEditBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    sessionNameDisplay: document.getElementById('sessionNameDisplay'),
    sessionIdDisplay: document.getElementById('sessionIdDisplay'),
    userDisplayName: document.getElementById('userDisplayName'),
    editSessionNameBtn: document.getElementById('editSessionNameBtn'),
    editDisplayNameBtn: document.getElementById('editDisplayNameBtn'),
    copySessionIdBtn: document.getElementById('copySessionIdBtn'),
    copyInviteLinkBtn: document.getElementById('copyInviteLinkBtn'),
    cardsContainer: document.getElementById('cards'),
    messageEl: document.getElementById('message'),
    resultsEl: document.getElementById('results'),
    revealBtn: document.getElementById('revealButton'),
    resetBtn: document.getElementById('resetButton'),
    statisticsEl: document.getElementById('statistics'),
    backToMenuBtn: document.getElementById('backToMenuBtn')
  });
}

/** Show the selected screen and hide the others. */
export function showScreen(el) {
  log('DOM:showScreen', el?.id);
  [refs.setupScreen, refs.pokerScreen].forEach(r => r && r.classList.remove('active'));
  el && el.classList.add('active');
}

/** Update header (session name, user name, and button enable states). */
export function updateHeader() {
  log('DOM:updateHeader', { sessionId: state.sessionId, sessionName: state.sessionName, joined: state.joined });
  if (refs.sessionNameDisplay) refs.sessionNameDisplay.textContent = state.sessionName || 'Planning Session';
  if (refs.sessionIdDisplay) refs.sessionIdDisplay.textContent = state.sessionId || '';
  if (refs.userDisplayName) refs.userDisplayName.textContent = state.displayName || 'User';
  toggleAvailability(refs.copyInviteLinkBtn, !!state.sessionId);
  toggleAvailability(refs.revealBtn, state.joined);
  toggleAvailability(refs.resetBtn, state.joined);
  toggleAvailability(refs.backToMenuBtn, state.joined);
}

function toggleAvailability(btn, enabled) {
  log('DOM:toggleAvailability', btn?.id, enabled);
  if (!btn) return;
  enabled ? btn.removeAttribute('disabled') : btn.setAttribute('disabled', 'disabled');
}

/** Display a transient toast notification. */
export function toast(message, type = 'success') {
  log('DOM:toast', type, message);
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
  document.body.appendChild(div);
  setTimeout(() => { div.style.animation = 'slideInRight 0.3s reverse'; setTimeout(() => div.remove(), 300); }, 3000);
}

/** Clear selection on all cards. */
export function clearCardSelection() {
  document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
}

/** Restore the previously selected card (if any). */
export function restoreSelection() {
  if (state.selectedValue == null) return;
  const card = document.querySelector(`.card[data-value="${state.selectedValue}"]`);
  if (card) { clearCardSelection(); card.classList.add('selected'); }
}
