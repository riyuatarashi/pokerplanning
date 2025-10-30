/** Voting feature */
import { state } from '../core/state.js';
import { Storage } from '../core/storage.js';
import { refs, clearCardSelection, restoreSelection, toast } from '../ui/dom.js';
import { computeStats } from '../core/statistics.js';
import { log } from '../core/logger.js';

let socket;
export function attachVoteSocket(s) { socket = s; }

export const Vote = {
  loadCards() {
    log('Vote:loadCards');
    if (!refs.cardsContainer) return;
    fetch('/api/fibonacci').then(r => r.json()).then(d => this.renderCards(d.values)).catch(() => toast('Failed to load cards', 'error'));
  },
  renderCards(values) {
    log('Vote:renderCards', values);
    refs.cardsContainer.innerHTML = '';
    values.forEach(v => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.value = v;
      card.textContent = v;
      if (state.selectedValue === v) card.classList.add('selected');
      // Suppression de la désactivation après reveal
      card.addEventListener('click', () => this.select(v));
      refs.cardsContainer.appendChild(card);
    });
  },
  select(value) {
    log('Vote:select', value);
    // Autoriser le changement même si revealed
    state.selectedValue = value;
    clearCardSelection();
    const el = document.querySelector(`.card[data-value="${value}"]`);
    el && el.classList.add('selected');
    socket && socket.emit('vote', { sessionId: state.sessionId, clientId: state.clientId, value });
    Storage.saveVote(state.sessionId, state.roundId, value);
  },
  restoreVote() {
    log('Vote:restoreVote');
    const stored = Storage.getVote(state.sessionId, state.roundId);
    if (stored != null) {
      state.selectedValue = stored;
      restoreSelection();
      socket && socket.emit('vote', { sessionId: state.sessionId, clientId: state.clientId, value: stored });
    }
  },
  renderState({ revealed, votes, sessionName, roundId, consensus }) {
    log('Vote:renderState', { revealed, roundId, consensus, votes: Object.keys(votes).length });
    state.revealed = revealed;
    if (sessionName && sessionName !== state.sessionName) state.sessionName = sessionName;
    if (roundId && roundId !== state.roundId) {
      state.roundId = roundId;
      state.selectedValue = null;
      state.revealed = false;
      clearCardSelection();
    }
    // Ne désactive plus les cartes après reveal
    // document.querySelectorAll('.card').forEach(c => c.classList.toggle('disabled', revealed));

    if (!refs.resultsEl) return;
    refs.resultsEl.innerHTML = '';
    // Préparation tri: votés d'abord si non révélé
    let entries = Object.entries(votes);
    if (!revealed) {
      entries.sort((a,b) => (b[1].hasVoted ? 1 : 0) - (a[1].hasVoted ? 1 : 0));
    }
    entries.forEach(([id, data]) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      if (!revealed) item.classList.add(data.hasVoted ? 'voted' : 'waiting');
      const userDiv = document.createElement('div');
      userDiv.className = 'result-user';
      const statusDot = `<span class="vote-status-dot ${data.hasVoted ? 'voted' : 'waiting'}"></span>`;
      userDiv.innerHTML = `${statusDot} <i class="fas fa-user"></i> ${data.displayName}`;
      const voteDiv = document.createElement('div');
      voteDiv.className = 'result-vote';
      if (revealed) {
        voteDiv.textContent = data.vote != null ? data.vote : '\u2014';
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
    return; // Empêche l'ancien bloc de création de résultats de s'exécuter

    let banner = document.getElementById('consensusBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'consensusBanner';
      banner.className = 'consensus-banner hidden';
      refs.resultsEl.parentElement && refs.resultsEl.parentElement.insertBefore(banner, refs.resultsEl);
    }
    if (revealed && consensus != null) {
      banner.textContent = `Consensus reached: ${consensus}`;
      banner.classList.remove('hidden');
    } else banner.classList.add('hidden');

    if (refs.statisticsEl) {
      if (revealed) {
        const stats = computeStats(votes);
        if (stats) {
          refs.statisticsEl.innerHTML = `
            <div class="stat-card"><i class="fas fa-arrow-down"></i><div><div class="stat-label">Min</div><div class="stat-value">${stats.min}</div></div></div>
            <div class="stat-card"><i class="fas fa-chart-line"></i><div><div class="stat-label">Avg</div><div class="stat-value">${stats.avg}</div></div></div>
            <div class="stat-card"><i class="fas fa-arrow-up"></i><div><div class="stat-label">Max</div><div class="stat-value">${stats.max}</div></div></div>
            <div class="stat-card"><i class="fas fa-users"></i><div><div class="stat-label">Votes</div><div class="stat-value">${stats.count}</div></div></div>`;
          refs.statisticsEl.classList.remove('hidden');
        }
      } else refs.statisticsEl.classList.add('hidden');
    }
  }
};
