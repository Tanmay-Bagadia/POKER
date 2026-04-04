/* ============================================================
   ROYAL FLUSH — Table View (Complete)
   
   The main poker table screen. Features:
   - Oval felt table with gold rail
   - 9 player seats arranged around the table
   - Community cards in center
   - Pot display
   - Action panel (bet/call/fold/raise)
   - Bet slider
   - Turn timer
   - Chat panel
   ============================================================ */

import { BaseComponent } from '../BaseComponent.js';
import { createElement, formatChips } from '../../utils/dom.js';
import { ROUTES, SOCKET_EVENTS, GAME_PHASES } from '../../utils/constants.js';
import toast from '../Toast.js';
import '../../styles/table.css';

const SEAT_POSITIONS = [
  { top: '85%', left: '50%' },   // 0: bottom center
  { top: '75%', left: '18%' },   // 1: bottom left
  { top: '45%', left: '3%' },    // 2: middle left
  { top: '12%', left: '18%' },   // 3: top left
  { top: '2%', left: '38%' },    // 4: top left-center
  { top: '2%', left: '62%' },    // 5: top right-center
  { top: '12%', left: '82%' },   // 6: top right
  { top: '45%', left: '97%' },   // 7: middle right
  { top: '75%', left: '82%' },   // 8: bottom right
];

export class TableView extends BaseComponent {
  constructor(parentEl, services, options) {
    super(parentEl, services, options);
    this.roomId = options?.roomId || null;
    this.myId = null;
    this.holeCards = [];
    this.isMyTurn = false;
    this.availableActions = [];
    this.callAmount = 0;
    this.minRaise = 0;
    this.gameState = null;
    this.turnTimerInterval = null;
    this.turnTimeLeft = 0;
  }

  create() {
    const view = createElement('div', { class: 'table-view', id: 'table-view' });
    view.appendChild(this.createBackground());
    view.appendChild(this.createHeader());
    view.appendChild(this.createTableArea());
    view.appendChild(this.createActionPanel());
    return view;
  }

  createBackground() {
    const bg = createElement('div', { class: 'table-bg' });
    bg.appendChild(createElement('div', { class: 'table-bg__vignette' }));
    return bg;
  }

  createHeader() {
    const header = createElement('header', { class: 'table-header' });

    const left = createElement('div', { class: 'table-header__left' });
    left.appendChild(createElement('button', {
      class: 'btn btn--ghost btn--sm',
      id: 'leave-table-btn',
      onClick: () => this.handleLeave(),
    }, '← Leave'));
    header.appendChild(left);

    const center = createElement('div', { class: 'table-header__center' });
    center.appendChild(createElement('h2', {
      class: 'table-header__title',
      id: 'table-title',
    }, this.services.gameState?.get('roomName') || 'Poker Table'));
    center.appendChild(createElement('span', {
      class: 'table-header__phase',
      id: 'game-phase',
    }, 'Waiting'));
    header.appendChild(center);

    const right = createElement('div', { class: 'table-header__right' });
    right.appendChild(createElement('button', {
      class: 'btn btn--primary btn--sm',
      id: 'start-game-btn',
      onClick: () => this.handleStartGame(),
    }, '▶ Start Game'));
    header.appendChild(right);

    return header;
  }

  createTableArea() {
    const area = createElement('div', { class: 'table-area' });
    const felt = createElement('div', { class: 'table-felt', id: 'table-felt' });
    const rail = createElement('div', { class: 'table-rail' });

    // Community cards area
    const community = createElement('div', { class: 'community', id: 'community-cards' });
    community.appendChild(createElement('div', { class: 'community__cards' }));
    community.appendChild(createElement('div', { class: 'community__pot', id: 'pot-display' },
      createElement('span', { class: 'community__pot-label' }, 'POT'),
      createElement('span', { class: 'community__pot-value' }, '0'),
    ));
    felt.appendChild(community);

    // Dealer button
    felt.appendChild(createElement('div', {
      class: 'dealer-btn', id: 'dealer-button',
      style: { display: 'none' },
    }, 'D'));

    rail.appendChild(felt);
    area.appendChild(rail);

    // Player seats
    for (let i = 0; i < 9; i++) {
      area.appendChild(this.createSeat(i));
    }

    return area;
  }

