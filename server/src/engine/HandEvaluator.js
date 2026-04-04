/* ============================================================
   ROYAL FLUSH — Hand Evaluator
   
   Complete Texas Hold'em hand evaluator.
   Evaluates the best 5-card hand from 7 cards (2 hole + 5 community).
   Supports all 10 standard poker hand rankings with kicker comparison.
   ============================================================ */

import { HAND_RANKINGS } from '../config/constants.js';

const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

const HAND_NAMES = {
  [HAND_RANKINGS.ROYAL_FLUSH]: 'Royal Flush',
  [HAND_RANKINGS.STRAIGHT_FLUSH]: 'Straight Flush',
  [HAND_RANKINGS.FOUR_OF_A_KIND]: 'Four of a Kind',
  [HAND_RANKINGS.FULL_HOUSE]: 'Full House',
  [HAND_RANKINGS.FLUSH]: 'Flush',
  [HAND_RANKINGS.STRAIGHT]: 'Straight',
  [HAND_RANKINGS.THREE_OF_A_KIND]: 'Three of a Kind',
  [HAND_RANKINGS.TWO_PAIR]: 'Two Pair',
  [HAND_RANKINGS.ONE_PAIR]: 'One Pair',
  [HAND_RANKINGS.HIGH_CARD]: 'High Card',
};

export class HandEvaluator {
  /**
   * Evaluate the best 5-card hand from 7 cards.
   * @param {Array<{suit: string, rank: string}>} cards - 7 cards
   * @returns {{ranking: number, name: string, score: number, bestCards: Array}}
   */
  static evaluate(cards) {
    if (!cards || cards.length < 5) {
      return { ranking: 0, name: 'No Hand', score: 0, bestCards: [] };
    }

    const combos = HandEvaluator.getCombinations(cards, 5);
    let bestHand = null;

    for (const combo of combos) {
      const hand = HandEvaluator.evaluateFive(combo);
      if (!bestHand || hand.score > bestHand.score) {
        bestHand = hand;
      }
    }

    return bestHand;
  }

  /**
   * Evaluate exactly 5 cards.
   * @param {Array<{suit: string, rank: string}>} cards
   * @returns {{ranking: number, name: string, score: number, bestCards: Array}}
   */
  static evaluateFive(cards) {
    const values = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);

    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = HandEvaluator.checkStraight(values);

    // Check for A-2-3-4-5 straight (wheel)
    const isWheel = HandEvaluator.checkWheel(values);
    const straightHigh = isWheel ? 5 : (isStraight ? values[0] : 0);

    const groups = HandEvaluator.getGroups(values);
    const groupKeys = Object.keys(groups).map(Number).sort((a, b) => {
      // Sort by count descending, then by value descending
      if (groups[b] !== groups[a]) return groups[b] - groups[a];
      return b - a;
    });

    const counts = groupKeys.map(k => groups[k]);

    let ranking, score;

    if (isFlush && (isStraight || isWheel)) {
      if (values[0] === 14 && isStraight) {
        // Royal Flush
        ranking = HAND_RANKINGS.ROYAL_FLUSH;
        score = HandEvaluator.makeScore(ranking, [14]);
      } else {
        // Straight Flush
        ranking = HAND_RANKINGS.STRAIGHT_FLUSH;
        score = HandEvaluator.makeScore(ranking, [straightHigh]);
      }
    } else if (counts[0] === 4) {
      ranking = HAND_RANKINGS.FOUR_OF_A_KIND;
      const quadVal = groupKeys[0];
      const kicker = groupKeys[1];
      score = HandEvaluator.makeScore(ranking, [quadVal, kicker]);
    } else if (counts[0] === 3 && counts[1] === 2) {
      ranking = HAND_RANKINGS.FULL_HOUSE;
      score = HandEvaluator.makeScore(ranking, [groupKeys[0], groupKeys[1]]);
    } else if (isFlush) {
      ranking = HAND_RANKINGS.FLUSH;
      score = HandEvaluator.makeScore(ranking, values);
    } else if (isStraight || isWheel) {
      ranking = HAND_RANKINGS.STRAIGHT;
      score = HandEvaluator.makeScore(ranking, [straightHigh]);
    } else if (counts[0] === 3) {
      ranking = HAND_RANKINGS.THREE_OF_A_KIND;
      score = HandEvaluator.makeScore(ranking, [groupKeys[0], groupKeys[1], groupKeys[2]]);
    } else if (counts[0] === 2 && counts[1] === 2) {
      ranking = HAND_RANKINGS.TWO_PAIR;
      const highPair = Math.max(groupKeys[0], groupKeys[1]);
      const lowPair = Math.min(groupKeys[0], groupKeys[1]);
      score = HandEvaluator.makeScore(ranking, [highPair, lowPair, groupKeys[2]]);
    } else if (counts[0] === 2) {
      ranking = HAND_RANKINGS.ONE_PAIR;
      score = HandEvaluator.makeScore(ranking, [groupKeys[0], groupKeys[1], groupKeys[2], groupKeys[3]]);
    } else {
      ranking = HAND_RANKINGS.HIGH_CARD;
      score = HandEvaluator.makeScore(ranking, values);
    }

    return {
      ranking,
      name: HAND_NAMES[ranking],
      score,
      bestCards: cards,
    };
  }

  /**
   * Check if values form a straight (already sorted descending).
   */
  static checkStraight(values) {
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] - values[i + 1] !== 1) return false;
    }
    return true;
  }

  /**
   * Check for wheel (A-2-3-4-5).
   */
  static checkWheel(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 4 && sorted[3] === 5 && sorted[4] === 14;
  }

  /**
   * Group values by count.
   * @returns {Object} value → count
   */
  static getGroups(values) {
    const groups = {};
    for (const v of values) {
      groups[v] = (groups[v] || 0) + 1;
    }
    return groups;
  }

  /**
   * Create a numeric score for hand comparison.
   * Higher score = better hand. Uses base-15 encoding to pack values.
   */
  static makeScore(ranking, values) {
    let score = ranking * Math.pow(15, 6);
    for (let i = 0; i < values.length && i < 5; i++) {
      score += values[i] * Math.pow(15, 5 - i);
    }
    return score;
  }

  /**
   * Get all C(n,k) combinations.
   */
  static getCombinations(arr, k) {
    const results = [];
    function combine(start, current) {
      if (current.length === k) {
        results.push([...current]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        current.push(arr[i]);
        combine(i + 1, current);
        current.pop();
      }
    }
    combine(0, []);
    return results;
  }

  /**
   * Compare two evaluated hands.
   * @returns {number} Positive if A wins, negative if B wins, 0 if tie.
   */
  static compare(handA, handB) {
    return handA.score - handB.score;
  }

  /**
   * Determine winner(s) from multiple player hands.
   * @param {Array<{playerId: string, cards: Array}>} playerHands
   * @param {Array} communityCards
   * @returns {Array<{playerId: string, hand: Object}>} Winner(s) — may be multiple for ties.
   */
  static determineWinners(playerHands, communityCards) {
    const evaluations = playerHands.map(ph => {
      const allCards = [...ph.cards, ...communityCards];
      const hand = HandEvaluator.evaluate(allCards);
      return { playerId: ph.playerId, hand };
    });

    // Sort by score descending
    evaluations.sort((a, b) => b.hand.score - a.hand.score);

    const bestScore = evaluations[0].hand.score;
    // All players with the best score are winners (split pot)
    return evaluations.filter(e => e.hand.score === bestScore);
  }
}
