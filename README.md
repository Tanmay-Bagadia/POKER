# 🃏 Royal Flush — Multiplayer Poker

A premium multiplayer Texas Hold'em poker game built with modern web technologies and AAA-tier glassmorphic aesthetics.

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| **Frontend**   | Vite + Vanilla JS + CSS           |
| **Backend**    | Node.js + Express + Socket.IO     |
| **Styling**    | CSS Variables + GPU Animations    |
| **Deploy (FE)**| Vercel                            |
| **Deploy (BE)**| Render                            |

## Project Structure

```
poker-game/
├── client/                 # Vite + Vanilla JS Frontend
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── assets/         # Images, sounds
│   │   ├── components/     # UI component classes
│   │   ├── engine/         # Client-side game state manager
│   │   ├── services/       # Socket.IO client service
│   │   ├── styles/         # CSS design system
│   │   ├── utils/          # Utility functions
│   │   └── main.js         # Application entry point
│   ├── index.html          # HTML shell
│   └── vite.config.js      # Vite configuration
│
├── server/                 # Node.js + Express Backend
│   ├── src/
│   │   ├── config/         # Server configuration
│   │   ├── controllers/    # Route controllers
│   │   ├── engine/         # Server-authoritative game engine
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Data models (Room, Player, Deck)
│   │   ├── routes/         # REST API routes
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Utility functions
│   │   └── index.js        # Server entry point
│   └── package.json
│
└── README.md
```

## Development

### Prerequisites
- Node.js >= 18
- npm >= 9

### Quick Start

**Terminal 1 — Backend:**
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:3001`.

## Architecture

- **Server-Authoritative**: All game logic (dealing, hand evaluation, pot calculation) runs exclusively on the server. The client is a rendering layer.
- **Real-Time**: Socket.IO provides bidirectional communication for game state synchronization.
- **OOP Engine**: Both client and server use class-based architecture for clean separation of concerns.

## License

MIT
