/* ============================================================
   ROYAL FLUSH — Server Entry Point
   
   Express + Socket.IO server with CORS, REST API, and 
   real-time WebSocket communication.
   ============================================================ */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import config from './config/index.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { initSocketHandlers } from './services/socketHandler.js';
import { logger } from './utils/logger.js';

// ── Express App ──────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

// ── CORS ─────────────────────────────────────────────────
app.use(cors({
  origin: config.clientUrl,
  methods: ['GET', 'POST'],
  credentials: true,
}));

// ── Middleware ────────────────────────────────────────────
app.use(express.json());

// ── Request Logger (dev only) ────────────────────────────
if (config.isDev) {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// ── API Routes ───────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Error Handling ───────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Socket.IO ────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize socket event handlers
initSocketHandlers(io);

// ── Start Server ─────────────────────────────────────────
httpServer.listen(config.port, () => {
  logger.info(`
  ♠♥♣♦  ROYAL FLUSH SERVER  ♦♣♥♠
  ────────────────────────────────
  Port:        ${config.port}
  Environment: ${config.nodeEnv}
  Client URL:  ${config.clientUrl}
  ────────────────────────────────
  API:         http://localhost:${config.port}/api/health
  WebSocket:   ws://localhost:${config.port}
  ────────────────────────────────
  `);
});

// ── Graceful Shutdown ────────────────────────────────────
process.on('SIGTERM', () => {
  logger.warn('SIGTERM received. Shutting down gracefully...');
  io.close();
  httpServer.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.warn('SIGINT received. Shutting down...');
  io.close();
  httpServer.close(() => {
    process.exit(0);
  });
});

export { app, httpServer, io };
