import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: { message: 'A record with these details already exists' } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Malformed JSON body' } });
  }

  const statusCode = err.statusCode ?? 500;
  if (statusCode >= 500) console.error(err);

  const hideMessage = statusCode >= 500 && env.nodeEnv === 'production';
  res.status(statusCode).json({
    error: {
      message: hideMessage ? 'Internal server error' : err.message,
      ...(err.details && { details: err.details }),
    },
  });
}
