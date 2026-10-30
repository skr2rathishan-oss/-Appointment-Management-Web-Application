import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { pool } from '../src/config/db.js';
import * as userRepository from '../src/repositories/user.repository.js';
import * as patientRepository from '../src/repositories/patient.repository.js';
import { hashPassword } from '../src/utils/password.js';
import { verifyToken } from '../src/utils/token.js';
import app from '../src/app.js';
import { PATIENT, bearer, fakeConnection } from './helpers.js';

vi.mock('../src/config/db.js', () => ({
  pool: { getConnection: vi.fn(), execute: vi.fn(), query: vi.fn() },
  pingDatabase: vi.fn(),
}));
vi.mock('../src/repositories/user.repository.js');
vi.mock('../src/repositories/patient.repository.js');

const REGISTRATION = {
  firstName: 'Amal',
  lastName: 'Perera',
  email: '  Amal@Example.com ',
  password: 'secret123',
  phone: '+94 77 123 4567',
  dateOfBirth: '1990-05-01',
  gender: 'male',
};

const STORED_USER = {
  id: 2,
  email: 'amal@example.com',
  role: 'patient',
  patientId: 10,
  doctorId: null,
  firstName: 'Amal',
  lastName: 'Perera',
};

describe('POST /api/auth/register', () => {
  let connection;

  beforeEach(() => {
    connection = fakeConnection();
    pool.getConnection.mockResolvedValue(connection);
    userRepository.existsByEmail.mockResolvedValue(false);
    patientRepository.create.mockResolvedValue({ id: 10 });
    userRepository.create.mockResolvedValue(2);
    userRepository.findById.mockResolvedValue(STORED_USER);
  });

  it('creates the patient and user in one transaction and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(REGISTRATION);

    expect(res.status).toBe(201);
    expect(res.body.data.user).toEqual(STORED_USER);
    expect(verifyToken(res.body.data.token)).toMatchObject({ sub: '2', role: 'patient', patientId: 10 });

    // Email is trimmed and lowercased; the password never reaches the patient insert
    expect(patientRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'amal@example.com', firstName: 'Amal' }),
      connection,
    );
    expect(patientRepository.create.mock.calls[0][0]).not.toHaveProperty('password');
    const [userArg, userConnection] = userRepository.create.mock.calls[0];
    expect(userConnection).toBe(connection);
    expect(userArg).toMatchObject({ email: 'amal@example.com', role: 'patient', patientId: 10 });
    expect(userArg.passwordHash).toMatch(/^\$2[aby]\$10\$/);

    expect(connection.beginTransaction).toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  it('never returns the password hash', async () => {
    userRepository.findById.mockResolvedValue({ ...STORED_USER, passwordHash: 'leak' });
    const res = await request(app).post('/api/auth/register').send(REGISTRATION);
    expect(JSON.stringify(res.body)).not.toContain('leak');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('rolls back (and does not commit) when the user insert fails', async () => {
    userRepository.create.mockRejectedValue(new Error('insert failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).post('/api/auth/register').send(REGISTRATION);

    expect(res.status).toBe(500);
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  it('keeps the original error when the rollback itself fails', async () => {
    patientRepository.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    connection.rollback.mockRejectedValue(new Error('connection lost'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).post('/api/auth/register').send(REGISTRATION);

    expect(res.status).toBe(409);
    expect(connection.release).toHaveBeenCalled();
  });

  it('returns 400 with per-field details for an invalid body', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...REGISTRATION, email: 'not-an-email', password: 'short', dateOfBirth: '1990-02-30' });

    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password', 'dateOfBirth']));
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it.each([
    ['no digit', 'onlyletters'],
    ['no letter', '12345678'],
  ])('rejects a password with %s', async (_, password) => {
    const res = await request(app).post('/api/auth/register').send({ ...REGISTRATION, password });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('password');
  });

  it('returns 409 when the email is already registered', async () => {
    userRepository.existsByEmail.mockResolvedValue(true);
    const res = await request(app).post('/api/auth/register').send(REGISTRATION);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('An account with this email already exists');
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('returns 409 and rolls back when an insert hits a duplicate email', async () => {
    patientRepository.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    const res = await request(app).post('/api/auth/register').send(REGISTRATION);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('An account with this email already exists');
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    userRepository.findByEmailWithPassword.mockResolvedValue({
      ...STORED_USER,
      passwordHash: await hashPassword('secret123'),
    });
  });

  it('returns a token and the user without the hash', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'AMAL@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual(STORED_USER);
    expect(verifyToken(res.body.data.token)).toMatchObject({ sub: '2', role: 'patient', patientId: 10, doctorId: null });
    expect(userRepository.findByEmailWithPassword).toHaveBeenCalledWith('amal@example.com');
  });

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'amal@example.com', password: 'nope1234' });
    userRepository.findByEmailWithPassword.mockResolvedValue(null);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'who@example.com', password: 'secret123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual({ error: { message: 'Invalid email or password' } });
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('returns 400 for a missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'amal@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('password');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user, reloaded from the database', async () => {
    userRepository.findById.mockResolvedValue({ ...STORED_USER, passwordHash: 'x' });
    const res = await request(app).get('/api/auth/me').set('Authorization', bearer(PATIENT));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(STORED_USER);
    expect(userRepository.findById).toHaveBeenCalledWith(PATIENT.id);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Authentication required');
  });

  it('returns 401 for a non-Bearer scheme', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Basic abc');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a token signed with another secret', async () => {
    const forged = jwt.sign({ role: 'admin' }, 'wrong-secret', { subject: '1' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid token');
  });

  it('returns 401 for an unsigned (alg none) token', async () => {
    const unsigned = jwt.sign({ role: 'admin' }, null, { algorithm: 'none', subject: '1' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${unsigned}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 for an expired token', async () => {
    const expired = jwt.sign(
      { role: 'patient', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET,
      { subject: '2' },
    );
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/expired/i);
  });

  it('returns 401 when the account no longer exists', async () => {
    userRepository.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/auth/me').set('Authorization', bearer(PATIENT));
    expect(res.status).toBe(401);
  });
});
