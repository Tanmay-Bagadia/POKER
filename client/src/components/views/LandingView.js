/* ============================================================
   ROYAL FLUSH — Landing View
   
   The first screen players see. Features:
   - Animated hero with card suit motifs
   - Player name input
   - "Enter Lobby" CTA button
   - Background ambient effects
   ============================================================ */

import { BaseComponent } from '../BaseComponent.js';
import { createElement } from '../../utils/dom.js';
import { ROUTES, SOCKET_EVENTS } from '../../utils/constants.js';
import toast from '../Toast.js';
import '../../styles/landing.css';

export class LandingView extends BaseComponent {
  constructor(parentEl, services, options) {
    super(parentEl, services, options);
    this.nameInput = null;
    this.enterBtn = null;
  }

  create() {
    const view = createElement('div', { class: 'landing', id: 'landing-view' });

    // Background ambient particles
    view.appendChild(this.createAmbientBg());

    // Main content container
    const content = createElement('div', { class: 'landing__content' });

    // Logo / Hero Section
    content.appendChild(this.createHero());

    // Name Entry Form
    content.appendChild(this.createForm());

    // Footer / Info
    content.appendChild(this.createFooter());

    view.appendChild(content);
    return view;
  }

  createAmbientBg() {
    const bg = createElement('div', { class: 'landing__ambient' });

    // Floating card suit symbols
    const suits = ['♠', '♥', '♣', '♦', '♠', '♥', '♣', '♦', '♠', '♥', '♣', '♦'];
    suits.forEach((suit, i) => {
      const particle = createElement('span', {
        class: `landing__particle ${suit === '♥' || suit === '♦' ? 'landing__particle--red' : ''}`,
        style: {
          left: `${Math.random() * 100}%`,
          animationDelay: `${i * 0.8}s`,
          animationDuration: `${12 + Math.random() * 8}s`,
          fontSize: `${14 + Math.random() * 24}px`,
          opacity: `${0.03 + Math.random() * 0.06}`,
        },
      }, suit);
      bg.appendChild(particle);
    });

    // Gradient orbs
    bg.appendChild(createElement('div', { class: 'landing__orb landing__orb--gold' }));
    bg.appendChild(createElement('div', { class: 'landing__orb landing__orb--emerald' }));

    return bg;
  }

  createHero() {
    const hero = createElement('div', { class: 'landing__hero' });

    // Card fan decoration
    const cardFan = createElement('div', { class: 'landing__card-fan' });
    const fanCards = [
      { suit: '♠', rank: 'A', rotation: -15, delay: 0 },
      { suit: '♥', rank: 'K', rotation: -5, delay: 0.1 },
      { suit: '♣', rank: 'Q', rotation: 5, delay: 0.2 },
      { suit: '♦', rank: 'J', rotation: 15, delay: 0.3 },
    ];

    fanCards.forEach(({ suit, rank, rotation, delay }) => {
      const isRed = suit === '♥' || suit === '♦';
      const card = createElement('div', {
        class: `landing__fan-card ${isRed ? 'landing__fan-card--red' : ''}`,
        style: {
          transform: `rotate(${rotation}deg)`,
          animationDelay: `${delay}s`,
        },
      },
        createElement('span', { class: 'landing__fan-rank' }, rank),
        createElement('span', { class: 'landing__fan-suit' }, suit),
      );
      cardFan.appendChild(card);
    });
    hero.appendChild(cardFan);

    // Title
    const titleWrap = createElement('div', { class: 'landing__title-wrap' });
    titleWrap.appendChild(
      createElement('h1', { class: 'landing__title', id: 'landing-title' }, 'Royal Flush')
    );
    titleWrap.appendChild(
      createElement('p', { class: 'landing__tagline' }, 'Premium Multiplayer Texas Hold\'em')
    );
    hero.appendChild(titleWrap);

    // Decorative divider
    hero.appendChild(createElement('div', { class: 'landing__divider' }));

    return hero;
  }

