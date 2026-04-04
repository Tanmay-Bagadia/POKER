/* ============================================================
   ROYAL FLUSH — Error Handler Middleware
   ============================================================ */

import { logger } from '../utils/logger.js';

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
}

/**
 * Global error handler
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`${req.method} ${req.originalUrl} → ${statusCode}: ${message}`);

  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal Server Error' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
