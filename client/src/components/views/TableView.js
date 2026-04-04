/* ============================================================
   ROYAL FLUSH — Table View (Stub)
   
   Placeholder for the poker table.
   Full implementation in Phase 6.
   ============================================================ */

import { BaseComponent } from '../BaseComponent.js';
import { createElement } from '../../utils/dom.js';
import { ROUTES, SOCKET_EVENTS } from '../../utils/constants.js';
import toast from '../Toast.js';

export class TableView extends BaseComponent {
  constructor(parentEl, services, options) {
    super(parentEl, services, options);
    this.roomId = options?.roomId || null;
  }

  create() {
    const view = createElement('div', {
      class: 'table-view',
      id: 'table-view',
      style: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-6)',
        background: 'var(--clr-bg-primary)',
        textAlign: 'center',
        padding: 'var(--space-8)',
      },
    });

    // Poker table visual placeholder
    const tableCircle = createElement('div', {
      style: {
        width: '300px',
        height: '180px',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, var(--clr-emerald-felt) 0%, hsl(152, 45%, 12%) 100%)',
        border: '4px solid hsla(43, 96%, 46%, 0.3)',
        boxShadow: '0 0 40px var(--clr-emerald-glow), inset 0 0 30px hsla(0,0%,0%,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    tableCircle.appendChild(createElement('span', {
      style: {
        color: 'hsla(0,0%,100%,0.15)',
        fontSize: 'var(--fs-sm)',
        letterSpacing: 'var(--ls-widest)',
        textTransform: 'uppercase',
        fontWeight: 'var(--fw-semibold)',
      },
    }, 'Poker Table'));

    view.appendChild(tableCircle);

    const roomName = this.services.gameState?.get('roomName') || 'Poker Table';
    view.appendChild(createElement('h2', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--fs-2xl)',
        background: 'linear-gradient(135deg, var(--clr-gold-300), var(--clr-gold-500))',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
    }, roomName));

    view.appendChild(createElement('p', {
      style: {
        color: 'var(--clr-text-tertiary)',
        fontSize: 'var(--fs-sm)',
      },
    }, 'Table UI — Coming in Phase 6'));

    // Back button
    view.appendChild(createElement('button', {
      class: 'btn btn--secondary',
      onClick: () => this.handleLeave(),
    }, '← Back to Lobby'));

    return view;
  }

  onMount() {
    toast.info('Table view stub. Full UI coming in Phase 6.');
  }

  handleLeave() {
    this.services.socket.send(SOCKET_EVENTS.ROOM_LEAVE, null, () => {
      this.services.gameState.update({ roomId: null, roomName: null });
      this.services.router?.navigate(ROUTES.LOBBY);
    });
  }
}
