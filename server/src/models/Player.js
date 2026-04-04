/* ============================================================
   ROYAL FLUSH — Player Model
   ============================================================ */

import { v4 as uuidv4 } from 'uuid';

/**
 * Represents a player connected to the server.
 */
export class Player {
  /**
   * @param {string} socketId - Socket.IO socket ID
   * @param {string} name - Display name
   */
  constructor(socketId, name = 'Player') {
    /** @type {string} Unique player identifier */
    this.id = uuidv4();

    /** @type {string} Socket.IO connection ID */
    this.socketId = socketId;

    /** @type {string} Display name */
    this.name = name;

    /** @type {number} Chip balance */
    this.chips = 0;

    /** @type {Array<{suit: string, rank: string}>} Hole cards (private) */
    this.holeCards = [];

    /** @type {number} Current bet amount this round */
    this.currentBet = 0;

    /** @type {number} Total bet amount this hand */
    this.totalBet = 0;

    /** @type {boolean} Has this player folded? */
    this.isFolded = false;

    /** @type {boolean} Is the player all-in? */
    this.isAllIn = false;

    /** @type {boolean} Is the player seated and ready? */
    this.isReady = false;

    /** @type {boolean} Is the player still connected? */
    this.isConnected = true;

    /** @type {number} Seat index at the table (0-8) */
    this.seatIndex = -1;

    /** @type {string|null} Current room ID */
    this.roomId = null;
  }

  /**
   * Get a public-safe representation (hides hole cards)
   * @returns {Object}
   */
  toPublic() {
    return {
      id: this.id,
      name: this.name,
      chips: this.chips,
      currentBet: this.currentBet,
      totalBet: this.totalBet,
      isFolded: this.isFolded,
      isAllIn: this.isAllIn,
      isReady: this.isReady,
      isConnected: this.isConnected,
      seatIndex: this.seatIndex,
      hasCards: this.holeCards.length > 0,
    };
  }

  /**
   * Get a private representation (includes hole cards — only sent to this player)
   * @returns {Object}
   */
  toPrivate() {
    return {
      ...this.toPublic(),
      holeCards: this.holeCards,
    };
  }

  /**
   * Reset for a new hand
   */
  resetForNewHand() {
    this.holeCards = [];
    this.currentBet = 0;
    this.totalBet = 0;
    this.isFolded = false;
    this.isAllIn = false;
  }

  /**
   * Place a bet
   * @param {number} amount - Bet amount
   * @returns {number} Actual amount bet (capped by chip count)
   */
  placeBet(amount) {
    const actualBet = Math.min(amount, this.chips);
    this.chips -= actualBet;
    this.currentBet += actualBet;
    this.totalBet += actualBet;

    if (this.chips === 0) {
      this.isAllIn = true;
    }

    return actualBet;
  }

  /**
   * Award chips to this player (winner)
   * @param {number} amount
   */
  awardChips(amount) {
    this.chips += amount;
  }

  /**
   * Fold the hand
   */
  fold() {
    this.isFolded = true;
    this.holeCards = [];
  }
}
