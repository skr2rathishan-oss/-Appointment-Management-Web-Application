import jwt from 'jsonwebtoken';
import { verifyToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';

// Requires "Authorization: Bearer <token>" and sets req.user = { id, role, patientId, doctorId }
export function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized());
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: Number(payload.sub),
      role: payload.role,
      patientId: payload.patientId ?? null,
      doctorId: payload.doctorId ?? null,
    };
    next();
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? 'Session expired, please log in again' : 'Invalid token';
    next(ApiError.unauthorized(message));
  }
}

// Use after authenticate: only lets the listed roles through
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};
