# Planning Poker Application

A lightweight but feature‑rich **Planning Poker** web application built with **Node.js**, **Express**, **socket.io** and a minimal frontend using **Tailwind CSS** and **Font Awesome**.  It supports up to **50 concurrent anonymous connections** and persists each visitor’s identity using `localStorage`, so refreshing the page doesn’t reset a person’s vote.

## 🎯 Motivation

Agile teams often estimate work using *Planning Poker* cards.  The values on these cards follow the **Fibonacci sequence**—each number is the sum of the two preceding ones (1, 2, 3, 5, 8, 13, 21…).  This sequence increases by roughly 60 %, which helps distinguish estimates: numbers that are too close together are harder to tell apart, whereas the Fibonacci scale spreads estimates far enough that differences are meaningful.  In planning sessions the modified sequence (1, 2, 3, 5, 8, 13, 20, 40, 100) is common.

The browser’s [`localStorage` API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) stores data across browser sessions; unlike `sessionStorage`, it has no expiration.  This app uses `localStorage` to assign each anonymous participant a unique ID that persists across refreshes without needing an account.

## ✨ Features

- **Anonymous voting** – no registration; each client receives a random ID stored locally.
- **Up to 50 concurrent connections** – new connections beyond this limit are refused politely.
- **Fibonacci cards** – displays the first 9 non‑zero Fibonacci numbers as selectable cards.
- **Real‑time updates** – selections update instantly across all connected clients using WebSockets.
- **Reveal and reset** – any user can reveal all votes or start a new round.
- **Juicy UI** – Tailwind classes and simple animations (hover scale, selection highlighting) make the interface engaging.  Font Awesome provides intuitive icons.
- **KISS & DRY** – the server maintains all state in memory and exposes a single API endpoint; the client uses straightforward functions without repetition.
- **Tests & lint** – unit tests ensure the Fibonacci generator and API work as expected; ESLint enforces code quality.
- **Continuous Integration** – GitHub Actions run linting and tests on every push/PR.  The badge below displays the CI status.

## 🛠️ Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) (version ≥18)

### Installation

Clone this repository and install the dependencies:

```sh
git clone https://github.com/riyuatarashi/pokerplanning.git
cd pokerplanning
npm install
```

### Running the application

Start the server:

```sh
npm start
```

Open your browser at [http://localhost:3000](http://localhost:3000).  The app will show a deck of Fibonacci cards.  Click a card to vote.  Your selection is highlighted and broadcast to everyone else.  Use the **Reveal Votes** button to show everyone’s votes.  Use **New Round** to reset.

### Running in development

For automatic reload on code changes, use:

```sh
npm run dev
```

### Tests and lint

Run the unit/feature tests:

```sh
npm test
```

Run ESLint:

```sh
npm run lint
```

## 📦 Project structure

```text
pokerplanning/
├── .github/workflows/ci.yml  # GitHub Actions configuration
├── public/                  # Static assets served by Express
│   ├── index.html           # Main page
│   └── app.js               # Front‑end logic
├── server.js               # Express/socket.io server
├── test/                   # Jest tests
│   ├── server.test.js      # API and utility tests
│   └── client.test.js      # Client‑side tests via jsdom
├── jest.config.js          # Jest configuration
├── .eslintrc.js            # ESLint rules
├── package.json            # NPM scripts and dependencies
└── README.md               # This file
```

## 🚦 CI Status

The repository uses GitHub Actions to run ESLint and Jest on each push or pull request.  The latest status of the `CI` workflow on the default branch is shown below:

![CI status](https://github.com/riyuatarashi/pokerplanning/actions/workflows/ci.yml/badge.svg)

## 📄 License

This project is licensed under the MIT License.  Feel free to use and adapt it for your own projects.