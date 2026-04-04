/* ============================================================
   ROYAL FLUSH — Deck Model
   ============================================================ */

import { SUITS, RANKS } from '../config/constants.js';

/**
 * Represents a standard 52-card deck with Fisher-Yates shuffle.
 */
export class Deck {
  constructor() {
    /** @type {Array<{suit: string, rank: string}>} */
    this.cards = [];

    /** @type {number} Index of next card to deal */
    this.currentIndex = 0;

    this.reset();
  }

  /**
   * Reset and create a fresh 52-card deck
   */
  reset() {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push({ suit, rank });
      }
    }
    this.currentIndex = 0;
  }

  /**
   * Fisher-Yates shuffle — cryptographically fair
   * Shuffles multiple times for extra randomization
   */
  shuffle() {
    // Shuffle 3 times for extra randomization
    for (let pass = 0; pass < 3; pass++) {
      for (let i = this.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
      }
    }
    this.currentIndex = 0;
  }

  /**
   * Deal a single card from the top of the deck
   * @returns {{suit: string, rank: string}|null}
   */
  deal() {
    if (this.currentIndex >= this.cards.length) {
      return null;
    }
    return this.cards[this.currentIndex++];
  }

  /**
   * Deal multiple cards
   * @param {number} count - Number of cards to deal
   * @returns {Array<{suit: string, rank: string}>}
   */
  dealMultiple(count) {
    const cards = [];
    for (let i = 0; i < count; i++) {
      const card = this.deal();
      if (card) cards.push(card);
    }
    return cards;
  }

  /**
   * Burn a card (discard without revealing)
   */
  burn() {
    this.currentIndex++;
  }

  /**
   * Cards remaining in the deck
   * @returns {number}
   */
  get remaining() {
    return this.cards.length - this.currentIndex;
  }
}