  createSeat(index) {
    const pos = SEAT_POSITIONS[index];
    const seat = createElement('div', {
      class: 'seat',
      id: `seat-${index}`,
      'data-seat': index,
      style: { top: pos.top, left: pos.left },
    });

    // Avatar
    const avatar = createElement('div', { class: 'seat__avatar' },
      createElement('span', { class: 'seat__avatar-emoji' }, '🪑'),
    );
    seat.appendChild(avatar);

    // Info
    const info = createElement('div', { class: 'seat__info' });
    info.appendChild(createElement('span', { class: 'seat__name' }, 'Empty'));
    info.appendChild(createElement('span', { class: 'seat__chips' }, ''));
    seat.appendChild(info);

    // Bet badge
    seat.appendChild(createElement('div', {
      class: 'seat__bet', style: { display: 'none' },
    }));

    // Cards
    seat.appendChild(createElement('div', { class: 'seat__cards' }));

    // Timer ring
    seat.appendChild(createElement('svg', {
      class: 'seat__timer',
      viewBox: '0 0 40 40',
      style: { display: 'none' },
    }));

    // Status badge
    seat.appendChild(createElement('div', {
      class: 'seat__status', style: { display: 'none' },
    }));

    return seat;
  }

  createActionPanel() {
    const panel = createElement('div', {
      class: 'action-panel', id: 'action-panel',
      style: { display: 'none' },
    });

    // Your cards display
    const myCards = createElement('div', { class: 'action-panel__cards', id: 'my-cards' });
    panel.appendChild(myCards);

    // Bet slider area
    const sliderArea = createElement('div', { class: 'action-panel__slider', id: 'bet-slider-area' });
    sliderArea.appendChild(createElement('input', {
      type: 'range',
      class: 'bet-slider',
      id: 'bet-slider',
      min: '0', max: '10000', value: '0',
    }));
    sliderArea.appendChild(createElement('span', {
      class: 'action-panel__bet-amount', id: 'bet-amount-display',
    }, '0'));
    panel.appendChild(sliderArea);

    // Action buttons
    const buttons = createElement('div', { class: 'action-panel__buttons' });

    buttons.appendChild(createElement('button', {
      class: 'action-btn action-btn--fold', id: 'btn-fold',
      onClick: () => this.sendAction('fold'),
    }, 'Fold'));

    buttons.appendChild(createElement('button', {
      class: 'action-btn action-btn--check', id: 'btn-check',
      onClick: () => this.sendAction('check'),
    }, 'Check'));

    buttons.appendChild(createElement('button', {
      class: 'action-btn action-btn--call', id: 'btn-call',
      onClick: () => this.sendAction('call'),
    }, 'Call'));

    buttons.appendChild(createElement('button', {
      class: 'action-btn action-btn--bet', id: 'btn-bet',
      onClick: () => this.sendAction('bet'),
    }, 'Bet'));

    buttons.appendChild(createElement('button', {
      class: 'action-btn action-btn--raise', id: 'btn-raise',
      onClick: () => this.sendAction('raise'),
    }, 'Raise'));

    buttons.appendChild(createElement('button', {
      class: 'action-btn action-btn--allin', id: 'btn-allin',
      onClick: () => this.sendAction('all-in'),
    }, 'All In'));

    panel.appendChild(buttons);

    return panel;
  }

  /* ─── Lifecycle ──────────────────────────────────── */

