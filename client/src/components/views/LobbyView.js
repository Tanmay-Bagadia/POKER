/* ============================================================
   ROYAL FLUSH — Lobby View
   
   Room list, room creation, and matchmaking screen.
   Features glassmorphic room cards with real-time updates.
   ============================================================ */

import { BaseComponent } from '../BaseComponent.js';
import { createElement } from '../../utils/dom.js';
import { ROUTES, SOCKET_EVENTS } from '../../utils/constants.js';
import toast from '../Toast.js';
import '../../styles/lobby.css';

export class LobbyView extends BaseComponent {
  constructor(parentEl, services, options) {
    super(parentEl, services, options);
    this.rooms = [];
    this.roomListEl = null;
    this.createModal = null;
  }

  create() {
    const view = createElement('div', { class: 'lobby', id: 'lobby-view' });

    // Background
    view.appendChild(this.createBackground());

    // Header
    view.appendChild(this.createHeader());

    // Main content
    const main = createElement('main', { class: 'lobby__main' });

    // Stats bar
    main.appendChild(this.createStatsBar());

    // Room list
    this.roomListEl = createElement('div', { class: 'lobby__room-list', id: 'room-list' });
    main.appendChild(this.roomListEl);

    view.appendChild(main);

    // Create Room Modal (hidden by default)
    view.appendChild(this.createRoomModal());

    return view;
  }

  createBackground() {
    const bg = createElement('div', { class: 'lobby__bg' });
    bg.appendChild(createElement('div', { class: 'lobby__bg-gradient' }));
    return bg;
  }

  createHeader() {
    const header = createElement('header', { class: 'lobby__header glass-panel' });

    const left = createElement('div', { class: 'lobby__header-left' });
    left.appendChild(createElement('span', { class: 'lobby__logo-icon' }, '♠'));
    left.appendChild(createElement('h2', { class: 'lobby__logo-text' }, 'Royal Flush'));
    header.appendChild(left);

    const center = createElement('div', { class: 'lobby__header-center' });
    center.appendChild(
      createElement('span', { class: 'lobby__welcome', id: 'welcome-text' },
        `Welcome, ${this.services.gameState?.get('playerName') || 'Player'}`
      )
    );
    header.appendChild(center);

    const right = createElement('div', { class: 'lobby__header-right' });

    const createBtn = createElement('button', {
      class: 'btn btn--primary',
      id: 'create-room-btn',
      onClick: () => this.showCreateModal(),
    },
      createElement('span', {}, '+'),
      createElement('span', {}, 'Create Table'),
    );
    right.appendChild(createBtn);

    const logoutBtn = createElement('button', {
      class: 'btn btn--ghost btn--icon',
      id: 'logout-btn',
      'data-tooltip': 'Leave',
      onClick: () => this.handleLogout(),
    }, '✕');
    right.appendChild(logoutBtn);

    header.appendChild(right);
    return header;
  }

  createStatsBar() {
    const bar = createElement('div', { class: 'lobby__stats' });

    bar.appendChild(createElement('div', { class: 'lobby__stat' },
      createElement('span', { class: 'lobby__stat-value', id: 'stat-rooms' }, '0'),
      createElement('span', { class: 'lobby__stat-label' }, 'Tables'),
    ));

    bar.appendChild(createElement('div', { class: 'lobby__stat' },
      createElement('span', { class: 'lobby__stat-value', id: 'stat-players' }, '0'),
      createElement('span', { class: 'lobby__stat-label' }, 'Players Online'),
    ));

    bar.appendChild(createElement('div', { class: 'lobby__stat' },
      createElement('span', { class: 'lobby__stat-value lobby__stat-value--live', id: 'stat-live' }, '●'),
      createElement('span', { class: 'lobby__stat-label' }, 'Live'),
    ));

    return bar;
  }

  createRoomModal() {
    this.createModal = createElement('div', { class: 'modal-overlay', id: 'create-room-modal' });

    const modal = createElement('div', { class: 'modal glass-panel glass-panel--elevated' });

    // Modal Header
    modal.appendChild(createElement('div', { class: 'modal__header' },
      createElement('h3', { class: 'modal__title' }, 'Create Table'),
      createElement('button', {
        class: 'btn btn--ghost btn--icon modal__close',
        onClick: () => this.hideCreateModal(),
      }, '✕'),
    ));

    // Modal Body
    const body = createElement('div', { class: 'modal__body' });

    // Room name
    body.appendChild(this.createFormField('room-name', 'Table Name', 'text', 'My Poker Table'));

    // Settings row
    const settings = createElement('div', { class: 'modal__settings-row' });

    settings.appendChild(this.createFormField('max-players', 'Max Players', 'number', '9', { min: '2', max: '9' }));
    settings.appendChild(this.createFormField('small-blind', 'Small Blind', 'number', '10', { min: '1' }));
    settings.appendChild(this.createFormField('big-blind', 'Big Blind', 'number', '20', { min: '2' }));

    body.appendChild(settings);
    modal.appendChild(body);

    // Modal Footer
    modal.appendChild(createElement('div', { class: 'modal__footer' },
      createElement('button', {
        class: 'btn btn--secondary',
        onClick: () => this.hideCreateModal(),
      }, 'Cancel'),
      createElement('button', {
        class: 'btn btn--primary',
        id: 'confirm-create-btn',
        onClick: () => this.handleCreateRoom(),
      }, 'Create & Join'),
    ));

    this.createModal.appendChild(modal);

    // Close on overlay click
    this.createModal.addEventListener('click', (e) => {
      if (e.target === this.createModal) this.hideCreateModal();
    });

    return this.createModal;
  }

