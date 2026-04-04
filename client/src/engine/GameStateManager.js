/* ============================================================
   ROYAL FLUSH — Client-Side Game State Manager
   
   Manages the client's local copy of the game state.
   Acts as a single source of truth for UI rendering.
   Uses an observer pattern to notify components of changes.
   ============================================================ */

import { GAME_PHASES } from '../utils/constants.js';

/**
 * GameStateManager
 * 
 * Client-side state container with observer pattern.
 * All UI components subscribe to state changes through this manager.
 * The state is READ-ONLY on the client — only the server can
 * mutate game state via socket events.
 */
export class GameStateManager {
  constructor() {
    /** @type {Object} The current game state */
    this.state = this.getDefaultState();

    /** @type {Map<string, Set<Function>>} Observers by state key */
    this.observers = new Map();

    console.log('[GameStateManager] Initialized with default state.');
  }

  /**
   * Get the default/initial state
   * @returns {Object}
   */
  getDefaultState() {
    return {
      // Player identity
      playerId: null,
      playerName: null,

      // Room state
      roomId: null,
      roomName: null,
      players: [],         // Array of player objects at the table
      maxPlayers: 9,

      // Game state
      phase: GAME_PHASES.WAITING,
      dealerIndex: -1,
      activePlayerIndex: -1,
      pot: 0,
      sidePots: [],
      communityCards: [],   // Shared cards on the table
      holeCards: [],         // This player's private cards

      // Betting
      currentBet: 0,
      minimumRaise: 0,
      blinds: { small: 10, big: 20 },

      // Round tracking
      roundNumber: 0,
      winners: [],

      // UI state
      isMyTurn: false,
      turnTimeRemaining: 0,
      availableActions: [],
      lastAction: null,

      // Connection
      isConnected: false,
    };
  }

  /**
   * Update one or more state properties and notify observers.
   * @param {Object} updates - Key-value pairs to update
   */
  update(updates) {
    const changedKeys = [];

    for (const [key, value] of Object.entries(updates)) {
      if (this.state[key] !== value) {
        this.state[key] = value;
        changedKeys.push(key);
      }
    }

    // Notify observers for each changed key
    for (const key of changedKeys) {
      this.notifyObservers(key, this.state[key]);
    }

    // Always fire a general 'stateChange' event
    if (changedKeys.length > 0) {
      this.notifyObservers('stateChange', { keys: changedKeys, state: this.state });
    }
  }

  /**
   * Replace the entire game state (e.g., on full state sync from server)
   * @param {Object} fullState - Complete state object from server
   */
  replaceState(fullState) {
    this.state = { ...this.getDefaultState(), ...fullState };
    this.notifyObservers('stateChange', { keys: Object.keys(fullState), state: this.state });
    console.log('[GameStateManager] Full state replaced.');
  }

  /**
   * Reset to default state
   */
  reset() {
    this.state = this.getDefaultState();
    this.notifyObservers('stateChange', { keys: ['reset'], state: this.state });
    console.log('[GameStateManager] State reset to defaults.');
  }

  /**
   * Get current state value by key
   * @param {string} key - State key
   * @returns {*}
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Get the full state snapshot
   * @returns {Object}
   */
  getSnapshot() {
    return { ...this.state };
  }

  /**
   * Subscribe to changes for a specific state key
   * @param {string} key - State key to observe
   * @param {Function} callback - Called with new value
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this.observers.has(key)) {
      this.observers.set(key, new Set());
    }

    this.observers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      this.observers.get(key)?.delete(callback);
    };
  }

  /**
   * Notify all observers for a given key
   * @param {string} key - State key
   * @param {*} value - New value
   */
  notifyObservers(key, value) {
    if (this.observers.has(key)) {
      for (const callback of this.observers.get(key)) {
        try {
          callback(value);
        } catch (err) {
          console.error(`[GameStateManager] Observer error for "${key}":`, err);
        }
      }
    }
  }

  /**
   * Remove all observers (cleanup)
   */
  clearObservers() {
    this.observers.clear();
  }
}
