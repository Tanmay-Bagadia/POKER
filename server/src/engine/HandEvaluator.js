/* ============================================================
   ROYAL FLUSH — Hand Evaluator (Stub)
   
   Will be fully implemented in Phase 4.
   This stub establishes the class interface.
   ============================================================ */

import { HAND_RANKINGS } from '../config/constants.js';

/**
 * HandEvaluator
 * 
 * Evaluates poker hands from 7 cards (2 hole + 5 community)
 * and returns the best 5-card hand ranking.
 * 
 * Full implementation in Phase 4.
 */
export class HandEvaluator {
  /**
   * Evaluate the best hand from 7 cards
   * @param {Array<{suit: string, rank: string}>} cards - 7 cards (hole + community)
   * @returns {{ranking: number, name: string, bestCards: Array, kickers: Array}}
   */
  static evaluate(cards) {
    // Stub — returns HIGH_CARD for now
    // Full evaluation logic will be implemented in Phase 4
    return {
      ranking: HAND_RANKINGS.HIGH_CARD,
      name: 'High Card',
      bestCards: cards.slice(0, 5),
      kickers: [],
      score: 0,
    };
  }

  /**
   * Compare two hands
   * @param {Object} handA - Result from evaluate()
   * @param {Object} handB - Result from evaluate()
   * @returns {number} Positive if A wins, negative if B wins, 0 if tie
   */
  static compare(handA, handB) {
    return handA.ranking - handB.ranking;
  }
}
