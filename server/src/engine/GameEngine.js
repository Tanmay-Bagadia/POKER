/* ============================================================
   ROYAL FLUSH — Game Engine
   
   Server-authoritative Texas Hold'em engine.
   Manages full game lifecycle: dealing, blinds, betting rounds,
   community cards, showdown, and pot distribution.
   ============================================================ */

import { Deck } from './Deck.js';
import { HandEvaluator } from './HandEvaluator.js';
import { GAME_PHASES, PLAYER_ACTIONS } from '../config/constants.js';
import config from '../config/index.js';
import Logger from '../utils/logger.js';

const log = new Logger('GameEngine');

export class GameEngine {
  /**
   * @param {import('../models/Room.js').Room} room
   * @param {Function} broadcastToRoom - fn(roomId, event, data)
   * @param {Function} sendToPlayer - fn(socketId, event, data)
   */
  constructor(room, broadcastToRoom, sendToPlayer) {
    this.room = room;
    this.deck = new Deck();
    this.broadcastToRoom = broadcastToRoom;
    this.sendToPlayer = sendToPlayer;
    this.turnTimer = null;
    this.turnStartTime = null;
    this.turnDuration = config.game.turnTimeout;
    this.bettingRoundComplete = false;
    this.roundActive = false;
    this.lastRaiseAmount = 0;

    log.info(`Engine created for room "${room.name}"`);
  }

  /* ─── Round Lifecycle ────────────────────────────── */

  startRound() {
    const players = this.getSeatedPlayers();
    if (players.length < 2) {
      log.warn(`[${this.room.name}] Not enough players to start.`);
      return false;
    }

    this.roundActive = true;
    this.room.roundNumber++;
    this.room.phase = GAME_PHASES.PRE_FLOP;
    this.room.communityCards = [];
    this.room.pot = 0;
    this.room.sidePots = [];
    this.room.currentBet = 0;
    this.lastRaiseAmount = this.room.blinds.big;

    // Reset players
    for (const p of players) {
      p.resetForNewHand();
    }

    // Move dealer
    this.advanceDealer();

    // New deck
    this.deck.reset();
    this.deck.shuffle();

    // Deal hole cards
    this.dealHoleCards();

    // Post blinds
    this.postBlinds();

    // Start first betting round (player after big blind)
    const bbIndex = this.getPositionIndex('bb');
    this.room.activePlayerIndex = this.nextActivePlayerAfter(bbIndex);

    // Broadcast game start
    this.broadcastState('game:round:start');
    this.sendPrivateCards();
    this.startTurnTimer();

    log.info(`[${this.room.name}] Round ${this.room.roundNumber} started. Dealer: seat ${this.room.dealerIndex}`);
    return true;
  }

  dealHoleCards() {
    const players = this.getSeatedPlayers();
    for (const player of players) {
      player.holeCards = this.deck.dealMultiple(2);
    }
  }

  postBlinds() {
    const players = this.getSeatedPlayers();
    const sbIndex = this.getPositionIndex('sb');
    const bbIndex = this.getPositionIndex('bb');

    const sbPlayer = players[sbIndex];
    const bbPlayer = players[bbIndex];

    const sbAmount = sbPlayer.placeBet(this.room.blinds.small);
    const bbAmount = bbPlayer.placeBet(this.room.blinds.big);

    this.room.pot += sbAmount + bbAmount;
    this.room.currentBet = this.room.blinds.big;

    log.info(`[${this.room.name}] Blinds: SB=${sbPlayer.name}(${sbAmount}), BB=${bbPlayer.name}(${bbAmount})`);
  }

  /* ─── Player Actions ─────────────────────────────── */

