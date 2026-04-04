/* ============================================================
   ROYAL FLUSH — Base Component
   
   Abstract base class for all UI components.
   Provides lifecycle hooks, DOM management, and cleanup.
   ============================================================ */

import { createElement, clearChildren } from '../utils/dom.js';

/**
 * BaseComponent
 * 
 * All UI views and components extend this class.
 * Provides: mount/unmount lifecycle, event cleanup,
 * and a consistent rendering API.
 */
export class BaseComponent {
  /**
   * @param {HTMLElement} parentEl - Parent element to render into
   * @param {Object} services - Shared service instances (socket, gameState, router)
   * @param {Object} [options={}] - Component options
   */
  constructor(parentEl, services = {}, options = {}) {
    /** @type {HTMLElement} */
    this.parentEl = parentEl;

    /** @type {Object} */
    this.services = services;

    /** @type {Object} */
    this.options = options;

    /** @type {HTMLElement|null} Root element of this component */
    this.el = null;

    /** @type {Array<Function>} Cleanup functions to call on destroy */
    this._cleanups = [];

    /** @type {boolean} */
    this._mounted = false;
  }

  /**
   * Create the component's DOM structure.
   * Override in subclasses.
   * @returns {HTMLElement}
   */
  create() {
    return createElement('div', { class: 'component' });
  }

  /**
   * Render the component into its parent element.
   * Calls create() and mounts the result.
   */
  async render() {
    // Remove previous content
    clearChildren(this.parentEl);

    // Create DOM
    this.el = this.create();
    this.parentEl.appendChild(this.el);

    // Lifecycle hook
    this._mounted = true;
    this.onMount();
  }

  /**
   * Called after the component is mounted to the DOM.
   * Override to set up event listeners, timers, etc.
   */
  onMount() {}

  /**
   * Called before the component is removed from the DOM.
   * Override for custom cleanup.
   */
  onUnmount() {}

  /**
   * Destroy the component — clean up everything.
   */
  destroy() {
    this.onUnmount();

    // Run all registered cleanups
    for (const cleanup of this._cleanups) {
      try { cleanup(); } catch (e) { /* ignore */ }
    }
    this._cleanups = [];

    // Remove DOM
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
    this._mounted = false;
  }

  /**
   * Register a cleanup function (called on destroy)
   * @param {Function} fn
   */
  addCleanup(fn) {
    this._cleanups.push(fn);
  }

  /**
   * Subscribe to game state changes with auto-cleanup
   * @param {string} key - State key
   * @param {Function} callback
   */
  watchState(key, callback) {
    const unsubscribe = this.services.gameState?.subscribe(key, callback);
    if (unsubscribe) this.addCleanup(unsubscribe);
  }

  /**
   * Listen to a socket event with auto-cleanup
   * @param {string} event
   * @param {Function} handler
   */
  onSocket(event, handler) {
    this.services.socket?.on(event, handler);
    this.addCleanup(() => this.services.socket?.off(event, handler));
  }

  /**
   * Set a timeout with auto-cleanup
   * @param {Function} fn
   * @param {number} delay
   * @returns {number} Timer ID
   */
  setTimeout(fn, delay) {
    const id = setTimeout(fn, delay);
    this.addCleanup(() => clearTimeout(id));
    return id;
  }

  /**
   * Set an interval with auto-cleanup
   * @param {Function} fn
   * @param {number} interval
   * @returns {number} Timer ID
   */
  setInterval(fn, interval) {
    const id = setInterval(fn, interval);
    this.addCleanup(() => clearInterval(id));
    return id;
  }

  /**
   * Helper: Quick query within this component
   * @param {string} selector
   * @returns {HTMLElement|null}
   */
  $(selector) {
    return this.el?.querySelector(selector) || null;
  }

  /**
   * Helper: Query all within this component
   * @param {string} selector
   * @returns {HTMLElement[]}
   */
  $$(selector) {
    return Array.from(this.el?.querySelectorAll(selector) || []);
  }
}