  createFormField(id, label, type, placeholder, attrs = {}) {
    const group = createElement('div', { class: 'form-field' });
    group.appendChild(createElement('label', { class: 'form-field__label', for: id }, label));
    group.appendChild(createElement('input', {
      type,
      id,
      class: 'input form-field__input',
      placeholder,
      ...attrs,
    }));
    return group;
  }

  renderRooms() {
    if (!this.roomListEl) return;

    // Update stats
    const statRooms = this.$('#stat-rooms');
    if (statRooms) statRooms.textContent = String(this.rooms.length);

    if (this.rooms.length === 0) {
      this.roomListEl.innerHTML = `
        <div class="lobby__empty">
          <div class="lobby__empty-icon">🃏</div>
          <h3 class="lobby__empty-title">No tables yet</h3>
          <p class="lobby__empty-text">Be the first to create a table and start playing!</p>
        </div>
      `;
      return;
    }

    this.roomListEl.innerHTML = '';

    this.rooms.forEach((room, i) => {
      const card = createElement('div', {
        class: 'lobby__room-card glass-panel',
        style: { animationDelay: `${i * 80}ms` },
        onClick: () => this.handleJoinRoom(room.id),
      });

      const cardHeader = createElement('div', { class: 'lobby__room-header' },
        createElement('h3', { class: 'lobby__room-name truncate' }, room.name),
        createElement('span', {
          class: `badge ${room.phase === 'waiting' ? 'badge--emerald' : 'badge--gold'}`,
        }, room.phase === 'waiting' ? 'Waiting' : 'In Game'),
      );

      const cardBody = createElement('div', { class: 'lobby__room-body' },
        createElement('div', { class: 'lobby__room-info' },
          createElement('span', { class: 'lobby__room-info-label' }, 'Players'),
          createElement('span', { class: 'lobby__room-info-value' },
            `${room.playerCount}/${room.maxPlayers}`
          ),
        ),
        createElement('div', { class: 'lobby__room-info' },
          createElement('span', { class: 'lobby__room-info-label' }, 'Blinds'),
          createElement('span', { class: 'lobby__room-info-value' },
            `${room.blinds.small}/${room.blinds.big}`
          ),
        ),
      );

      const cardFooter = createElement('div', { class: 'lobby__room-footer' },
        createElement('div', { class: 'lobby__room-seats' },
          ...this.createSeatDots(room.playerCount, room.maxPlayers)
        ),
        createElement('span', { class: 'lobby__room-join' }, 'Join →'),
      );

      card.appendChild(cardHeader);
      card.appendChild(cardBody);
      card.appendChild(cardFooter);
      this.roomListEl.appendChild(card);
    });
  }

  createSeatDots(occupied, max) {
    const dots = [];
    for (let i = 0; i < max; i++) {
      dots.push(createElement('span', {
        class: `lobby__seat-dot ${i < occupied ? 'lobby__seat-dot--taken' : ''}`,
      }));
    }
    return dots;
  }

  onMount() {
    // Join the lobby room for real-time updates
    this.services.socket.send(SOCKET_EVENTS.LOBBY_JOIN, null, (response) => {
      if (response?.success) {
        this.rooms = response.rooms || [];
        this.renderRooms();
      }
    });

    // Listen for room list updates
    this.onSocket(SOCKET_EVENTS.LOBBY_ROOMS_UPDATE, (rooms) => {
      this.rooms = rooms || [];
      this.renderRooms();
    });

    // Keyboard shortcut: Escape closes modal
    const escHandler = (e) => {
      if (e.key === 'Escape') this.hideCreateModal();
    };
    document.addEventListener('keydown', escHandler);
    this.addCleanup(() => document.removeEventListener('keydown', escHandler));
  }

  showCreateModal() {
    this.createModal?.classList.add('modal-overlay--visible');
    const nameInput = this.$('#room-name');
    if (nameInput) {
      nameInput.value = `${this.services.gameState.get('playerName')}'s Table`;
      this.setTimeout(() => nameInput.select(), 100);
    }
  }

  hideCreateModal() {
    this.createModal?.classList.remove('modal-overlay--visible');
  }

  handleCreateRoom() {
    const name = this.$('#room-name')?.value?.trim();
    const maxPlayers = parseInt(this.$('#max-players')?.value, 10) || 9;
    const smallBlind = parseInt(this.$('#small-blind')?.value, 10) || 10;
    const bigBlind = parseInt(this.$('#big-blind')?.value, 10) || 20;

    if (!name || name.length < 1) {
      toast.warning('Table name is required.');
      return;
    }

    this.services.socket.send(SOCKET_EVENTS.ROOM_CREATE, {
      name, maxPlayers, smallBlind, bigBlind,
    }, (response) => {
      if (response?.success) {
        this.services.gameState.update({
          roomId: response.room.id,
          roomName: response.room.name,
        });
        toast.success(`Table "${name}" created!`);
        this.hideCreateModal();
        this.services.router?.navigate(ROUTES.TABLE, { roomId: response.room.id });
      } else {
        toast.error(response?.error || 'Failed to create table.');
      }
    });
  }

  handleJoinRoom(roomId) {
    this.services.socket.send(SOCKET_EVENTS.ROOM_JOIN, roomId, (response) => {
      if (response?.success) {
        this.services.gameState.update({
          roomId: response.room.id,
          roomName: response.room.name,
        });
        toast.success('Joined table!');
        this.services.router?.navigate(ROUTES.TABLE, { roomId: response.room.id });
      } else {
        toast.error(response?.error || 'Failed to join table.');
      }
    });
  }

  handleLogout() {
    this.services.socket.send(SOCKET_EVENTS.LOBBY_LEAVE);
    this.services.gameState.reset();
    this.services.router?.navigate(ROUTES.LANDING);
  }

  onUnmount() {
    this.services.socket.send(SOCKET_EVENTS.LOBBY_LEAVE);
  }
}
