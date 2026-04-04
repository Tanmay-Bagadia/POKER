/* ============================================================
   ROYAL FLUSH — Room Service
   
   Manages all rooms: creation, lookup, deletion.
   Acts as the in-memory "database" for rooms.
   ============================================================ */

import { Room } from '../models/Room.js';
import Logger from '../utils/logger.js';

const log = new Logger('RoomService');

class RoomService {
  constructor() {
    /** @type {Map<string, Room>} All rooms by ID */
    this.rooms = new Map();

    /** @type {Map<string, string>} Player ID → Room ID lookup */
    this.playerRoomMap = new Map();
  }

  /**
   * Create a new room
   * @param {string} name - Room name
   * @param {string} hostId - Host player ID
   * @param {Object} [options={}]
   * @returns {Room}
   */
  createRoom(name, hostId, options = {}) {
    const room = new Room(name, hostId, options);
    this.rooms.set(room.id, room);
    log.info(`Room created: "${name}" (${room.id}) by ${hostId}`);
    return room;
  }

  /**
   * Get a room by ID
   * @param {string} roomId
   * @returns {Room|undefined}
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * Get all rooms
   * @returns {Room[]}
   */
  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  /**
   * Get all public rooms for the lobby
   * @returns {Object[]}
   */
  getPublicRooms() {
    return Array.from(this.rooms.values())
      .filter(room => !room.isPrivate)
      .map(room => room.toLobby());
  }

  /**
   * Delete a room
   * @param {string} roomId
   */
  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      // Remove all player-room mappings
      for (const player of room.players.values()) {
        this.playerRoomMap.delete(player.id);
      }
      this.rooms.delete(roomId);
      log.info(`Room deleted: "${room.name}" (${roomId})`);
    }
  }

  /**
   * Track which room a player is in
   * @param {string} playerId
   * @param {string} roomId
   */
  setPlayerRoom(playerId, roomId) {
    this.playerRoomMap.set(playerId, roomId);
  }

  /**
   * Get the room a player is currently in
   * @param {string} playerId
   * @returns {Room|undefined}
   */
  getPlayerRoom(playerId) {
    const roomId = this.playerRoomMap.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /**
   * Remove player-room tracking
   * @param {string} playerId
   */
  removePlayerRoom(playerId) {
    this.playerRoomMap.delete(playerId);
  }

  /**
   * Clean up empty rooms
   */
  cleanupEmptyRooms() {
    for (const [id, room] of this.rooms) {
      if (room.isEmpty()) {
        this.deleteRoom(id);
      }
    }
  }

  /**
   * Get total number of rooms
   * @returns {number}
   */
  get count() {
    return this.rooms.size;
  }

  /**
   * Get total players across all rooms
   * @returns {number}
   */
  get totalPlayers() {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.players.size;
    }
    return count;
  }
}

// Singleton
export const roomService = new RoomService();
export default roomService;