  handleAction(playerId, action, amount = 0) {
    const player = this.room.players.get(playerId);
    if (!player) return { success: false, error: 'Player not found.' };

    const players = this.getSeatedPlayers();
    const activePlayer = players[this.room.activePlayerIndex];
    if (!activePlayer || activePlayer.id !== playerId) {
      return { success: false, error: 'Not your turn.' };
    }

    if (!this.roundActive) {
      return { success: false, error: 'No active round.' };
    }

    const available = this.getAvailableActions(player);
    if (!available.includes(action)) {
      return { success: false, error: `Action "${action}" not available.` };
    }

    this.clearTurnTimer();

    switch (action) {
      case PLAYER_ACTIONS.FOLD:
        player.fold();
        log.info(`[${this.room.name}] ${player.name} folds.`);
        break;

      case PLAYER_ACTIONS.CHECK:
        log.info(`[${this.room.name}] ${player.name} checks.`);
        break;

      case PLAYER_ACTIONS.CALL: {
        const callAmount = this.room.currentBet - player.currentBet;
        const actualBet = player.placeBet(callAmount);
        this.room.pot += actualBet;
        log.info(`[${this.room.name}] ${player.name} calls ${actualBet}.`);
        break;
      }

      case PLAYER_ACTIONS.BET: {
        const betAmount = Math.max(amount, this.room.blinds.big);
        const actualBet = player.placeBet(betAmount);
        this.room.pot += actualBet;
        this.room.currentBet = player.currentBet;
        this.lastRaiseAmount = betAmount;
        log.info(`[${this.room.name}] ${player.name} bets ${actualBet}.`);
        break;
      }

      case PLAYER_ACTIONS.RAISE: {
        const minRaise = this.room.currentBet + this.lastRaiseAmount;
        const raiseAmount = Math.max(amount, minRaise);
        const toCall = this.room.currentBet - player.currentBet;
        const totalNeeded = toCall + (raiseAmount - this.room.currentBet);
        const actualBet = player.placeBet(totalNeeded);
        this.room.pot += actualBet;
        this.lastRaiseAmount = player.currentBet - this.room.currentBet;
        this.room.currentBet = player.currentBet;
        log.info(`[${this.room.name}] ${player.name} raises to ${player.currentBet}.`);
        break;
      }

      case PLAYER_ACTIONS.ALL_IN: {
        const allInAmount = player.chips;
        const actualBet = player.placeBet(allInAmount);
        this.room.pot += actualBet;
        if (player.currentBet > this.room.currentBet) {
          this.lastRaiseAmount = player.currentBet - this.room.currentBet;
          this.room.currentBet = player.currentBet;
        }
        log.info(`[${this.room.name}] ${player.name} ALL-IN for ${actualBet}! Total: ${player.currentBet}`);
        break;
      }

      default:
        return { success: false, error: 'Unknown action.' };
    }

    // Broadcast the action
    this.broadcastToRoom(this.room.id, 'game:action', {
      playerId, playerName: player.name, action, amount,
    });

    // Check if only one player remains
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 1) {
      this.handleSingleWinner(activePlayers[0]);
      return { success: true };
    }

    // Advance to next player or next phase
    this.advanceTurn();

