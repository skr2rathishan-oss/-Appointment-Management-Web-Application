import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import * as patientRepository from '../src/repositories/patient.repository.js';
import app from '../src/app.js';
import { ADMIN, DOCTOR, PATIENT, bearer } from './helpers.js';

vi.mock('../src/config/db.js', () => ({
  pool: { getConnection: vi.fn(), execute: vi.fn(), query: vi.fn() },
  pingDatabase: vi.fn(),
}));
vi.mock('../src/repositories/patient.repository.js');

const SAMAN = { id: 10, firstName: 'Saman', lastName: 'Silva', dateOfBirth: '1985-04-12', phone: '+94 71 200 0001' };

describe('GET /api/patients', () => {
  it('lets an admin list patients', async () => {
    patientRepository.findAll.mockResolvedValue([SAMAN]);
    const res = await request(app).get('/api/patients').set('Authorization', bearer(ADMIN));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [SAMAN] });
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  it.each([['patient', PATIENT], ['doctor', DOCTOR]])('returns 403 for a %s', async (_, user) => {
    const res = await request(app).get('/api/patients').set('Authorization', bearer(user));
    expect(res.status).toBe(403);
    expect(patientRepository.findAll).not.toHaveBeenCalled();
  });
});

describe('GET /api/patients/:id', () => {
  it('lets an admin read any patient', async () => {
    patientRepository.findById.mockResolvedValue(SAMAN);
    const res = await request(app).get('/api/patients/10').set('Authorization', bearer(ADMIN));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(SAMAN);
  });

  it('lets a patient read their own record', async () => {
    patientRepository.findById.mockResolvedValue(SAMAN);
    const res = await request(app).get(`/api/patients/${PATIENT.patientId}`).set('Authorization', bearer(PATIENT));
    expect(res.status).toBe(200);
    expect(patientRepository.findById).toHaveBeenCalledWith(PATIENT.patientId);
  });

  it("returns 403 for another patient's record, without looking it up", async () => {
    const res = await request(app).get('/api/patients/11').set('Authorization', bearer(PATIENT));
    expect(res.status).toBe(403);
    expect(patientRepository.findById).not.toHaveBeenCalled();
  });

  it('returns 403 for a doctor', async () => {
    const res = await request(app).get('/api/patients/10').set('Authorization', bearer(DOCTOR));
    expect(res.status).toBe(403);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/patients/10');
    expect(res.status).toBe(401);
  });

  it('returns 404 for an unknown patient', async () => {
    patientRepository.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/patients/99').set('Authorization', bearer(ADMIN));
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Patient 99 not found');
  });

  it('returns 400 for an invalid id', async () => {
    const res = await request(app).get('/api/patients/abc').set('Authorization', bearer(ADMIN));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/patients', () => {
  const body = { firstName: 'Nimal', lastName: 'Silva', dateOfBirth: '1990-01-01', phone: '0771234567' };

  it('lets an admin register a patient', async () => {
    patientRepository.create.mockResolvedValue({ id: 12, ...body });
    const res = await request(app).post('/api/patients').set('Authorization', bearer(ADMIN)).send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(12);
  });

  it('returns 400 for an invalid body', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', bearer(ADMIN))
      .send({ ...body, phone: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('phone');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/patients').send(body);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a patient', async () => {
    const res = await request(app).post('/api/patients').set('Authorization', bearer(PATIENT)).send(body);
    expect(res.status).toBe(403);
    expect(patientRepository.create).not.toHaveBeenCalled();
  });

  it('returns 409 for a duplicate email', async () => {
    patientRepository.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', bearer(ADMIN))
      .send({ ...body, email: 'saman.silva@example.com' });
    expect(res.status).toBe(409);
  });
});
