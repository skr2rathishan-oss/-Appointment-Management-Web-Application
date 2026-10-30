import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { pingDatabase } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import app from '../src/app.js';

vi.mock('../src/config/db.js', () => ({
  pool: { getConnection: vi.fn(), execute: vi.fn(), query: vi.fn() },
  pingDatabase: vi.fn(),
}));

describe('GET /api/health', () => {
  it('is public and reports the database as up', async () => {
    pingDatabase.mockResolvedValue();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('returns 503 when the database is unreachable', async () => {
    pingDatabase.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'degraded', database: 'down' });
  });
});

describe('GET /api/clinic/time', () => {
  afterEach(() => vi.useRealTimers());

  it("is public and returns the clinic's date, time and zone", async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-15T20:45:30Z'));
    const res = await request(app).get('/api/clinic/time');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { date: '2026-06-15', time: '20:45:30', timeZone: 'UTC' } });
  });
});

describe('app basics', () => {
  it('returns 404 for an unknown route', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('Route not found');
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Malformed JSON body');
  });

  it('uses the test environment from tests/setup.js, not server/.env', () => {
    expect(env.db.password).toBe('test-password');
    expect(env.jwt.secret).toBe('test-jwt-secret-not-for-production');
  });
});