    return { success: true };
  }

  advanceTurn() {
    const players = this.getSeatedPlayers();
    const nextIdx = this.nextActivePlayerAfter(this.room.activePlayerIndex);

    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.endBettingRound();
    } else {
      this.room.activePlayerIndex = nextIdx;
      this.broadcastState('game:turn:change');
      this.sendPrivateCards();
      this.startTurnTimer();
    }
  }

  isBettingRoundComplete() {
    const players = this.getActivePlayers();
    // All active non-all-in players must have matched the current bet
    const actingPlayers = players.filter(p => !p.isAllIn);
    if (actingPlayers.length === 0) return true;

    const allMatched = actingPlayers.every(p => p.currentBet === this.room.currentBet);
    if (!allMatched) return false;

    // Also check we've gone around at least once (next player is the first who bet)
    const nextIdx = this.nextActivePlayerAfter(this.room.activePlayerIndex);
    const seatedPlayers = this.getSeatedPlayers();
    const nextPlayer = seatedPlayers[nextIdx];
    
    if (nextPlayer && nextPlayer.currentBet === this.room.currentBet && !nextPlayer.isAllIn) {
      return true;
    }

    return false;
  }

  endBettingRound() {
    // Reset current bets for new round
    const players = this.getSeatedPlayers();
    for (const p of players) {
      p.currentBet = 0;
    }
    this.room.currentBet = 0;
    this.lastRaiseAmount = this.room.blinds.big;

    const activePlayers = this.getActivePlayers();
    const actingPlayers = activePlayers.filter(p => !p.isAllIn);

    switch (this.room.phase) {
      case GAME_PHASES.PRE_FLOP:
        this.room.phase = GAME_PHASES.FLOP;
        this.deck.burn();
        this.room.communityCards = this.deck.dealMultiple(3);
        log.info(`[${this.room.name}] FLOP: ${this.formatCards(this.room.communityCards)}`);
        break;

      case GAME_PHASES.FLOP:
        this.room.phase = GAME_PHASES.TURN;
        this.deck.burn();
        this.room.communityCards.push(this.deck.deal());
        log.info(`[${this.room.name}] TURN: ${this.formatCards(this.room.communityCards)}`);
        break;

      case GAME_PHASES.TURN:
        this.room.phase = GAME_PHASES.RIVER;
        this.deck.burn();
        this.room.communityCards.push(this.deck.deal());
        log.info(`[${this.room.name}] RIVER: ${this.formatCards(this.room.communityCards)}`);
        break;

      case GAME_PHASES.RIVER:
        this.showdown();
        return;
    }

    // If only 1 or fewer players can act, skip to showdown
    if (actingPlayers.length <= 1) {
      // Run out remaining community cards
      while (this.room.communityCards.length < 5) {
        this.deck.burn();
        this.room.communityCards.push(this.deck.deal());
      }
      this.showdown();
      return;
    }

    // Start next betting round from first active player after dealer
    this.room.activePlayerIndex = this.nextActivePlayerAfter(this.room.dealerIndex);
    this.broadcastState('game:community:cards');
    this.sendPrivateCards();
    this.startTurnTimer();
  }

  /* ─── Showdown & Winners ─────────────────────────── */

  showdown() {
    this.room.phase = GAME_PHASES.SHOWDOWN;
    this.clearTurnTimer();
    this.roundActive = false;

    const activePlayers = this.getActivePlayers();

    const playerHands = activePlayers.map(p => ({
      playerId: p.id,
      cards: p.holeCards,
    }));

    const winners = HandEvaluator.determineWinners(playerHands, this.room.communityCards);
    const winAmount = Math.floor(this.room.pot / winners.length);

    const winnerData = winners.map(w => {
      const player = this.room.players.get(w.playerId);
      player.awardChips(winAmount);
      return {
        playerId: w.playerId,
        playerName: player.name,
        hand: w.hand,
        chips: winAmount,
      };
    });

    // Reveal all active players' hole cards
    const revealedCards = {};
    for (const p of activePlayers) {
      revealedCards[p.id] = p.holeCards;
    }

    this.broadcastToRoom(this.room.id, 'game:showdown', {
      winners: winnerData,
      revealedCards,
      communityCards: this.room.communityCards,
      pot: this.room.pot,
    });

    log.info(`[${this.room.name}] Showdown! Winner(s): ${winnerData.map(w => `${w.playerName} (${w.hand.name})`).join(', ')}`);

    // Reset for next round after delay
    setTimeout(() => {
      this.room.phase = GAME_PHASES.WAITING;
      this.room.pot = 0;
      this.room.communityCards = [];
      this.room.currentBet = 0;
      this.room.activePlayerIndex = -1;

      // Remove busted players
      for (const p of this.room.players.values()) {
        if (p.chips <= 0) {
          log.info(`[${this.room.name}] ${p.name} is busted!`);
        }
      }

      this.broadcastState('game:round:end');
    }, 5000);
  }

  handleSingleWinner(winner) {
    this.clearTurnTimer();
    this.roundActive = false;
    this.room.phase = GAME_PHASES.SHOWDOWN;

    winner.awardChips(this.room.pot);

    this.broadcastToRoom(this.room.id, 'game:showdown', {
      winners: [{
        playerId: winner.id,
        playerName: winner.name,
        hand: { name: 'Last Standing', ranking: 0 },
        chips: this.room.pot,
      }],
      revealedCards: {},
      communityCards: this.room.communityCards,
      pot: this.room.pot,
    });

    log.info(`[${this.room.name}] ${winner.name} wins ${this.room.pot} (everyone else folded).`);

    setTimeout(() => {
      this.room.phase = GAME_PHASES.WAITING;
      this.room.pot = 0;
      this.room.communityCards = [];
      this.room.currentBet = 0;
      this.room.activePlayerIndex = -1;
      this.broadcastState('game:round:end');
    }, 3000);
  }

  /* ─── Turn Timer ─────────────────────────────────── */

  startTurnTimer() {
    this.clearTurnTimer();
    this.turnStartTime = Date.now();

    // Broadcast timer start
    this.broadcastToRoom(this.room.id, 'game:timer', {
      activePlayerIndex: this.room.activePlayerIndex,
      duration: this.turnDuration,
    });

    this.turnTimer = setTimeout(() => {
      // Auto-fold on timeout
      const players = this.getSeatedPlayers();
      const activePlayer = players[this.room.activePlayerIndex];
      if (activePlayer && this.roundActive) {
        log.warn(`[${this.room.name}] ${activePlayer.name} timed out — auto-folding.`);
        this.handleAction(activePlayer.id, PLAYER_ACTIONS.FOLD);
      }
    }, this.turnDuration);
  }

  clearTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  /* ─── Helper Methods ─────────────────────────────── */

  getAvailableActions(player) {
    const actions = [PLAYER_ACTIONS.FOLD];

    if (player.currentBet === this.room.currentBet) {
      actions.push(PLAYER_ACTIONS.CHECK);
    }

    if (this.room.currentBet > player.currentBet && player.chips > 0) {
      actions.push(PLAYER_ACTIONS.CALL);
    }

    if (this.room.currentBet === 0 && player.chips > 0) {
      actions.push(PLAYER_ACTIONS.BET);
    }

    if (this.room.currentBet > 0 && player.chips > (this.room.currentBet - player.currentBet)) {
      actions.push(PLAYER_ACTIONS.RAISE);
    }

    if (player.chips > 0) {
      actions.push(PLAYER_ACTIONS.ALL_IN);
    }

    return actions;
  }

  getSeatedPlayers() {
    return Array.from(this.room.players.values())
      .filter(p => p.isConnected)
      .sort((a, b) => a.seatIndex - b.seatIndex);
  }

  getActivePlayers() {
    return this.getSeatedPlayers().filter(p => !p.isFolded);
  }

  advanceDealer() {
    const players = this.getSeatedPlayers();
    if (players.length === 0) return;

    // Find next dealer
    let current = this.room.dealerIndex;
    for (let i = 0; i < players.length; i++) {
      current = (current + 1) % players.length;
      if (players[current]) {
        this.room.dealerIndex = current;
        return;
      }
    }
  }

  getPositionIndex(position) {
    const players = this.getSeatedPlayers();
    const count = players.length;

    if (count === 2) {
      // Heads-up: dealer is SB, other is BB
      return position === 'sb' ? this.room.dealerIndex : (this.room.dealerIndex + 1) % count;
    }

    switch (position) {
      case 'sb': return (this.room.dealerIndex + 1) % count;
      case 'bb': return (this.room.dealerIndex + 2) % count;
      default: return this.room.dealerIndex;
    }
  }

  nextActivePlayerAfter(index) {
    const players = this.getSeatedPlayers();
    if (players.length === 0) return 0;

    let next = (index + 1) % players.length;
    let attempts = 0;

    while (attempts < players.length) {
      const player = players[next];
      if (player && !player.isFolded && !player.isAllIn) {
        return next;
      }
      next = (next + 1) % players.length;
      attempts++;
    }

    return index; // Fallback
  }

  broadcastState(event) {
    this.broadcastToRoom(this.room.id, event || 'game:state:update', this.room.toState());
  }

  sendPrivateCards() {
    for (const player of this.room.players.values()) {
      if (player.holeCards.length > 0) {
        const players = this.getSeatedPlayers();
        const activePlayer = players[this.room.activePlayerIndex];
        this.sendToPlayer(player.socketId, 'game:private', {
          holeCards: player.holeCards,
          playerId: player.id,
          isMyTurn: activePlayer?.id === player.id,
          availableActions: activePlayer?.id === player.id ? this.getAvailableActions(player) : [],
          callAmount: Math.max(0, this.room.currentBet - player.currentBet),
          minRaise: this.room.currentBet + this.lastRaiseAmount,
          pot: this.room.pot,
        });
      }
    }
  }

  formatCards(cards) {
    const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    return cards.map(c => `${c.rank}${symbols[c.suit]}`).join(' ');
  }

  destroy() {
    this.clearTurnTimer();
    this.roundActive = false;
    log.info(`Engine destroyed for room "${this.room.name}"`);
  }
}
