/* global io */

(() => {
  // Establish socket connection
  const socket = io();

  // Retrieve or generate anonymous client ID using UUID v4
  let clientId = localStorage.getItem('clientId');
  if (!clientId) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      clientId = crypto.randomUUID();
    } else {
      // Fallback UUID v4 implementation
      clientId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    localStorage.setItem('clientId', clientId);
  }

  // Retrieve display name from localStorage
  let displayName = localStorage.getItem('displayName') || '';

  // Current session state
  let currentSessionId = localStorage.getItem('currentSessionId') || null;
  let currentSessionName = localStorage.getItem('currentSessionName') || '';
  let currentRoundId = null;
  let selectedValue = null;

  // Save session state to localStorage
  function saveSessionState() {
    if (currentSessionId) {
      localStorage.setItem('currentSessionId', currentSessionId);
      localStorage.setItem('currentSessionName', currentSessionName);
    }
  }

  // Save vote for current round
  function saveVoteForRound() {
    if (currentSessionId && currentRoundId) {
      const voteKey = `vote_${currentSessionId}_${currentRoundId}`;
      if (selectedValue !== null) {
        console.log('Saving vote:', selectedValue, 'for round:', currentRoundId, 'key:', voteKey);
        localStorage.setItem(voteKey, selectedValue);
      } else {
        console.log('Removing vote for round:', currentRoundId);
        localStorage.removeItem(voteKey);
      }
    } else {
      console.log('Cannot save vote - sessionId:', currentSessionId, 'roundId:', currentRoundId);
    }
  }

  // Get vote for current round
  function getVoteForRound() {
    if (currentSessionId && currentRoundId) {
      const voteKey = `vote_${currentSessionId}_${currentRoundId}`;
      const storedVote = localStorage.getItem(voteKey);
      console.log('Getting vote for round:', currentRoundId, 'key:', voteKey, 'value:', storedVote);
      return storedVote && storedVote !== 'null' ? parseInt(storedVote) : null;
    }
    console.log('Cannot get vote - sessionId:', currentSessionId, 'roundId:', currentRoundId);
    return null;
  }

  // Clear session state from localStorage
  function clearSessionState() {
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem('currentSessionName');
    localStorage.removeItem('selectedVote');
  }

  // DOM elements - Setup screen
  const setupScreen = document.getElementById('setupScreen');
  const pokerScreen = document.getElementById('pokerScreen');
  const displayNameInput = document.getElementById('displayNameInput');
  const createSessionBtn = document.getElementById('createSessionBtn');
  const joinSessionBtn = document.getElementById('joinSessionBtn');
  const sessionIdInput = document.getElementById('sessionIdInput');
  
  // Session name modal
  const sessionNameModal = document.getElementById('sessionNameModal');
  const sessionNameInput = document.getElementById('sessionNameInput');
  const confirmSessionNameBtn = document.getElementById('confirmSessionNameBtn');
  
  // Edit name modal
  const editNameModal = document.getElementById('editNameModal');
  const editModalTitle = document.getElementById('editModalTitle');
  const editNameInput = document.getElementById('editNameInput');
  const confirmEditBtn = document.getElementById('confirmEditBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  let editCallback = null;
  
  // Poker screen elements
  const sessionNameDisplay = document.getElementById('sessionNameDisplay');
  const sessionIdDisplay = document.getElementById('sessionIdDisplay');
  const userDisplayName = document.getElementById('userDisplayName');
  const editSessionNameBtn = document.getElementById('editSessionNameBtn');
  const editDisplayNameBtn = document.getElementById('editDisplayNameBtn');
  const copySessionIdBtn = document.getElementById('copySessionIdBtn');
  const cardsContainer = document.getElementById('cards');
  const messageEl = document.getElementById('message');
  const resultsEl = document.getElementById('results');
  const revealBtn = document.getElementById('revealButton');
  const resetBtn = document.getElementById('resetButton');

  // Set initial display name if available
  if (displayName) {
    displayNameInput.value = displayName;
  }

  // Show toast notification
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Switch between screens
  function showScreen(screen) {
    setupScreen.classList.remove('active');
    pokerScreen.classList.remove('active');
    screen.classList.add('active');
  }

  // Show/hide modal
  function showModal(modal) {
    modal.classList.add('active');
  }

  function hideModal(modal) {
    modal.classList.remove('active');
  }

  // Create session button
  createSessionBtn.addEventListener('click', () => {
    const name = displayNameInput.value.trim();
    if (!name) {
      showToast('Please enter your display name', 'error');
      return;
    }
    displayName = name;
    localStorage.setItem('displayName', displayName);
    showModal(sessionNameModal);
    sessionNameInput.focus();
  });

  // Confirm session name and create
  confirmSessionNameBtn.addEventListener('click', () => {
    const sessionName = sessionNameInput.value.trim() || 'Planning Session';
    hideModal(sessionNameModal);
    socket.emit('createSession', { sessionName });
  });

  // Handle Enter key in session name input
  sessionNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmSessionNameBtn.click();
    }
  });

  // Join session button
  joinSessionBtn.addEventListener('click', () => {
    const name = displayNameInput.value.trim();
    const sessionId = sessionIdInput.value.trim();
    
    if (!name) {
      showToast('Please enter your display name', 'error');
      return;
    }
    if (!sessionId) {
      showToast('Please enter a session ID', 'error');
      return;
    }
    
    displayName = name;
    localStorage.setItem('displayName', displayName);
    socket.emit('joinSession', { sessionId, clientId, displayName });
  });

  // Show edit name modal
  function showEditModal(title, currentValue, callback) {
    editModalTitle.innerHTML = `<i class="fas fa-edit"></i> ${title}`;
    editNameInput.value = currentValue;
    editCallback = callback;
    showModal(editNameModal);
    editNameInput.focus();
    editNameInput.select();
  }

  // Confirm edit button
  confirmEditBtn.addEventListener('click', () => {
    const newValue = editNameInput.value.trim();
    if (newValue && editCallback) {
      editCallback(newValue);
    }
    hideModal(editNameModal);
    editCallback = null;
  });

  // Cancel edit button
  cancelEditBtn.addEventListener('click', () => {
    hideModal(editNameModal);
    editCallback = null;
  });

  // Handle Enter key in edit name input
  editNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmEditBtn.click();
    } else if (e.key === 'Escape') {
      cancelEditBtn.click();
    }
  });

  // Edit display name
  editDisplayNameBtn.addEventListener('click', () => {
    showEditModal('Edit Display Name', displayName, (newName) => {
      displayName = newName;
      localStorage.setItem('displayName', displayName);
      userDisplayName.textContent = displayName;
      socket.emit('updateDisplayName', { sessionId: currentSessionId, clientId, displayName });
      showToast('Display name updated');
    });
  });

  // Edit session name
  editSessionNameBtn.addEventListener('click', () => {
    showEditModal('Edit Session Name', currentSessionName, (newName) => {
      currentSessionName = newName;
      sessionNameDisplay.textContent = currentSessionName;
      socket.emit('updateSessionName', { sessionId: currentSessionId, sessionName: currentSessionName });
      showToast('Session name updated');
    });
  });

  // Copy session ID
  copySessionIdBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentSessionId)
      .then(() => showToast('Session ID copied to clipboard'))
      .catch(() => showToast('Failed to copy session ID', 'error'));
  });

  // Socket event: Session created
  socket.on('sessionCreated', ({ sessionId, sessionName }) => {
    currentSessionId = sessionId;
    currentSessionName = sessionName;
    saveSessionState();
    socket.emit('joinSession', { sessionId, clientId, displayName });
  });

  // Socket event: Session joined
  socket.on('sessionJoined', ({ sessionId, sessionName, roundId }) => {
    currentSessionId = sessionId;
    currentSessionName = sessionName;
    currentRoundId = roundId;
    sessionNameDisplay.textContent = sessionName;
    sessionIdDisplay.textContent = sessionId;
    userDisplayName.textContent = displayName;
    saveSessionState();
    showScreen(pokerScreen);
    
    // Restore selectedValue for this round from localStorage (AFTER roundId is set)
    const restoredVote = getVoteForRound();
    if (restoredVote !== null) {
      selectedValue = restoredVote;
      console.log('Restored vote:', selectedValue, 'for round:', currentRoundId);
    }
    
    loadCards();
    
    // Re-send vote to server after cards are loaded
    if (selectedValue !== null) {
      setTimeout(() => {
        console.log('Re-sending vote to server:', selectedValue);
        socket.emit('vote', { sessionId: currentSessionId, clientId, value: selectedValue });
      }, 100);
    }
  });

  // Handle reconnection
  socket.on('connect', () => {
    // If we have a stored session, try to rejoin
    if (currentSessionId && displayName) {
      socket.emit('joinSession', { sessionId: currentSessionId, clientId, displayName });
      // Vote restoration is handled in 'sessionJoined' event
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    showToast('Connection lost. Reconnecting...', 'error');
  });

  // Handle reconnection success
  socket.on('reconnect', () => {
    showToast('Reconnected successfully!', 'success');
  });

  // Socket event: Error
  socket.on('error', ({ message }) => {
    showToast(message, 'error');
    // If session not found, clear stored state and go back to setup
    if (message.includes('Session not found')) {
      clearSessionState();
      currentSessionId = null;
      currentSessionName = '';
      selectedValue = null;
      showScreen(setupScreen);
    }
  });

  // Socket event: Server full
  socket.on('full', ({ message }) => {
    messageEl.textContent = message;
    messageEl.classList.remove('hidden');
    revealBtn.disabled = true;
    resetBtn.disabled = true;
  });

  // Load Fibonacci cards
  function loadCards() {
    fetch('/api/fibonacci')
      .then((res) => res.json())
      .then((data) => {
        createCards(data.values);
      });
  }

  // Restore card selection visually
  function restoreCardSelection() {
    if (selectedValue !== null) {
      const card = document.querySelector(`.card[data-value="${selectedValue}"]`);
      if (card) {
        document.querySelectorAll('.card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
      }
    }
  }

  // Create voting cards
  function createCards(values) {
    cardsContainer.innerHTML = '';
    
    values.forEach((val) => {
      const card = document.createElement('div');
      card.textContent = val;
      card.dataset.value = val;
      card.className = 'card';
      
      // Mark as selected if this matches our current selectedValue
      if (selectedValue !== null && selectedValue === val) {
        card.classList.add('selected');
      }
      
      card.addEventListener('click', () => {
        selectedValue = val;
        document.querySelectorAll('.card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        socket.emit('vote', { sessionId: currentSessionId, clientId, value: val });
        saveVoteForRound();
      });
      cardsContainer.appendChild(card);
    });
  }

  // Calculate statistics from votes
  function calculateStats(votes) {
    const numericVotes = Object.values(votes)
      .map(data => data.vote)
      .filter(vote => vote !== null && typeof vote === 'number');
    
    if (numericVotes.length === 0) {
      return null;
    }
    
    const min = Math.min(...numericVotes);
    const max = Math.max(...numericVotes);
    const avg = (numericVotes.reduce((sum, v) => sum + v, 0) / numericVotes.length).toFixed(1);
    
    return { min, max, avg, count: numericVotes.length };
  }

  // Render results
  function renderResults({ revealed, votes, sessionName, roundId }) {
    if (sessionName && sessionName !== currentSessionName) {
      currentSessionName = sessionName;
      sessionNameDisplay.textContent = sessionName;
    }
    
    // Update roundId if it changed (happens on reset)
    if (roundId && roundId !== currentRoundId) {
      currentRoundId = roundId;
      // Clear selection when round changes
      selectedValue = null;
      document.querySelectorAll('.card').forEach((c) => c.classList.remove('selected'));
    }
    
    resultsEl.innerHTML = '';
    
    // Show statistics when revealed
    const statsEl = document.getElementById('statistics');
    if (revealed) {
      const stats = calculateStats(votes);
      if (stats) {
        statsEl.innerHTML = `
          <div class="stat-card">
            <i class="fas fa-arrow-down"></i>
            <div>
              <div class="stat-label">Min</div>
              <div class="stat-value">${stats.min}</div>
            </div>
          </div>
          <div class="stat-card">
            <i class="fas fa-chart-line"></i>
            <div>
              <div class="stat-label">Avg</div>
              <div class="stat-value">${stats.avg}</div>
            </div>
          </div>
          <div class="stat-card">
            <i class="fas fa-arrow-up"></i>
            <div>
              <div class="stat-label">Max</div>
              <div class="stat-value">${stats.max}</div>
            </div>
          </div>
          <div class="stat-card">
            <i class="fas fa-users"></i>
            <div>
              <div class="stat-label">Votes</div>
              <div class="stat-value">${stats.count}</div>
            </div>
          </div>
        `;
        statsEl.classList.remove('hidden');
      }
    } else {
      statsEl.classList.add('hidden');
    }
    
    Object.entries(votes).forEach(([id, data]) => {
      const resultItem = document.createElement('div');
      resultItem.className = 'result-item';
      
      const userDiv = document.createElement('div');
      userDiv.className = 'result-user';
      userDiv.innerHTML = `<i class="fas fa-user"></i> ${data.displayName}`;
      
      const voteDiv = document.createElement('div');
      voteDiv.className = 'result-vote';
      
      if (revealed) {
        voteDiv.textContent = data.vote !== null ? data.vote : '—';
        voteDiv.classList.add('revealed');
      } else {
        if (data.hasVoted) {
          voteDiv.textContent = '✓';
          voteDiv.classList.add('pending');
        } else {
          voteDiv.textContent = '—';
          voteDiv.classList.add('pending');
        }
      }
      
      resultItem.appendChild(userDiv);
      resultItem.appendChild(voteDiv);
      resultsEl.appendChild(resultItem);
    });
  }

  // Socket event: State update
  socket.on('state', (data) => {
    renderResults(data);
    
    // Check if we need to update our local state
    if (data.votes[clientId]) {
      const serverVote = data.votes[clientId].vote;
      
      // If server says we have a vote but local state doesn't match, sync it
      if (serverVote !== null && serverVote !== selectedValue) {
        selectedValue = serverVote;
        saveVoteForRound();
        restoreCardSelection();
      }
      
      // Clear card selection if vote was reset on server
      if (serverVote === null && selectedValue !== null && !data.revealed) {
        selectedValue = null;
        document.querySelectorAll('.card').forEach((c) => c.classList.remove('selected'));
        saveVoteForRound();
      }
    }
  });

  // Reveal button
  revealBtn.addEventListener('click', () => {
    socket.emit('reveal', { sessionId: currentSessionId });
  });

  // Reset button
  resetBtn.addEventListener('click', () => {
    selectedValue = null;
    saveVoteForRound();
    socket.emit('reset', { sessionId: currentSessionId });
  });

  // Check if we should auto-reconnect to a session on page load
  if (currentSessionId && displayName) {
    // Wait for socket connection to be established
    if (socket.connected) {
      socket.emit('joinSession', { sessionId: currentSessionId, clientId, displayName });
    }
    // If not connected, the 'connect' event handler will take care of it
  }
})();
