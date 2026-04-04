/* ============================================================
   ROYAL FLUSH — Application Entry Point
   
   Bootstraps the application: imports styles, initializes
   services, and manages the loading screen lifecycle.
   ============================================================ */

// ── Style Imports (Order matters) ────────────────────────
import './styles/variables.css';
import './styles/reset.css';
import './styles/animations.css';
import './styles/global.css';

// ── Service Imports ──────────────────────────────────────
import { SocketService } from './services/SocketService.js';
import { GameStateManager } from './engine/GameStateManager.js';
import { Router } from './services/Router.js';

// ── Constants ────────────────────────────────────────────
import { APP_CONFIG } from './utils/constants.js';

/**
 * Main Application Controller
 * 
 * Orchestrates the initialization sequence, manages global
 * services, and controls the application lifecycle.
 */
class App {
  constructor() {
    /** @type {SocketService} */
    this.socket = null;

    /** @type {GameStateManager} */
    this.gameState = null;

    /** @type {Router} */
    this.router = null;

    /** @type {HTMLElement} */
    this.rootEl = document.getElementById('app');

    /** @type {HTMLElement} */
    this.loadingScreen = document.getElementById('loading-screen');

    /** @type {HTMLElement} */
    this.loadingBar = document.getElementById('loading-bar-fill');
  }

  /**
   * Boot the application
   * Initializes all services in order, then removes the loading screen.
   */
  async init() {
    try {
      console.log(
        `%c♠ Royal Flush v${APP_CONFIG.VERSION} ♠`,
        'color: #e6a817; font-size: 18px; font-weight: bold; text-shadow: 1px 1px 2px #000;'
      );

      // Step 1: Initialize core services
      this.updateLoadingProgress(20, 'Initializing services...');
      await this.initServices();

      // Step 2: Set up global event listeners
      this.updateLoadingProgress(50, 'Setting up events...');
      this.setupGlobalEvents();

      // Step 3: Initialize router and render initial view
      this.updateLoadingProgress(75, 'Preparing interface...');
      await this.router.init();

      // Step 4: Complete loading
      this.updateLoadingProgress(100, 'Ready!');
      await this.delay(400);
      this.hideLoadingScreen();

      console.log('[App] Initialization complete.');
    } catch (error) {
      console.error('[App] Initialization failed:', error);
      this.showError('Failed to initialize. Please refresh the page.');
    }
  }

  /**
   * Initialize all core services
   */
  async initServices() {
    // Game State Manager (no dependencies)
    this.gameState = new GameStateManager();

    // Socket Service (connects to backend)
    this.socket = new SocketService(APP_CONFIG.SERVER_URL);

    // Router (manages views/screens)
    this.router = new Router(this.rootEl, {
      socket: this.socket,
      gameState: this.gameState,
    });

    console.log('[App] Services initialized.');
  }

  /**
   * Set up global event listeners
   */
  setupGlobalEvents() {
    // Handle visibility change (pause/resume)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('[App] Tab hidden — pausing non-essential updates.');
      } else {
        console.log('[App] Tab visible — resuming updates.');
      }
    });

    // Handle resize for responsive adjustments
    window.addEventListener('resize', this.debounce(() => {
      document.documentElement.style.setProperty(
        '--vh', `${window.innerHeight * 0.01}px`
      );
    }, 150));

    // Set initial viewport height
    document.documentElement.style.setProperty(
      '--vh', `${window.innerHeight * 0.01}px`
    );

    // Prevent context menu on game elements
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.game-table, .card, .chip')) {
        e.preventDefault();
      }
    });

    console.log('[App] Global events registered.');
  }

  /**
   * Update the loading progress bar
   * @param {number} percent - Progress percentage (0-100)
   * @param {string} message - Status message
   */
  updateLoadingProgress(percent, message) {
    if (this.loadingBar) {
      this.loadingBar.style.width = `${percent}%`;
    }

    const subtitle = this.loadingScreen?.querySelector('.loading-screen__subtitle');
    if (subtitle && message) {
      subtitle.textContent = message;
    }
  }

  /**
   * Hide the loading screen with animation
   */
  hideLoadingScreen() {
    if (this.loadingScreen) {
      this.loadingScreen.classList.add('loading-screen--hidden');

      // Remove from DOM after transition
      this.loadingScreen.addEventListener('transitionend', () => {
        this.loadingScreen.remove();
      }, { once: true });
    }
  }

  /**
   * Show an error message on the loading screen
   * @param {string} message - Error message
   */
  showError(message) {
    const subtitle = this.loadingScreen?.querySelector('.loading-screen__subtitle');
    if (subtitle) {
      subtitle.textContent = message;
      subtitle.style.color = 'var(--clr-red-400)';
    }
  }

  /**
   * Simple debounce utility
   * @param {Function} fn - Function to debounce
   * @param {number} wait - Debounce delay in ms
   * @returns {Function}
   */
  debounce(fn, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /**
   * Promise-based delay
   * @param {number} ms - Delay in milliseconds
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ── Bootstrap ────────────────────────────────────────────
const app = new App();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Expose to window for debugging (dev only)
if (import.meta.env.DEV) {
  window.__ROYAL_FLUSH__ = app;
}

export default app;
