/* ============================================================
   ROYAL FLUSH — Game Engine (Stub)
   
   Will be fully implemented in Phase 4.
   This stub establishes the class interface and core structure.
   ============================================================ */

import { Deck } from './Deck.js';
import { HandEvaluator } from './HandEvaluator.js';
import { GAME_PHASES } from '../config/constants.js';
import Logger from '../utils/logger.js';

const log = new Logger('GameEngine');

/**
 * GameEngine
 * 
 * Server-authoritative Texas Hold'em game engine.
 * Manages the complete game lifecycle: dealing, betting rounds,
 * community cards, showdown, and pot distribution.
 * 
 * Full implementation in Phase 4.
 */
export class GameEngine {
  /**
   * @param {import('../models/Room.js').Room} room - The room this engine manages
   */
  constructor(room) {
    /** @type {import('../models/Room.js').Room} */
    this.room = room;

    /** @type {Deck} */
    this.deck = new Deck();

    /** @type {number|null} Turn timeout ID */
    this.turnTimer = null;

    log.info(`Engine created for room "${room.name}" (${room.id})`);
  }

  /**
   * Start a new round
   * Full implementation in Phase 4
   */
  startRound() {
    log.info(`[${this.room.name}] Starting round ${this.room.roundNumber + 1}`);
    this.room.roundNumber++;
    this.room.phase = GAME_PHASES.PRE_FLOP;
    this.deck.reset();
    this.deck.shuffle();

    // Reset all players for new hand
    for (const player of this.room.players.values()) {
      player.resetForNewHand();
    }

    log.info(`[${this.room.name}] Round ${this.room.roundNumber} started.`);
  }

  /**
   * Clean up timers and resources
   */
  destroy() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    log.info(`Engine destroyed for room "${this.room.name}"`);
  }
}
