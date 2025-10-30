/** Voting feature */
import { state } from '../core/state.js';
import { Storage } from '../core/storage.js';
import { refs, clearCardSelection, restoreSelection, toast } from '../ui/dom.js';
import { computeStats } from '../core/statistics.js';
import { log } from '../core/logger.js';

let socket;
export function attachVoteSocket(s) { socket = s; }

export const Vote = {
  /** Load Fibonacci cards from API. */
  loadCards() {
    log('Vote:loadCards');
    if (!refs.cardsContainer) {return;}
    fetch('/api/fibonacci').then(r => r.json()).then(d => this.renderCards(d.values)).catch(() => toast('Failed to load cards', 'error'));
  },
  /** Render interactive planning cards. */
  renderCards(values) {
    log('Vote:renderCards', values);
    refs.cardsContainer.innerHTML = '';
    values.forEach(v => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.value = v;
      card.textContent = v;
      if (state.selectedValue === v) { card.classList.add('selected'); }
      card.addEventListener('click', () => { this.select(v); });
      refs.cardsContainer.appendChild(card);
    });
  },
  /** Select a value and send it to the server. */
  select(value) {
    log('Vote:select', value);
    // Allow changing vote even if revealed
    state.selectedValue = value;
    clearCardSelection();
    const el = document.querySelector(`.card[data-value="${value}"]`);
    if (el) { el.classList.add('selected'); }
    socket && socket.emit('vote', { sessionId: state.sessionId, clientId: state.clientId, value });
    Storage.saveVote(state.sessionId, state.roundId, value);
  },
  /** Restore previously stored vote if present. */
  restoreVote() {
    log('Vote:restoreVote');
    const stored = Storage.getVote(state.sessionId, state.roundId);
    if (stored !== null && stored !== undefined) {
      state.selectedValue = stored;
      restoreSelection();
      socket && socket.emit('vote', { sessionId: state.sessionId, clientId: state.clientId, value: stored });
    }
  },
  /** Render participants list, statistics, and consensus banner. */
  renderState({ revealed, votes, sessionName, roundId, consensus }) {
    log('Vote:renderState', { revealed, roundId, consensus, votes: Object.keys(votes).length });
    state.revealed = revealed;
    if (sessionName && sessionName !== state.sessionName) { state.sessionName = sessionName; }
    if (roundId && roundId !== state.roundId) {
      state.roundId = roundId;
      state.selectedValue = null;
      state.revealed = false;
      clearCardSelection();
    }
    if (!refs.resultsEl) { return; }

    // Prepare / update the consensus banner
    let banner = document.getElementById('consensusBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'consensusBanner';
      banner.className = 'consensus-banner hidden';
      refs.resultsEl.parentElement && refs.resultsEl.parentElement.insertBefore(banner, refs.resultsEl);
    }
    if (revealed && consensus !== null && consensus !== undefined) {
      banner.textContent = `Consensus reached: ${consensus}`;
      banner.classList.remove('hidden');
    } else { banner.classList.add('hidden'); }

    // Statistics
    if (refs.statisticsEl) {
      if (revealed) {
        const stats = computeStats(votes);
        if (stats) {
          // Construction DOM sécurisée au lieu de innerHTML
          while (refs.statisticsEl.firstChild) { refs.statisticsEl.removeChild(refs.statisticsEl.firstChild); }
          const cards = [
            { icon: 'fas fa-arrow-down', label: 'Min', value: stats.min },
            { icon: 'fas fa-chart-line', label: 'Avg', value: stats.avg },
            { icon: 'fas fa-arrow-up', label: 'Max', value: stats.max },
            { icon: 'fas fa-users', label: 'Votes', value: stats.count }
          ];
          cards.forEach(({ icon, label, value }) => {
            const card = document.createElement('div'); card.className = 'stat-card';
            const iconEl = document.createElement('i'); iconEl.className = icon; card.appendChild(iconEl);
            const wrap = document.createElement('div');
            const labelDiv = document.createElement('div'); labelDiv.className = 'stat-label'; labelDiv.textContent = label;
            const valueDiv = document.createElement('div'); valueDiv.className = 'stat-value'; valueDiv.textContent = String(value);
            wrap.appendChild(labelDiv); wrap.appendChild(valueDiv); card.appendChild(wrap);
            refs.statisticsEl.appendChild(card);
          });
          refs.statisticsEl.classList.remove('hidden');
        } else { refs.statisticsEl.classList.add('hidden'); }
      } else { refs.statisticsEl.classList.add('hidden'); }
    }

    // Rendu des participants (tri votés d'abord si non révélé)
    refs.resultsEl.innerHTML = '';
    const entries = Object.entries(votes);
    if (!revealed) { entries.sort((a, b) => (b[1].hasVoted ? 1 : 0) - (a[1].hasVoted ? 1 : 0)); }
    entries.forEach(([id, data]) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      item.dataset.clientId = id; // expose client id for potential tooling
      if (!revealed) { item.classList.add(data.hasVoted ? 'voted' : 'waiting'); }

      const userDiv = document.createElement('div');
      userDiv.className = 'result-user';
      const statusDotEl = document.createElement('span');
      statusDotEl.className = `vote-status-dot ${data.hasVoted ? 'voted' : 'waiting'}`;
      const userIconEl = document.createElement('i');
      userIconEl.className = 'fas fa-user';
      const displayNameEl = document.createElement('span');
      displayNameEl.className = 'display-name';
      displayNameEl.textContent = data.displayName;
      userDiv.appendChild(statusDotEl);
      userDiv.appendChild(userIconEl);
      userDiv.appendChild(displayNameEl);

      const voteDiv = document.createElement('div');
      voteDiv.className = 'result-vote';
      if (revealed) {
        voteDiv.textContent = (data.vote !== null && data.vote !== undefined) ? data.vote : '\u2014';
        voteDiv.classList.add('revealed');
      } else {
        voteDiv.textContent = data.hasVoted ? '\u2713' : '\u2014';
        voteDiv.classList.add('pending');
        voteDiv.classList.add(data.hasVoted ? 'voted' : 'waiting');
      }

      item.appendChild(userDiv);
      item.appendChild(voteDiv);
      refs.resultsEl.appendChild(item);
    });
  }
};
