/* ============================================================
   ROYAL FLUSH — Socket.IO Event Handler
   
   Handles all real-time WebSocket events.
   Manages player connections, room operations, and game actions.
   ============================================================ */

import { SOCKET_EVENTS } from '../config/constants.js';
import { Player } from '../models/Player.js';
import roomService from '../services/RoomService.js';
import Logger from '../utils/logger.js';

const log = new Logger('SocketHandler');

/** @type {Map<string, Player>} Socket ID → Player lookup */
const connectedPlayers = new Map();

/**
 * Initialize Socket.IO event handlers
 * @param {import('socket.io').Server} io - Socket.IO server instance
 */
export function initSocketHandlers(io) {
  io.on(SOCKET_EVENTS.CONNECT, (socket) => {
    log.socket(`Client connected: ${socket.id}`);

    // Create a player for this connection
    const player = new Player(socket.id);
    connectedPlayers.set(socket.id, player);

    // ── Player Name ──────────────────────────────────
    socket.on(SOCKET_EVENTS.PLAYER_SET_NAME, (name, callback) => {
      if (!name || typeof name !== 'string' || name.trim().length < 1) {
        return callback?.({ success: false, error: 'Invalid name.' });
      }

      player.name = name.trim().slice(0, 20); // Max 20 chars
      log.info(`Player "${player.name}" set name (${player.id})`);
      callback?.({ success: true, playerId: player.id, name: player.name });
    });

    // ── Lobby ────────────────────────────────────────
    socket.on(SOCKET_EVENTS.LOBBY_JOIN, (callback) => {
      socket.join('lobby');
      const rooms = roomService.getPublicRooms();
      callback?.({ success: true, rooms });
      log.socket(`${player.name} joined lobby`);
    });

    socket.on(SOCKET_EVENTS.LOBBY_LEAVE, () => {
      socket.leave('lobby');
    });

    // ── Room Create ──────────────────────────────────
    socket.on(SOCKET_EVENTS.ROOM_CREATE, (data, callback) => {
      const { name, maxPlayers, smallBlind, bigBlind } = data || {};

      if (!name || typeof name !== 'string' || name.trim().length < 1) {
        return callback?.({ success: false, error: 'Room name is required.' });
      }

      const room = roomService.createRoom(name.trim(), player.id, {
        maxPlayers,
        smallBlind,
        bigBlind,
      });

      // Add creator to the room
      room.addPlayer(player);
      roomService.setPlayerRoom(player.id, room.id);
      socket.join(room.id);
      socket.leave('lobby');

      // Broadcast updated room list to lobby
      io.to('lobby').emit(SOCKET_EVENTS.LOBBY_ROOMS_UPDATE, roomService.getPublicRooms());

      callback?.({
        success: true,
        room: room.toState(),
        playerId: player.id,
      });

      log.info(`Room "${room.name}" created by ${player.name}`);
    });

    // ── Room Join ────────────────────────────────────
    socket.on(SOCKET_EVENTS.ROOM_JOIN, (roomId, callback) => {
      const room = roomService.getRoom(roomId);

      if (!room) {
        return callback?.({ success: false, error: 'Room not found.' });
      }

      if (room.players.size >= room.maxPlayers) {
        return callback?.({ success: false, error: 'Room is full.' });
      }

      const added = room.addPlayer(player);
      if (!added) {
        return callback?.({ success: false, error: 'Could not join room.' });
      }

      roomService.setPlayerRoom(player.id, room.id);
      socket.join(room.id);
      socket.leave('lobby');

      // Notify other players in the room
      socket.to(room.id).emit(SOCKET_EVENTS.ROOM_PLAYER_JOINED, {
        player: player.toPublic(),
        room: room.toState(),
      });

      // Update lobby
      io.to('lobby').emit(SOCKET_EVENTS.LOBBY_ROOMS_UPDATE, roomService.getPublicRooms());

      callback?.({
        success: true,
        room: room.toState(),
        playerId: player.id,
      });

      log.info(`${player.name} joined room "${room.name}"`);
    });

    // ── Room Leave ───────────────────────────────────
    socket.on(SOCKET_EVENTS.ROOM_LEAVE, (callback) => {
      handlePlayerLeaveRoom(socket, player, io);
      callback?.({ success: true });
    });

    // ── Chat ─────────────────────────────────────────
    socket.on(SOCKET_EVENTS.ROOM_CHAT, (message) => {
      if (!player.roomId || !message || typeof message !== 'string') return;

      const sanitized = message.trim().slice(0, 200);
      if (sanitized.length === 0) return;

      io.to(player.roomId).emit(SOCKET_EVENTS.ROOM_CHAT, {
        playerId: player.id,
        playerName: player.name,
        message: sanitized,
        timestamp: Date.now(),
      });
    });

    // ── Disconnect ───────────────────────────────────
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      log.socket(`Client disconnected: ${socket.id} (${reason})`);
      handlePlayerLeaveRoom(socket, player, io);
      connectedPlayers.delete(socket.id);
    });
  });

  // Log connection count periodically
  setInterval(() => {
    log.debug(`Connected: ${connectedPlayers.size} players | ${roomService.count} rooms`);
  }, 30000);

  log.info('Socket handlers initialized.');
}

/**
 * Handle a player leaving their current room
 * @param {import('socket.io').Socket} socket
 * @param {Player} player
 * @param {import('socket.io').Server} io
 */
function handlePlayerLeaveRoom(socket, player, io) {
  if (!player.roomId) return;

  const room = roomService.getRoom(player.roomId);
  if (!room) return;

  room.removePlayer(player.id);
  roomService.removePlayerRoom(player.id);
  socket.leave(room.id);

  // Notify remaining players
  socket.to(room.id).emit(SOCKET_EVENTS.ROOM_PLAYER_LEFT, {
    playerId: player.id,
    playerName: player.name,
    room: room.toState(),
  });

  // Delete empty rooms
  if (room.isEmpty()) {
    roomService.deleteRoom(room.id);
  }

  // Update lobby
  io.to('lobby').emit(SOCKET_EVENTS.LOBBY_ROOMS_UPDATE, roomService.getPublicRooms());

  log.info(`${player.name} left room "${room.name}"`);
}

/**
 * Get connected player count
 * @returns {number}
 */
export function getConnectedPlayerCount() {
  return connectedPlayers.size;
}
