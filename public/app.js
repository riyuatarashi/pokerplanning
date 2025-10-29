/* global io */

(() => {
  // Establish socket connection
  const socket = io();

  // Retrieve or generate anonymous client ID
  let clientId = localStorage.getItem('clientId');
  if (!clientId) {
    // Prefer crypto.randomUUID if available
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      clientId = crypto.randomUUID();
    } else {
      // Fallback: simple random string
      clientId = Math.random().toString(36).substring(2, 10);
    }
    localStorage.setItem('clientId', clientId);
  }

  // DOM elements
  const cardsContainer = document.getElementById('cards');
  const messageEl = document.getElementById('message');
  const resultsEl = document.getElementById('results');
  const revealBtn = document.getElementById('revealButton');
  const resetBtn = document.getElementById('resetButton');

  // Keep track of the currently selected card
  let selectedValue = null;

  // Create cards when Fibonacci values are loaded
  function createCards(values) {
    cardsContainer.innerHTML = '';
    values.forEach((val) => {
      const card = document.createElement('div');
      card.textContent = val;
      card.dataset.value = val;
      card.className = 'card bg-white text-gray-800';
      card.addEventListener('click', () => {
        selectedValue = val;
        // Remove 'selected' class from all cards
        document.querySelectorAll('.card').forEach((c) =>
          c.classList.remove('selected')
        );
        card.classList.add('selected');
        // Emit vote to server
        socket.emit('vote', { clientId, value: val });
      });
      cardsContainer.appendChild(card);
    });
  }

  // Render vote results or summary
  function renderResults({ revealed, votes }) {
    resultsEl.innerHTML = '';
    const list = document.createElement('ul');
    list.className = 'space-y-2';
    Object.entries(votes).forEach(([id, val]) => {
      const li = document.createElement('li');
      li.className =
        'flex items-center justify-between p-2 bg-white rounded shadow';
      const userLabel = document.createElement('span');
      // Show only first 6 characters of user ID for brevity
      userLabel.textContent = `User ${id.slice(0, 6)}`;
      const voteLabel = document.createElement('span');
      if (revealed) {
        voteLabel.textContent = val;
      } else {
        voteLabel.textContent = val ? 'Voted' : '—';
      }
      li.appendChild(userLabel);
      li.appendChild(voteLabel);
      list.appendChild(li);
    });
    resultsEl.appendChild(list);
  }

  // Listen for state updates from the server
  socket.on('state', (data) => {
    renderResults(data);
  });

  // Server will notify if the server is full
  socket.on('full', ({ message }) => {
    messageEl.textContent = message;
    messageEl.classList.remove('hidden');
    // Disable UI if full
    revealBtn.disabled = true;
    resetBtn.disabled = true;
    cardsContainer.innerHTML = '';
  });

  // Reveal and reset buttons
  revealBtn.addEventListener('click', () => {
    socket.emit('reveal');
  });
  resetBtn.addEventListener('click', () => {
    selectedValue = null;
    // remove card selection visuals
    document.querySelectorAll('.card').forEach((c) =>
      c.classList.remove('selected')
    );
    socket.emit('reset');
  });

  // Emit join event once connected
  socket.on('connect', () => {
    socket.emit('join', clientId);
  });

  // Fetch Fibonacci values for the cards on page load
  fetch('/api/fibonacci')
    .then((res) => res.json())
    .then((data) => {
      // Remove the first zero (0) from the list for planning cards; planning poker usually starts at 1
      const values = data.values.filter((val) => val > 0);
      createCards(values);
    });
})();