  onMount() {
    this.myId = this.services.gameState?.get('playerId');

    // Listen for game events
    this.onSocket('game:round:start', (state) => this.onGameState(state));
    this.onSocket('game:state:update', (state) => this.onGameState(state));
    this.onSocket('game:turn:change', (state) => this.onGameState(state));
    this.onSocket('game:community:cards', (state) => this.onGameState(state));
    this.onSocket('game:round:end', (state) => this.onGameState(state));
    this.onSocket('game:action', (data) => this.onAction(data));
    this.onSocket('game:timer', (data) => this.onTimer(data));
    this.onSocket('game:showdown', (data) => this.onShowdown(data));

    this.onSocket('game:private', (data) => {
      this.holeCards = data.holeCards || [];
      this.isMyTurn = data.isMyTurn;
      this.availableActions = data.availableActions || [];
      this.callAmount = data.callAmount || 0;
      this.minRaise = data.minRaise || 0;
      this.renderMyCards();
      this.updateActionPanel();
    });

    this.onSocket(SOCKET_EVENTS.ROOM_PLAYER_JOINED, (data) => {
      this.onGameState(data.room);
      toast.info(`${data.player.name} joined the table.`);
    });

    this.onSocket(SOCKET_EVENTS.ROOM_PLAYER_LEFT, (data) => {
      this.onGameState(data.room);
      toast.warning(`${data.playerName} left the table.`);
    });

    this.onSocket(SOCKET_EVENTS.ROOM_CHAT, (data) => {
      // Could show chat in UI, for now toast it
      if (data.playerId !== this.myId) {
        toast.info(`${data.playerName}: ${data.message}`);
      }
    });

    // Bet slider
    const slider = this.$('#bet-slider');
    if (slider) {
      slider.addEventListener('input', () => {
        const display = this.$('#bet-amount-display');
        if (display) display.textContent = formatChips(parseInt(slider.value, 10));
      });
    }

    // Request current room state
    this.services.socket.send(SOCKET_EVENTS.ROOM_UPDATE, null, (state) => {
      if (state) this.onGameState(state);
    });
  }

  /* ─── Render Methods ─────────────────────────────── */

  onGameState(state) {
    if (!state) return;
    this.gameState = state;
    this.renderPlayers(state.players);
    this.renderCommunityCards(state.communityCards || []);
    this.renderPot(state.pot);
    this.renderPhase(state.phase);
    this.renderDealerButton(state.dealerIndex, state.players);
    this.updateStartButton(state);
  }

  renderPlayers(players) {
    if (!players) return;

    // Clear all seats first
    for (let i = 0; i < 9; i++) {
      const seat = this.$(`#seat-${i}`);
      if (!seat) continue;
      seat.className = 'seat';
      seat.querySelector('.seat__name').textContent = 'Empty';
      seat.querySelector('.seat__chips').textContent = '';
      seat.querySelector('.seat__avatar-emoji').textContent = '🪑';
      seat.querySelector('.seat__bet').style.display = 'none';
      seat.querySelector('.seat__cards').innerHTML = '';
      seat.querySelector('.seat__status').style.display = 'none';
    }

    for (const p of players) {
      const seat = this.$(`#seat-${p.seatIndex}`);
      if (!seat) continue;

      seat.classList.add('seat--occupied');

      if (p.id === this.myId) seat.classList.add('seat--me');
      if (p.isFolded) seat.classList.add('seat--folded');
      if (p.isAllIn) seat.classList.add('seat--allin');

      // Check if this is the active player
      const isActive = this.gameState && this.gameState.players &&
        this.gameState.activePlayerIndex >= 0 &&
        this.gameState.players[this.gameState.activePlayerIndex]?.id === p.id;
      if (isActive) seat.classList.add('seat--active');

      seat.querySelector('.seat__name').textContent = p.name;
      seat.querySelector('.seat__chips').textContent = formatChips(p.chips);
      seat.querySelector('.seat__avatar-emoji').textContent = p.id === this.myId ? '😎' : '🧑';

      // Bet badge
      if (p.currentBet > 0) {
        const betEl = seat.querySelector('.seat__bet');
        betEl.textContent = formatChips(p.currentBet);
        betEl.style.display = 'flex';
      }

      // Cards (back of card for opponents)
      if (p.hasCards && !p.isFolded) {
        const cardsEl = seat.querySelector('.seat__cards');
        if (p.id !== this.myId) {
          cardsEl.innerHTML = '<div class="card card--back"></div><div class="card card--back"></div>';
        }
      }

      // Status
      if (p.isFolded) {
        const statusEl = seat.querySelector('.seat__status');
        statusEl.textContent = 'FOLD';
        statusEl.style.display = 'block';
        statusEl.className = 'seat__status seat__status--fold';
      } else if (p.isAllIn) {
        const statusEl = seat.querySelector('.seat__status');
        statusEl.textContent = 'ALL IN';
        statusEl.style.display = 'block';
        statusEl.className = 'seat__status seat__status--allin';
      }
    }
  }

