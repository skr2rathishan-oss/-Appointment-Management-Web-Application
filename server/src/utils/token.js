import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ALGORITHM = 'HS256';

// Token payload: { sub: userId, role, patientId, doctorId }
export function signToken(user) {
  return jwt.sign(
    { role: user.role, patientId: user.patientId ?? null, doctorId: user.doctorId ?? null },
    env.jwt.secret,
    { subject: String(user.id), expiresIn: env.jwt.expiresIn, algorithm: ALGORITHM },
  );
}

// Returns the decoded payload; throws jsonwebtoken errors on a bad or expired token
export function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret, { algorithms: [ALGORITHM] });
}
