/* ============================================================
   ROYAL FLUSH — Room Controller
   
   REST API handlers for room operations.
   ============================================================ */

import roomService from '../services/RoomService.js';
import Logger from '../utils/logger.js';

const log = new Logger('RoomController');

/**
 * GET /api/rooms — List all public rooms
 */
export function listRooms(req, res) {
  const rooms = roomService.getPublicRooms();
  res.json({
    success: true,
    data: rooms,
    meta: {
      totalRooms: roomService.count,
      totalPlayers: roomService.totalPlayers,
    },
  });
}

/**
 * GET /api/rooms/:id — Get a single room's info
 */
export function getRoom(req, res) {
  const room = roomService.getRoom(req.params.id);

  if (!room) {
    return res.status(404).json({
      success: false,
      error: 'Room not found.',
    });
  }

  res.json({
    success: true,
    data: room.toLobby(),
  });
}

/**
 * GET /api/health — Health check
 */
export function healthCheck(req, res) {
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    rooms: roomService.count,
    players: roomService.totalPlayers,
  });
}
