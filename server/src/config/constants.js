/* ============================================================
   ROYAL FLUSH — Server Constants
   
   Must stay in sync with client/src/utils/constants.js
   ============================================================ */

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Lobby
  LOBBY_JOIN: 'lobby:join',
  LOBBY_LEAVE: 'lobby:leave',
  LOBBY_ROOMS_UPDATE: 'lobby:rooms:update',
  LOBBY_PLAYER_COUNT: 'lobby:playerCount',

  // Room
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_UPDATE: 'room:update',
  ROOM_PLAYER_JOINED: 'room:player:joined',
  ROOM_PLAYER_LEFT: 'room:player:left',
  ROOM_CHAT: 'room:chat',
  ROOM_ERROR: 'room:error',

  // Game Actions (Client → Server)
  GAME_START: 'game:start',
  GAME_ACTION_BET: 'game:action:bet',
  GAME_ACTION_CALL: 'game:action:call',
  GAME_ACTION_RAISE: 'game:action:raise',
  GAME_ACTION_FOLD: 'game:action:fold',
  GAME_ACTION_CHECK: 'game:action:check',
  GAME_ACTION_ALL_IN: 'game:action:allIn',

  // Game State (Server → Client)
  GAME_STATE_UPDATE: 'game:state:update',
  GAME_ROUND_START: 'game:round:start',
  GAME_DEAL_CARDS: 'game:deal:cards',
  GAME_COMMUNITY_CARDS: 'game:community:cards',
  GAME_TURN_CHANGE: 'game:turn:change',
  GAME_POT_UPDATE: 'game:pot:update',
  GAME_SHOWDOWN: 'game:showdown',
  GAME_WINNER: 'game:winner',
  GAME_ROUND_END: 'game:round:end',
  GAME_ERROR: 'game:error',

  // Player
  PLAYER_SET_NAME: 'player:setName',
  PLAYER_READY: 'player:ready',
  PLAYER_TIMER: 'player:timer',
};

export const GAME_PHASES = {
  WAITING: 'waiting',
  PRE_FLOP: 'pre-flop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
};

export const PLAYER_ACTIONS = {
  FOLD: 'fold',
  CHECK: 'check',
  CALL: 'call',
  BET: 'bet',
  RAISE: 'raise',
  ALL_IN: 'all-in',
};

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const HAND_RANKINGS = {
  ROYAL_FLUSH: 10,
  STRAIGHT_FLUSH: 9,
  FOUR_OF_A_KIND: 8,
  FULL_HOUSE: 7,
  FLUSH: 6,
  STRAIGHT: 5,
  THREE_OF_A_KIND: 4,
  TWO_PAIR: 3,
  ONE_PAIR: 2,
  HIGH_CARD: 1,
};
