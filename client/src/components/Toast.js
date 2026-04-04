/* ============================================================
   ROYAL FLUSH — Toast Notification System
   ============================================================ */

import { createElement } from '../utils/dom.js';
import { TIMING } from '../utils/constants.js';

/**
 * Toast notification manager.
 * Creates a fixed container and spawns animated toast messages.
 */
class ToastManager {
  constructor() {
    /** @type {HTMLElement} Container for toasts */
    this.container = null;
    this.init();
  }

  init() {
    this.container = createElement('div', {
      id: 'toast-container',
      class: 'toast-container',
    });
    document.body.appendChild(this.container);
  }

  /**
   * Show a toast notification
   * @param {string} message - Toast message
   * @param {'info'|'success'|'warning'|'error'} [type='info'] - Toast type
   * @param {number} [duration] - Display duration in ms
   */
  show(message, type = 'info', duration = TIMING.TOAST_DURATION) {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };

    const toast = createElement('div', { class: `toast toast--${type}` },
      createElement('span', { class: 'toast__icon' }, icons[type] || 'ℹ️'),
      createElement('span', { class: 'toast__message' }, message),
      createElement('button', {
        class: 'toast__close',
        onClick: () => this.dismiss(toast),
      }, '×')
    );

    this.container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('toast--visible');
    });

    // Auto-dismiss
    const timer = setTimeout(() => this.dismiss(toast), duration);
    toast._timer = timer;
  }

  /**
   * Dismiss a toast with exit animation
   * @param {HTMLElement} toast
   */
  dismiss(toast) {
    if (toast._timer) clearTimeout(toast._timer);
    toast.classList.remove('toast--visible');
    toast.classList.add('toast--exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    // Fallback removal
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
  }

  /** Convenience methods */
  info(msg, dur)    { this.show(msg, 'info', dur); }
  success(msg, dur) { this.show(msg, 'success', dur); }
  warning(msg, dur) { this.show(msg, 'warning', dur); }
  error(msg, dur)   { this.show(msg, 'error', dur); }
}

// Singleton
export const toast = new ToastManager();
export default toast;
