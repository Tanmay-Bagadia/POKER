/* ============================================================
   ROYAL FLUSH — Room Model
   ============================================================ */

import { v4 as uuidv4 } from 'uuid';
import { GAME_PHASES } from '../config/constants.js';
import config from '../config/index.js';

/**
 * Represents a poker room / table.
 */
export class Room {
  /**
   * @param {string} name - Room display name
   * @param {string} hostId - Player ID of the room creator
   * @param {Object} [options={}] - Room options
   */
  constructor(name, hostId, options = {}) {
    /** @type {string} */
    this.id = uuidv4();

    /** @type {string} */
    this.name = name;

    /** @type {string} Player ID of the host */
    this.hostId = hostId;

    /** @type {Map<string, import('./Player.js').Player>} Players by player ID */
    this.players = new Map();

    /** @type {number} */
    this.maxPlayers = options.maxPlayers || config.game.maxPlayersPerTable;

    /** @type {number} */
    this.startingChips = options.startingChips || config.game.startingChips;

    /** @type {{small: number, big: number}} */
    this.blinds = {
      small: options.smallBlind || config.game.smallBlind,
      big: options.bigBlind || config.game.bigBlind,
    };

    /** @type {string} Current game phase */
    this.phase = GAME_PHASES.WAITING;

    /** @type {number} Current round number */
    this.roundNumber = 0;

    /** @type {number} Index of the dealer seat */
    this.dealerIndex = 0;

    /** @type {number} Index of the active player */
    this.activePlayerIndex = -1;

    /** @type {number} Main pot */
    this.pot = 0;

    /** @type {Array} Side pots */
    this.sidePots = [];

    /** @type {number} Current highest bet */
    this.currentBet = 0;

    /** @type {Array<{suit: string, rank: string}>} Community cards */
    this.communityCards = [];

    /** @type {Date} */
    this.createdAt = new Date();

    /** @type {boolean} */
    this.isPrivate = options.isPrivate || false;
  }

  /**
   * Add a player to the room
   * @param {import('./Player.js').Player} player
   * @returns {boolean} Success
   */
  addPlayer(player) {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }

    // Assign next available seat
    player.seatIndex = this.getNextAvailableSeat();
    player.chips = this.startingChips;
    player.roomId = this.id;
    this.players.set(player.id, player);

    return true;
  }

  /**
   * Remove a player from the room
   * @param {string} playerId
   * @returns {import('./Player.js').Player|null}
   */
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      player.roomId = null;
      player.seatIndex = -1;
      this.players.delete(playerId);

      // Transfer host if needed
      if (playerId === this.hostId && this.players.size > 0) {
        this.hostId = this.players.values().next().value.id;
      }
    }
    return player;
  }

  /**
   * Get next available seat index
   * @returns {number}
   */
  getNextAvailableSeat() {
    const takenSeats = new Set();
    for (const player of this.players.values()) {
      takenSeats.add(player.seatIndex);
    }
    for (let i = 0; i < this.maxPlayers; i++) {
      if (!takenSeats.has(i)) return i;
    }
    return -1;
  }

  /**
   * Get active (non-folded, non-busted) players
   * @returns {import('./Player.js').Player[]}
   */
  getActivePlayers() {
    return Array.from(this.players.values())
      .filter(p => !p.isFolded && p.isConnected && p.chips >= 0)
      .sort((a, b) => a.seatIndex - b.seatIndex);
  }

  /**
   * Get a public-safe representation of the room for the lobby
   * @returns {Object}
   */
  toLobby() {
    return {
      id: this.id,
      name: this.name,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      phase: this.phase,
      blinds: this.blinds,
      isPrivate: this.isPrivate,
    };
  }

  /**
   * Get the full room state for players inside the room.
   * Hole cards are NOT included — send those per-player via toPrivate().
   * @returns {Object}
   */
  toState() {
    return {
      id: this.id,
      name: this.name,
      hostId: this.hostId,
      phase: this.phase,
      roundNumber: this.roundNumber,
      dealerIndex: this.dealerIndex,
      activePlayerIndex: this.activePlayerIndex,
      pot: this.pot,
      sidePots: this.sidePots,
      currentBet: this.currentBet,
      communityCards: this.communityCards,
      blinds: this.blinds,
      players: Array.from(this.players.values()).map(p => p.toPublic()),
    };
  }

  /**
   * Is the room empty?
   * @returns {boolean}
   */
  isEmpty() {
    return this.players.size === 0;
  }

  /**
   * Can a new game round start?
   * @returns {boolean}
   */
  canStartGame() {
    const readyPlayers = Array.from(this.players.values()).filter(p => p.isConnected);
    return readyPlayers.length >= config.game.minPlayersToStart && this.phase === GAME_PHASES.WAITING;
  }
}
