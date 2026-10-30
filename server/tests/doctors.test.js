import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import * as doctorRepository from '../src/repositories/doctor.repository.js';
import * as appointmentRepository from '../src/repositories/appointment.repository.js';
import app from '../src/app.js';
import { ADMIN, DOCTOR, PATIENT, bearer } from './helpers.js';

vi.mock('../src/config/db.js', () => ({
  pool: { getConnection: vi.fn(), execute: vi.fn(), query: vi.fn() },
  pingDatabase: vi.fn(),
}));
vi.mock('../src/repositories/doctor.repository.js');
vi.mock('../src/repositories/appointment.repository.js');

const DR = {
  id: 1,
  firstName: 'Anjali',
  lastName: 'Perera',
  specialization: 'General Practice',
  email: 'anjali@clinic.local',
  phone: null,
};

describe('GET /api/doctors', () => {
  it('is public and lists doctors', async () => {
    doctorRepository.findAll.mockResolvedValue([DR]);
    const res = await request(app).get('/api/doctors');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [DR] });
  });
});

describe('GET /api/doctors/:id', () => {
  it('is public and returns the doctor', async () => {
    doctorRepository.findById.mockResolvedValue(DR);
    const res = await request(app).get('/api/doctors/1');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(DR);
    expect(doctorRepository.findById).toHaveBeenCalledWith(1);
  });

  it('returns 404 for an unknown doctor', async () => {
    doctorRepository.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/doctors/99');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Doctor 99 not found');
  });

  it.each(['abc', '1e3', '0', '-1'])('returns 400 for the invalid id %s', async (id) => {
    const res = await request(app).get(`/api/doctors/${id}`);
    expect(res.status).toBe(400);
    expect(doctorRepository.findById).not.toHaveBeenCalled();
  });
});

describe('GET /api/doctors/:id/availability', () => {
  beforeEach(() => {
    // 2026-06-15 10:10 UTC (CLINIC_TZ is UTC in tests)
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-15T10:10:00Z'));
    doctorRepository.findById.mockResolvedValue(DR);
    appointmentRepository.findActiveByDoctorAndDate.mockResolvedValue([
      { startTime: '13:00:00', endTime: '14:00:00' },
    ]);
  });

  afterEach(() => vi.useRealTimers());

  it('is public and returns 16 half-hour slots with booked and past ones unavailable', async () => {
    const res = await request(app).get('/api/doctors/1/availability?date=2026-06-15');

    expect(res.status).toBe(200);
    const { date, doctorId, today, now, slots } = res.body.data;
    expect(date).toBe('2026-06-15');
    expect(doctorId).toBe(1);
    expect(today).toBe('2026-06-15');
    expect(now).toBe('10:10:00');
    expect(slots).toHaveLength(16);
    expect(slots[0]).toEqual({ startTime: '09:00:00', endTime: '09:30:00', available: false });
    expect(slots.find((s) => s.startTime === '10:00:00').available).toBe(false); // started 10 min ago
    expect(slots.find((s) => s.startTime === '10:30:00').available).toBe(true);
    expect(slots.filter((s) => s.startTime >= '13:00:00' && s.startTime < '14:00:00').every((s) => !s.available)).toBe(true);
    expect(slots.at(-1)).toEqual({ startTime: '16:30:00', endTime: '17:00:00', available: true });
    expect(appointmentRepository.findActiveByDoctorAndDate).toHaveBeenCalledWith(1, '2026-06-15');
  });

  it.each([
    ['missing', ''],
    ['badly formatted', '?date=15-06-2026'],
    ['not a calendar date', '?date=2026-02-30'],
    ['repeated', '?date=2026-06-15&date=2026-06-16'],
  ])('returns 400 when the date is %s', async (_, query) => {
    const res = await request(app).get(`/api/doctors/1/availability${query}`);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.details[0].field).toBe('date');
  });

  it('returns 404 for an unknown doctor', async () => {
    doctorRepository.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/doctors/99/availability?date=2026-06-15');
    expect(res.status).toBe(404);
    expect(appointmentRepository.findActiveByDoctorAndDate).not.toHaveBeenCalled();
  });
});

describe('POST /api/doctors', () => {
  const body = { firstName: 'Kavin', lastName: 'Fernando', specialization: 'Cardiology', email: 'kavin@clinic.local' };

  it('lets an admin create a doctor', async () => {
    doctorRepository.create.mockResolvedValue({ id: 2, ...body, phone: null });
    const res = await request(app).post('/api/doctors').set('Authorization', bearer(ADMIN)).send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(2);
    expect(doctorRepository.create).toHaveBeenCalledWith(expect.objectContaining(body));
  });

  it('returns 400 for an invalid body', async () => {
    const res = await request(app)
      .post('/api/doctors')
      .set('Authorization', bearer(ADMIN))
      .send({ ...body, email: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('email');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/doctors').send(body);
    expect(res.status).toBe(401);
    expect(doctorRepository.create).not.toHaveBeenCalled();
  });

  it.each([['patient', PATIENT], ['doctor', DOCTOR]])('returns 403 for a %s', async (_, user) => {
    const res = await request(app).post('/api/doctors').set('Authorization', bearer(user)).send(body);
    expect(res.status).toBe(403);
    expect(doctorRepository.create).not.toHaveBeenCalled();
  });

  it('returns 409 for a duplicate email', async () => {
    doctorRepository.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    const res = await request(app).post('/api/doctors').set('Authorization', bearer(ADMIN)).send(body);
    expect(res.status).toBe(409);
  });
});