  renderCommunityCards(cards) {
    const container = this.$('.community__cards');
    if (!container) return;
    container.innerHTML = '';

    // Always show 5 slots
    for (let i = 0; i < 5; i++) {
      if (i < cards.length) {
        container.appendChild(this.createCardEl(cards[i]));
      } else {
        container.appendChild(createElement('div', { class: 'card card--placeholder' }));
      }
    }
  }

  renderMyCards() {
    const container = this.$('#my-cards');
    if (!container) return;
    container.innerHTML = '';

    for (const card of this.holeCards) {
      container.appendChild(this.createCardEl(card, true));
    }
  }

  createCardEl(card, large = false) {
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const suitSymbol = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[card.suit];

    const el = createElement('div', {
      class: `card card--face ${isRed ? 'card--red' : 'card--black'} ${large ? 'card--large' : ''}`,
    },
      createElement('span', { class: 'card__rank' }, card.rank),
      createElement('span', { class: 'card__suit' }, suitSymbol),
    );

    return el;
  }

  renderPot(pot) {
    const val = this.$('.community__pot-value');
    if (val) val.textContent = formatChips(pot || 0);

    const potEl = this.$('#pot-display');
    if (potEl) potEl.style.display = pot > 0 ? 'flex' : 'none';
  }

  renderPhase(phase) {
    const el = this.$('#game-phase');
    if (el) {
      const phaseNames = {
        'waiting': 'Waiting',
        'pre-flop': 'Pre-Flop',
        'flop': 'Flop',
        'turn': 'Turn',
        'river': 'River',
        'showdown': 'Showdown',
      };
      el.textContent = phaseNames[phase] || phase;
    }
  }

  renderDealerButton(dealerIndex, players) {
    const btn = this.$('#dealer-button');
    if (!btn || dealerIndex < 0 || !players || !players[dealerIndex]) {
      if (btn) btn.style.display = 'none';
      return;
    }

    const seatIndex = players[dealerIndex]?.seatIndex;
    if (seatIndex === undefined) return;

    const seatEl = this.$(`#seat-${seatIndex}`);
    if (seatEl) {
      btn.style.display = 'flex';
      const pos = SEAT_POSITIONS[seatIndex];
      btn.style.top = pos.top;
      btn.style.left = pos.left;
    }
  }

  updateStartButton(state) {
    const btn = this.$('#start-game-btn');
    if (!btn) return;

    const isHost = state.hostId === this.myId;
    const isWaiting = state.phase === 'waiting';
    const enoughPlayers = state.players && state.players.length >= 2;

    if (isHost && isWaiting && enoughPlayers) {
      btn.style.display = 'flex';
    } else {
      btn.style.display = 'none';
    }
  }

  updateActionPanel() {
    const panel = this.$('#action-panel');
    if (!panel) return;

    if (!this.isMyTurn || this.availableActions.length === 0) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'flex';

    // Show/hide buttons based on available actions
    const actions = ['fold', 'check', 'call', 'bet', 'raise', 'all-in'];
    const btnMap = { 'fold': 'btn-fold', 'check': 'btn-check', 'call': 'btn-call', 'bet': 'btn-bet', 'raise': 'btn-raise', 'all-in': 'btn-allin' };

    for (const a of actions) {
      const btn = this.$(`#${btnMap[a]}`);
      if (btn) {
        btn.style.display = this.availableActions.includes(a) ? 'flex' : 'none';
      }
    }

    // Update call button text
    const callBtn = this.$('#btn-call');
    if (callBtn && this.callAmount > 0) {
      callBtn.textContent = `Call ${formatChips(this.callAmount)}`;
    }

    // Update slider
    const slider = this.$('#bet-slider');
    const sliderArea = this.$('#bet-slider-area');
    if (slider && sliderArea) {
      const showSlider = this.availableActions.includes('bet') || this.availableActions.includes('raise');
      sliderArea.style.display = showSlider ? 'flex' : 'none';
      if (showSlider) {
        const myChips = this.getMyChips();
        slider.min = String(this.minRaise);
        slider.max = String(myChips);
        slider.value = String(this.minRaise);
        const display = this.$('#bet-amount-display');
        if (display) display.textContent = formatChips(this.minRaise);
      }
    }
  }

  getMyChips() {
    if (!this.gameState?.players) return 0;
    const me = this.gameState.players.find(p => p.id === this.myId);
    return me?.chips || 0;
  }

  /* ─── Timer ──────────────────────────────────────── */

