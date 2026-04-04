/* ============================================================
   ROYAL FLUSH — Socket.IO Client Service
   
   Manages the WebSocket connection to the game server.
   Provides a clean event-driven API for all socket operations.
   ============================================================ */

import { SOCKET_EVENTS, TIMING } from '../utils/constants.js';

/**
 * SocketService
 * 
 * Wraps Socket.IO client with reconnection logic,
 * event registration, and connection state management.
 */
export class SocketService {
  /**
   * @param {string} serverUrl - Backend server URL
   */
  constructor(serverUrl) {
    /** @type {string} */
    this.serverUrl = serverUrl;

    /** @type {object|null} Socket.IO client instance */
    this.socket = null;

    /** @type {boolean} */
    this.isConnected = false;

    /** @type {Map<string, Set<Function>>} Custom event listeners */
    this.listeners = new Map();

    /** @type {number} */
    this.reconnectAttempts = 0;

    console.log(`[SocketService] Initialized. Server: ${serverUrl}`);
  }

  /**
   * Connect to the server.
   * Dynamically imports socket.io-client to keep initial bundle small.
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      // Dynamic import for code splitting
      const { io } = await import('socket.io-client');

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: TIMING.RECONNECT_MAX_ATTEMPTS,
        reconnectionDelay: TIMING.RECONNECT_INTERVAL,
        timeout: 10000,
      });

      this.setupCoreListeners();

      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log(`[SocketService] Connected. ID: ${this.socket.id}`);
          resolve();
        });

        this.socket.on('connect_error', (err) => {
          console.error('[SocketService] Connection error:', err.message);
          reject(err);
        });

        // Timeout fallback
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      });
    } catch (error) {
      console.error('[SocketService] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Set up core socket event listeners
   */
  setupCoreListeners() {
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.warn(`[SocketService] Disconnected: ${reason}`);
      this.emit('connectionChange', { connected: false, reason });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log(`[SocketService] Reconnected after ${attemptNumber} attempts.`);
      this.emit('connectionChange', { connected: true });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.reconnectAttempts = attemptNumber;
      console.log(`[SocketService] Reconnection attempt #${attemptNumber}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[SocketService] Reconnection failed after max attempts.');
      this.emit('connectionChange', { connected: false, failed: true });
    });
  }

  /**
   * Send an event to the server
   * @param {string} event - Event name
   * @param {*} data - Event payload
   * @param {Function} [callback] - Acknowledgement callback
   */
  send(event, data, callback) {
    if (!this.socket || !this.isConnected) {
      console.warn(`[SocketService] Cannot send "${event}" — not connected.`);
      return;
    }

    if (callback) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }
  }

  /**
   * Register a listener for a server event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    // Register on underlying socket for server events
    if (this.socket) {
      this.socket.on(event, handler);
    }

    // Also store in our listener map for custom events and cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
  }

  /**
   * Remove a listener for an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler to remove
   */
  off(event, handler) {
    if (this.socket) {
      this.socket.off(event, handler);
    }

    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
    }
  }

  /**
   * Emit a custom client-side event (for internal communication)
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const handler of this.listeners.get(event)) {
        handler(data);
      }
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
      console.log('[SocketService] Disconnected.');
    }
  }

  /**
   * Get the socket ID
   * @returns {string|null}
   */
  get id() {
    return this.socket?.id || null;
  }
}
