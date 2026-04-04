/* ============================================================
   ROYAL FLUSH — Logger Utility
   
   Structured logging with color-coded levels.
   ============================================================ */

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  _timestamp() {
    return new Date().toISOString().slice(11, 23);
  }

  _format(level, color, message, ...args) {
    const ts = `${COLORS.dim}${this._timestamp()}${COLORS.reset}`;
    const ctx = `${COLORS.cyan}[${this.context}]${COLORS.reset}`;
    const lvl = `${color}${level}${COLORS.reset}`;
    console.log(`${ts} ${lvl} ${ctx} ${message}`, ...args);
  }

  info(message, ...args) {
    this._format('INFO ', COLORS.green, message, ...args);
  }

  warn(message, ...args) {
    this._format('WARN ', COLORS.yellow, message, ...args);
  }

  error(message, ...args) {
    this._format('ERROR', COLORS.red, message, ...args);
  }

  debug(message, ...args) {
    if (process.env.NODE_ENV !== 'production') {
      this._format('DEBUG', COLORS.magenta, message, ...args);
    }
  }

  socket(message, ...args) {
    this._format('SOCK ', COLORS.blue, message, ...args);
  }

  /**
   * Create a child logger with a new context
   * @param {string} context
   * @returns {Logger}
   */
  child(context) {
    return new Logger(context);
  }
}

export const logger = new Logger('Server');
export default Logger;