  onTimer(data) {
    if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);

    const { activePlayerIndex, duration } = data;
    if (!this.gameState?.players) return;

    const player = this.gameState.players[activePlayerIndex];
    if (!player) return;

    const seatEl = this.$(`#seat-${player.seatIndex}`);
    if (!seatEl) return;

    const timerSvg = seatEl.querySelector('.seat__timer');
    if (!timerSvg) return;

    // Show timer ring
    timerSvg.style.display = 'block';
    timerSvg.innerHTML = `
      <circle cx="20" cy="20" r="18" fill="none" stroke="hsla(0,0%,100%,0.1)" stroke-width="2"/>
      <circle cx="20" cy="20" r="18" fill="none" stroke="var(--clr-gold-400)" stroke-width="2.5"
        stroke-dasharray="113" stroke-dashoffset="0" stroke-linecap="round"
        class="timer-ring" transform="rotate(-90 20 20)"/>
    `;

    const ring = timerSvg.querySelector('.timer-ring');
    const startTime = Date.now();
    const circumference = 113;

    this.turnTimerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      ring.setAttribute('stroke-dashoffset', String(circumference * progress));

      if (progress > 0.7) {
        ring.setAttribute('stroke', 'var(--clr-red-400)');
      }

      if (progress >= 1) {
        clearInterval(this.turnTimerInterval);
        timerSvg.style.display = 'none';
      }
    }, 50);

    this.addCleanup(() => clearInterval(this.turnTimerInterval));
  }

  /* ─── Showdown ───────────────────────────────────── */

  onShowdown(data) {
    const { winners, revealedCards, pot } = data;

    // Reveal cards
    if (revealedCards) {
      for (const [playerId, cards] of Object.entries(revealedCards)) {
        const player = this.gameState?.players?.find(p => p.id === playerId);
        if (!player) continue;
        const seat = this.$(`#seat-${player.seatIndex}`);
        if (!seat) continue;
        const cardsEl = seat.querySelector('.seat__cards');
        if (!cardsEl) continue;
        cardsEl.innerHTML = '';
        for (const card of cards) {
          cardsEl.appendChild(this.createCardEl(card));
        }
      }
    }

    // Show winner info
    if (winners && winners.length > 0) {
      for (const w of winners) {
        const player = this.gameState?.players?.find(p => p.id === w.playerId);
        if (!player) continue;
        const seat = this.$(`#seat-${player.seatIndex}`);
        if (seat) {
          seat.classList.add('seat--winner');
          const statusEl = seat.querySelector('.seat__status');
          if (statusEl) {
            statusEl.textContent = `🏆 ${w.hand.name}`;
            statusEl.style.display = 'block';
            statusEl.className = 'seat__status seat__status--winner';
          }
        }
        toast.success(`${w.playerName} wins ${formatChips(w.chips)} with ${w.hand.name}!`);
      }
    }

    // Hide action panel
    const panel = this.$('#action-panel');
    if (panel) panel.style.display = 'none';
  }

  onAction(data) {
    const actionNames = {
      'fold': '🃏 Fold', 'check': '✓ Check', 'call': '📞 Call',
      'bet': '💰 Bet', 'raise': '⬆️ Raise', 'all-in': '🔥 All In',
    };
    if (data.playerId !== this.myId) {
      toast.info(`${data.playerName}: ${actionNames[data.action] || data.action}`);
    }
  }

  /* ─── Actions ────────────────────────────────────── */

  sendAction(action) {
    const slider = this.$('#bet-slider');
    const amount = slider ? parseInt(slider.value, 10) : 0;

    this.services.socket.send('game:action', { action, amount }, (response) => {
      if (!response?.success) {
        toast.error(response?.error || 'Action failed.');
      }
    });
  }

  handleStartGame() {
    this.services.socket.send(SOCKET_EVENTS.GAME_START, null, (response) => {
      if (response?.success) {
        toast.success('Round started!');
      } else {
        toast.error(response?.error || 'Could not start game.');
      }
    });
  }

  handleLeave() {
    this.services.socket.send(SOCKET_EVENTS.ROOM_LEAVE, null, () => {
      this.services.gameState.update({ roomId: null, roomName: null });
      this.services.router?.navigate(ROUTES.LOBBY);
    });
  }

  onUnmount() {
    if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
  }
}
