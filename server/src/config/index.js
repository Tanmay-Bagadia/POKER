/* ============================================================
   ROYAL FLUSH — Server Configuration
   ============================================================ */

import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  game: {
    startingChips: parseInt(process.env.DEFAULT_STARTING_CHIPS, 10) || 10000,
    smallBlind: parseInt(process.env.DEFAULT_SMALL_BLIND, 10) || 10,
    bigBlind: parseInt(process.env.DEFAULT_BIG_BLIND, 10) || 20,
    turnTimeout: parseInt(process.env.DEFAULT_TURN_TIMEOUT, 10) || 30000,
    maxPlayersPerTable: 9,
    minPlayersToStart: 2,
  },
};

export default config;
