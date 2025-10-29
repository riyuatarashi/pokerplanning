/**
 * These tests run in a jsdom environment and verify some high‑level
 * behaviours of the client script. We mock out the socket.io client and
 * the fetch API to ensure deterministic behaviour.
 */

describe('Client behaviour', () => {
  let ioMock;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="cards"></div>
      <div id="message"></div>
      <div id="results"></div>
      <button id="revealButton"></button>
      <button id="resetButton"></button>
    `;
    // Mock socket.io client
    ioMock = {
      on: jest.fn(),
      emit: jest.fn(),
    };
    global.io = jest.fn(() => ioMock);
    // Mock fetch to return a predictable Fibonacci sequence
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({ values: [0, 1, 1, 2, 3, 5, 8] }),
      })
    );
    // Clear localStorage between tests
    localStorage.clear();
    // Require the client script (this executes the IIFE)
    jest.isolateModules(() => {
      require('../public/app.js');
    });
  });

  it('should generate and store a clientId in localStorage', () => {
    const stored = localStorage.getItem('clientId');
    expect(stored).toBeTruthy();
    expect(stored.length).toBeGreaterThan(5);
    // Should have joined via socket
    expect(ioMock.emit).toHaveBeenCalledWith('join', stored);
  });

  it('should render cards excluding zero value', () => {
    const cards = document.querySelectorAll('#cards .card');
    // The mocked Fibonacci includes 7 values, first (0) filtered; expect 6 cards
    expect(cards.length).toBe(6);
    // First card should have textContent "1"
    expect(cards[0].textContent).toBe('1');
  });
});