  createForm() {
    const form = createElement('div', { class: 'landing__form' });

    // Name input
    const inputGroup = createElement('div', { class: 'landing__input-group' });
    const label = createElement('label', {
      class: 'landing__label',
      for: 'player-name-input',
    }, 'Choose your name');

    this.nameInput = createElement('input', {
      type: 'text',
      id: 'player-name-input',
      class: 'input landing__input',
      placeholder: 'Enter your display name...',
      maxlength: '20',
      autocomplete: 'off',
      spellcheck: 'false',
    });

    const charCount = createElement('span', {
      class: 'landing__char-count',
      id: 'char-count',
    }, '0/20');

    inputGroup.appendChild(label);
    inputGroup.appendChild(this.nameInput);
    inputGroup.appendChild(charCount);
    form.appendChild(inputGroup);

    // Enter Lobby button
    this.enterBtn = createElement('button', {
      class: 'btn btn--primary landing__cta',
      id: 'enter-lobby-btn',
      disabled: 'true',
    },
      createElement('span', { class: 'landing__cta-text' }, 'Enter the Lobby'),
      createElement('span', { class: 'landing__cta-icon' }, '→'),
    );
    form.appendChild(this.enterBtn);

    // Quick join hint
    form.appendChild(
      createElement('p', { class: 'landing__hint' }, 'Press Enter to join')
    );

    return form;
  }

  createFooter() {
    const footer = createElement('footer', { class: 'landing__footer' });

    // Connection status indicator
    const status = createElement('div', { class: 'landing__status', id: 'connection-status' },
      createElement('span', { class: 'landing__status-dot' }),
      createElement('span', { class: 'landing__status-text' }, 'Connecting...'),
    );
    footer.appendChild(status);

    // Version
    footer.appendChild(
      createElement('span', { class: 'landing__version' }, 'v1.0.0')
    );

    return footer;
  }

  onMount() {
    // Connect to server
    this.connectToServer();

    // Input events
    this.nameInput.addEventListener('input', (e) => this.handleInput(e));
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleEnterLobby();
    });

    // Button click
    this.enterBtn.addEventListener('click', () => this.handleEnterLobby());

    // Focus the input after animation
    this.setTimeout(() => {
      this.nameInput?.focus();
    }, 800);
  }

  async connectToServer() {
    const statusDot = this.$('.landing__status-dot');
    const statusText = this.$('.landing__status-text');

    try {
      await this.services.socket.connect();

      statusDot?.classList.add('landing__status-dot--connected');
      if (statusText) statusText.textContent = 'Connected';

      this.services.gameState.update({ isConnected: true });
    } catch (err) {
      statusDot?.classList.add('landing__status-dot--error');
      if (statusText) statusText.textContent = 'Connection failed';
      toast.error('Could not connect to server. Check if the backend is running.');
    }
  }

  handleInput(e) {
    const value = e.target.value;
    const count = this.$('#char-count');
    if (count) count.textContent = `${value.length}/20`;

    // Enable/disable button
    const isValid = value.trim().length >= 2;
    this.enterBtn.disabled = !isValid;

    if (isValid) {
      this.enterBtn.classList.add('landing__cta--ready');
    } else {
      this.enterBtn.classList.remove('landing__cta--ready');
    }
  }

  handleEnterLobby() {
    const name = this.nameInput?.value?.trim();
    if (!name || name.length < 2) {
      toast.warning('Name must be at least 2 characters.');
      this.nameInput?.focus();
      return;
    }

    if (!this.services.socket.isConnected) {
      toast.error('Not connected to server.');
      return;
    }

    // Disable UI during transition
    this.enterBtn.disabled = true;
    this.enterBtn.querySelector('.landing__cta-text').textContent = 'Joining...';

    // Send name to server
    this.services.socket.send(SOCKET_EVENTS.PLAYER_SET_NAME, name, (response) => {
      if (response?.success) {
        this.services.gameState.update({
          playerId: response.playerId,
          playerName: response.name,
        });
        toast.success(`Welcome, ${response.name}!`);
        // Navigate to lobby
        this.services.router?.navigate(ROUTES.LOBBY);
      } else {
        toast.error(response?.error || 'Failed to set name.');
        this.enterBtn.disabled = false;
        this.enterBtn.querySelector('.landing__cta-text').textContent = 'Enter the Lobby';
      }
    });
  }

  onUnmount() {
    // Auto-cleanup handles socket/state listeners
  }
}
