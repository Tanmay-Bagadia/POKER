/* ============================================================
   ROYAL FLUSH — Socket Event Handler (Complete)
   
   Handles all real-time communication:
   - Connection/disconnection
   - Lobby management
   - Room CRUD
   - Player name setting
   - Game actions (start, bet, fold, etc.)
   ============================================================ */

import { SOCKET_EVENTS, PLAYER_ACTIONS } from '../config/constants.js';
import { Player } from '../models/Player.js';
import RoomService from './RoomService.js';
import { GameEngine } from '../engine/GameEngine.js';
import Logger from '../utils/logger.js';

const log = new Logger('SocketHandler');

/** @type {Map<string, Player>} socketId → Player */
const connectedPlayers = new Map();

/** @type {Map<string, GameEngine>} roomId → GameEngine */
const gameEngines = new Map();

/** @type {Set<string>} socketIds in the lobby */
const lobbyMembers = new Set();

/**
 * Initialize socket event handlers
 * @param {import('socket.io').Server} io
 */
export function initSocketHandlers(io) {
  io.on('connection', (socket) => {
    log.socket(`Client connected: ${socket.id}`);

    // Create a Player object for this connection
    const player = new Player(socket.id);
    connectedPlayers.set(socket.id, player);

    /* ─── Player Identity ──────────────────────────── */

    socket.on(SOCKET_EVENTS.PLAYER_SET_NAME, (name, callback) => {
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return callback?.({ success: false, error: 'Name must be at least 2 characters.' });
      }

      player.name = name.trim().slice(0, 20);
      log.info(`Player named: ${player.name} (${socket.id})`);

      callback?.({
        success: true,
        playerId: player.id,
        name: player.name,
      });
    });

    /* ─── Lobby ────────────────────────────────────── */

    socket.on(SOCKET_EVENTS.LOBBY_JOIN, (_, callback) => {
      socket.join('lobby');
      lobbyMembers.add(socket.id);

      const rooms = RoomService.getAllRooms().map(r => r.toLobby());
      callback?.({ success: true, rooms });

      broadcastLobbyUpdate(io);
      log.info(`${player.name} joined lobby.`);
    });

    socket.on(SOCKET_EVENTS.LOBBY_LEAVE, () => {
      socket.leave('lobby');
      lobbyMembers.delete(socket.id);
      log.info(`${player.name} left lobby.`);
    });

    /* ─── Room Management ──────────────────────────── */

    socket.on(SOCKET_EVENTS.ROOM_CREATE, (data, callback) => {
      // Leave lobby
      socket.leave('lobby');
      lobbyMembers.delete(socket.id);

      const room = RoomService.createRoom(
        data.name || `${player.name}'s Table`,
        player.id,
        {
          maxPlayers: Math.min(Math.max(data.maxPlayers || 9, 2), 9),
          smallBlind: data.smallBlind || 10,
          bigBlind: data.bigBlind || 20,
        }
      );

      // Add the host player to the room
      room.addPlayer(player);
      socket.join(room.id);

      callback?.({
        success: true,
        room: room.toState(),
      });

      broadcastLobbyUpdate(io);
      log.info(`${player.name} created room "${room.name}" (${room.id})`);
    });

    socket.on(SOCKET_EVENTS.ROOM_JOIN, (roomId, callback) => {
      const room = RoomService.getRoom(roomId);
      if (!room) {
        return callback?.({ success: false, error: 'Room not found.' });
      }

      if (room.players.size >= room.maxPlayers) {
        return callback?.({ success: false, error: 'Room is full.' });
      }

      // Leave lobby
      socket.leave('lobby');
      lobbyMembers.delete(socket.id);

      room.addPlayer(player);
      socket.join(room.id);

      callback?.({
        success: true,
        room: room.toState(),
      });

      // Notify room members
      socket.to(room.id).emit(SOCKET_EVENTS.ROOM_PLAYER_JOINED, {
        player: player.toPublic(),
        room: room.toState(),
      });

      broadcastLobbyUpdate(io);
      log.info(`${player.name} joined room "${room.name}"`);
    });

    socket.on(SOCKET_EVENTS.ROOM_LEAVE, (_, callback) => {
      handlePlayerLeaveRoom(socket, player, io);
      callback?.({ success: true });
    });

    socket.on(SOCKET_EVENTS.ROOM_CHAT, (message) => {
      if (!player.roomId || !message) return;
      io.to(player.roomId).emit(SOCKET_EVENTS.ROOM_CHAT, {
        playerId: player.id,
        playerName: player.name,
        message: message.slice(0, 200),
        timestamp: Date.now(),
      });
    });

    // Request current room state
    socket.on(SOCKET_EVENTS.ROOM_UPDATE, (_, callback) => {
      const room = RoomService.getRoom(player.roomId);
      if (!room) return callback?.(null);
      callback?.(room.toState());
    });

    /* ─── Game Actions ─────────────────────────────── */

    socket.on(SOCKET_EVENTS.GAME_START, (_, callback) => {
      const room = RoomService.getRoom(player.roomId);
      if (!room) return callback?.({ success: false, error: 'Not in a room.' });
      if (player.id !== room.hostId) return callback?.({ success: false, error: 'Only the host can start the game.' });
      if (!room.canStartGame()) return callback?.({ success: false, error: 'Not enough players to start.' });

      // Create or reuse game engine
      let engine = gameEngines.get(room.id);
      if (!engine) {
        engine = new GameEngine(
          room,
          (roomId, event, data) => io.to(roomId).emit(event, data),
          (socketId, event, data) => io.to(socketId).emit(event, data),
        );
        gameEngines.set(room.id, engine);
      }

      const started = engine.startRound();
      callback?.({ success: started, error: started ? null : 'Failed to start round.' });
    });

    // Unified game action handler
    socket.on('game:action', (data, callback) => {
      const { action, amount } = data || {};
      const room = RoomService.getRoom(player.roomId);
      if (!room) return callback?.({ success: false, error: 'Not in a room.' });

      const engine = gameEngines.get(room.id);
      if (!engine) return callback?.({ success: false, error: 'Game not started.' });

      const result = engine.handleAction(player.id, action, amount);
      callback?.(result);
    });

    // Individual action events (convenience — map to unified handler)
    socket.on(SOCKET_EVENTS.GAME_ACTION_FOLD, (_, cb) => {
      socket.emit('game:action', { action: PLAYER_ACTIONS.FOLD }, cb);
    });
    socket.on(SOCKET_EVENTS.GAME_ACTION_CHECK, (_, cb) => {
      socket.emit('game:action', { action: PLAYER_ACTIONS.CHECK }, cb);
    });
    socket.on(SOCKET_EVENTS.GAME_ACTION_CALL, (_, cb) => {
      socket.emit('game:action', { action: PLAYER_ACTIONS.CALL }, cb);
    });
    socket.on(SOCKET_EVENTS.GAME_ACTION_BET, (data, cb) => {
      socket.emit('game:action', { action: PLAYER_ACTIONS.BET, amount: data?.amount }, cb);
    });
    socket.on(SOCKET_EVENTS.GAME_ACTION_RAISE, (data, cb) => {
      socket.emit('game:action', { action: PLAYER_ACTIONS.RAISE, amount: data?.amount }, cb);
    });
    socket.on(SOCKET_EVENTS.GAME_ACTION_ALL_IN, (_, cb) => {
      socket.emit('game:action', { action: PLAYER_ACTIONS.ALL_IN }, cb);
    });

    /* ─── Disconnect ───────────────────────────────── */

    socket.on('disconnect', (reason) => {
      log.socket(`Client disconnected: ${socket.id} (${reason})`);

      // Handle room cleanup
      handlePlayerLeaveRoom(socket, player, io);

      // Remove from lobby
      lobbyMembers.delete(socket.id);

      // Remove player record
      connectedPlayers.delete(socket.id);
    });
  });

  // Periodic status logging
  setInterval(() => {
    log.debug(`Connected: ${connectedPlayers.size} players | ${RoomService.getAllRooms().length} rooms`);
  }, 30000);

  log.info('Socket handlers initialized.');
}

