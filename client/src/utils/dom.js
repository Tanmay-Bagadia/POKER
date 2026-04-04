/* ============================================================
   ROYAL FLUSH — DOM Utility Functions
   
   Pure utility functions for DOM manipulation, element
   creation, and common UI operations.
   ============================================================ */

/**
 * Create an HTML element with optional attributes and children.
 * 
 * @param {string} tag - HTML tag name
 * @param {Object} [attrs={}] - Attributes and properties
 * @param {...(string|HTMLElement)} children - Child elements or text
 * @returns {HTMLElement}
 * 
 * @example
 * const card = createElement('div', { class: 'card', id: 'card-1' },
 *   createElement('span', { class: 'card__rank' }, 'A'),
 *   createElement('span', { class: 'card__suit text-red' }, '♥')
 * );
 */
export function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class' || key === 'className') {
      if (Array.isArray(value)) {
        el.classList.add(...value.filter(Boolean));
      } else if (typeof value === 'string') {
        el.className = value;
      }
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        el.dataset[dataKey] = dataValue;
      }
    } else if (key.startsWith('on') && typeof value === 'function') {
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, value);
    } else if (key === 'innerHTML') {
      el.innerHTML = value;
    } else {
      el.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof HTMLElement) {
      el.appendChild(child);
    } else if (Array.isArray(child)) {
      child.forEach(c => {
        if (c instanceof HTMLElement) el.appendChild(c);
      });
    }
  }

  return el;
}

/**
 * Shorthand query selector
 * @param {string} selector - CSS selector
 * @param {HTMLElement} [parent=document] - Parent element
 * @returns {HTMLElement|null}
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Shorthand query selector all
 * @param {string} selector - CSS selector
 * @param {HTMLElement} [parent=document] - Parent element
 * @returns {HTMLElement[]}
 */
export function $$(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

/**
 * Clear all children from an element
 * @param {HTMLElement} el - Element to clear
 */
export function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * Animate an element with a CSS animation class, then clean up.
 * @param {HTMLElement} el - Element to animate
 * @param {string} animationClass - CSS class with animation
 * @returns {Promise<void>} - Resolves when animation ends
 */
export function animateElement(el, animationClass) {
  return new Promise((resolve) => {
    el.classList.add(animationClass);

    const handleEnd = () => {
      el.classList.remove(animationClass);
      el.removeEventListener('animationend', handleEnd);
      resolve();
    };

    el.addEventListener('animationend', handleEnd);
  });
}

/**
 * Wait for next animation frame (useful for batch DOM updates)
 * @returns {Promise<void>}
 */
export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/**
 * Format a number as chip value (e.g., 1500 → "1,500" or "1.5K")
 * @param {number} value - Chip value
 * @param {boolean} [compact=false] - Use compact notation
 * @returns {string}
 */
export function formatChips(value, compact = false) {
  if (compact && value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (compact && value >= 10000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Generate a simple unique ID
 * @param {string} [prefix=''] - Optional prefix
 * @returns {string}
 */
export function uniqueId(prefix = '') {
  const id = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Clamp a value between min and max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
