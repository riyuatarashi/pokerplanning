# Poker Planning

A real-time Planning Poker application built with Laravel, Livewire Volt, Flux UI, and Laravel Reverb for websocket communication.

## Features

- Create and join planning poker rooms
- Real-time vote synchronization across all participants
- Support for spectators who can watch but not vote
- Standard Fibonacci-like card sequence (0, 1, 2, 3, 5, 8, 13, 21, ?, coffee)
- Vote reveal with statistics (average, range, consensus detection)
- Dark mode support
- Shareable room links

## Requirements

- PHP 8.2+
- Node.js 18+
- Composer

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pokerplanning
```

2. Install dependencies:
```bash
composer install
npm install
```

3. Setup environment:
```bash
cp .env.example .env
php artisan key:generate
```

4. Run migrations:
```bash
php artisan migrate
```

5. Build assets:
```bash
npm run build
```

## Development

Start all development servers (Laravel, Reverb, Vite) with a single command:

```bash
composer dev
```

This will start:
- Laravel development server at http://localhost:8000
- Laravel Reverb websocket server at ws://localhost:8080
- Vite dev server for hot module replacement
- Laravel Pail for log tailing

## Usage

1. Open http://localhost:8000 in your browser
2. Create a new room with a name and your participant name
3. Share the room URL with your team
4. Start estimating stories!

### How it works

1. **Create a Room**: Enter a room name and your name to create a new planning session
2. **Share the Link**: Copy the room URL and share it with your team members
3. **Set a Story**: Enter the story or ticket you want to estimate
4. **Vote**: Each participant selects a card with their estimate
5. **Reveal**: Once everyone has voted, reveal the votes to see the results
6. **Discuss**: If there's no consensus, discuss and re-vote if needed
7. **Next Story**: Move on to the next item

### Card Values

- **0**: No effort required
- **1, 2, 3, 5, 8, 13, 21**: Fibonacci-like effort estimates
- **?**: Uncertain / need more information
- **Coffee**: Need a break!

## Tech Stack

- **Backend**: Laravel 12
- **Frontend**: Livewire Volt (single-file components)
- **UI**: Flux UI (Tailwind-based component library)
- **Websockets**: Laravel Reverb
- **Database**: SQLite (default) or any Laravel-supported database

## License

MIT License