/* ─── Helpers ──────────────────────────────────────────── */

function handlePlayerLeaveRoom(socket, player, io) {
  if (!player.roomId) return;

  const room = RoomService.getRoom(player.roomId);
  if (!room) return;

  const roomId = room.id;

  // If a game is running, fold the player
  const engine = gameEngines.get(roomId);
  if (engine && engine.roundActive) {
    engine.handleAction(player.id, PLAYER_ACTIONS.FOLD);
  }

  room.removePlayer(player.id);
  socket.leave(roomId);
  player.roomId = null;

  // Notify remaining players
  io.to(roomId).emit(SOCKET_EVENTS.ROOM_PLAYER_LEFT, {
    playerId: player.id,
    playerName: player.name,
    room: room.toState(),
  });

  // Destroy room if empty
  if (room.isEmpty()) {
    if (engine) {
      engine.destroy();
      gameEngines.delete(roomId);
    }
    RoomService.deleteRoom(roomId);
    log.info(`Room "${room.name}" destroyed (empty).`);
  }

  broadcastLobbyUpdate(io);
  log.info(`${player.name} left room "${room.name}"`);
}

function broadcastLobbyUpdate(io) {
  const rooms = RoomService.getAllRooms().map(r => r.toLobby());
  io.to('lobby').emit(SOCKET_EVENTS.LOBBY_ROOMS_UPDATE, rooms);
}
