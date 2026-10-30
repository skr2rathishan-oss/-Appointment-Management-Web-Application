import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword } from '../../src/utils/password.js';
import { signToken, verifyToken } from '../../src/utils/token.js';
import { parseId } from '../../src/utils/parseId.js';
import { toPublicUser } from '../../src/services/auth.service.js';

describe('password helpers', () => {
  it('hashes with bcrypt cost 10 and verifies the right password only', async () => {
    const hash = await hashPassword('secret123');
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
    expect(hash).not.toContain('secret123');
    expect(await verifyPassword('secret123', hash)).toBe(true);
    expect(await verifyPassword('secret124', hash)).toBe(false);
  });

  it('salts each hash differently', async () => {
    expect(await hashPassword('secret123')).not.toBe(await hashPassword('secret123'));
  });
});

describe('token helpers', () => {
  const user = { id: 7, role: 'doctor', patientId: null, doctorId: 3, email: 'x@y.z' };

  it('signs { sub, role, patientId, doctorId } with HS256 and an expiry', () => {
    const token = signToken(user);
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    const payload = verifyToken(token);

    expect(header.alg).toBe('HS256');
    expect(payload).toMatchObject({ sub: '7', role: 'doctor', patientId: null, doctorId: 3 });
    expect(payload).not.toHaveProperty('email');
    expect(payload.exp - payload.iat).toBe(60 * 60); // JWT_EXPIRES_IN=1h in tests
  });

  it('rejects a token signed with another secret', () => {
    const forged = jwt.sign({ role: 'admin' }, 'other-secret', { subject: '1' });
    expect(() => verifyToken(forged)).toThrow(jwt.JsonWebTokenError);
  });

  it('rejects a tampered payload', () => {
    const [header, , signature] = signToken(user).split('.');
    const payload = Buffer.from(JSON.stringify({ sub: '7', role: 'admin' })).toString('base64url');
    expect(() => verifyToken(`${header}.${payload}.${signature}`)).toThrow();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ role: 'patient' }, process.env.JWT_SECRET, { subject: '1', expiresIn: -10 });
    expect(() => verifyToken(expired)).toThrow(jwt.TokenExpiredError);
  });
});

describe('toPublicUser', () => {
  it('drops the password hash and any other extra columns', () => {
    const user = toPublicUser({
      id: 1, email: 'a@b.c', role: 'admin', passwordHash: 'h', createdAt: 'now',
    });
    expect(user).toEqual({
      id: 1, email: 'a@b.c', role: 'admin', patientId: null, doctorId: null, firstName: null, lastName: null,
    });
  });
});

describe('parseId', () => {
  it('accepts plain positive integers', () => {
    expect(parseId('12')).toBe(12);
  });

  it.each(['0', '-1', '1.5', '1e3', '0x10', ' 7', '', 'abc'])('rejects %j with a 400', (value) => {
    expect(() => parseId(value)).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});
