/* ============================================================
   ROYAL FLUSH — Client-Side Router
   
   Simple hash-based router for single-page app navigation.
   Manages view transitions between Landing, Lobby, and Table.
   ============================================================ */

import { ROUTES } from '../utils/constants.js';
import { clearChildren } from '../utils/dom.js';

/**
 * Router
 * 
 * Hash-based SPA router that manages screen transitions.
 * Each route maps to a view-rendering function.
 */
export class Router {
  /**
   * @param {HTMLElement} rootEl - Root DOM element to render views into
   * @param {Object} services - Shared service instances
   * @param {import('./SocketService.js').SocketService} services.socket
   * @param {import('../engine/GameStateManager.js').GameStateManager} services.gameState
   */
  constructor(rootEl, services) {
    /** @type {HTMLElement} */
    this.rootEl = rootEl;

    /** @type {Object} */
    this.services = services;

    /** @type {string} */
    this.currentRoute = null;

    /** @type {Object|null} Current view instance */
    this.currentView = null;

    /** @type {HTMLElement} Main content container */
    this.contentEl = null;

    /** @type {Map<string, Function>} Route → View constructor map */
    this.routes = new Map();
  }

  /**
   * Initialize the router
   */
  async init() {
    // Create the main content container (loading screen is a sibling)
    this.contentEl = document.createElement('div');
    this.contentEl.id = 'main-content';
    this.contentEl.className = 'main-content';
    this.rootEl.appendChild(this.contentEl);

    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRouteChange());

    // Register route placeholders (views will be registered by each phase)
    this.registerRoute(ROUTES.LANDING, null);
    this.registerRoute(ROUTES.LOBBY, null);
    this.registerRoute(ROUTES.TABLE, null);

    // Navigate to current hash or default
    await this.handleRouteChange();

    console.log('[Router] Initialized.');
  }

  /**
   * Register a route with its view constructor
   * @param {string} route - Route name
   * @param {Function|null} ViewClass - View class constructor
   */
  registerRoute(route, ViewClass) {
    this.routes.set(route, ViewClass);
  }

  /**
   * Navigate to a route
   * @param {string} route - Route name
   * @param {Object} [params={}] - Route parameters
   */
  navigate(route, params = {}) {
    const hash = params.roomId
      ? `#${route}/${params.roomId}`
      : `#${route}`;

    window.location.hash = hash;
  }

  /**
   * Handle hash change events
   */
  async handleRouteChange() {
    const hash = window.location.hash.slice(1) || ROUTES.LANDING;
    const [route, ...paramParts] = hash.split('/');
    const params = { roomId: paramParts[0] || null };

    // Don't re-render same route
    if (route === this.currentRoute) return;

    console.log(`[Router] Navigating: ${this.currentRoute || 'none'} → ${route}`);

    // Destroy current view
    if (this.currentView?.destroy) {
      this.currentView.destroy();
    }

    this.currentRoute = route;

    // Get view constructor
    const ViewClass = this.routes.get(route);

    if (ViewClass) {
      // Clear and render new view
      clearChildren(this.contentEl);
      this.currentView = new ViewClass(this.contentEl, this.services, params);

      if (this.currentView.render) {
        await this.currentView.render();
      }
    } else {
      // Placeholder for unregistered routes
      this.renderPlaceholder(route);
    }
  }

  /**
   * Render a placeholder for routes not yet implemented
   * @param {string} route - Route name
   */
  renderPlaceholder(route) {
    clearChildren(this.contentEl);

    this.contentEl.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        gap: var(--space-4);
        text-align: center;
      ">
        <div style="font-size: var(--fs-4xl);">🃏</div>
        <h2 style="
          font-family: var(--font-display);
          font-size: var(--fs-2xl);
          background: linear-gradient(135deg, var(--clr-gold-300), var(--clr-gold-500));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        ">Royal Flush</h2>
        <p style="color: var(--clr-text-secondary); font-size: var(--fs-sm);">
          View "${route}" — Phase 1 scaffolding complete.
        </p>
        <p style="color: var(--clr-text-tertiary); font-size: var(--fs-xs); letter-spacing: var(--ls-wider); text-transform: uppercase;">
          Server & Client Connected Successfully
        </p>
      </div>
    `;
  }
}
