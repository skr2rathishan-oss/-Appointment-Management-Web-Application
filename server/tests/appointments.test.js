import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { pool } from '../src/config/db.js';
import * as appointmentRepository from '../src/repositories/appointment.repository.js';
import * as patientRepository from '../src/repositories/patient.repository.js';
import app from '../src/app.js';
import { ADMIN, DOCTOR, OTHER_PATIENT, PATIENT, bearer, fakeConnection } from './helpers.js';

vi.mock('../src/config/db.js', () => ({
  pool: { getConnection: vi.fn(), execute: vi.fn(), query: vi.fn() },
  pingDatabase: vi.fn(),
}));
// Keep the real INACTIVE_STATUSES constant, mock every query function
vi.mock('../src/repositories/appointment.repository.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    INACTIVE_STATUSES: actual.INACTIVE_STATUSES,
    findAll: vi.fn(),
    findById: vi.fn(),
    findActiveByDoctorAndDate: vi.fn(),
    lockDoctor: vi.fn(),
    findOverlapping: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    remove: vi.fn(),
  };
});
vi.mock('../src/repositories/patient.repository.js');

// PATIENT (patientId 10) with DOCTOR (doctorId 20)
const APPT = {
  id: 5,
  patientId: PATIENT.patientId,
  doctorId: DOCTOR.doctorId,
  appointmentDate: '2026-06-20',
  startTime: '10:00:00',
  endTime: '10:30:00',
  status: 'scheduled',
};
const OTHER_DOCTORS_APPT = { ...APPT, id: 6, doctorId: 21, patientId: OTHER_PATIENT.patientId };

let connection;

beforeEach(() => {
  // "Now" is 2026-06-15 10:10 UTC; CLINIC_TZ is UTC in tests
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-06-15T10:10:00Z'));
  connection = fakeConnection();
  pool.getConnection.mockResolvedValue(connection);
});

afterEach(() => vi.useRealTimers());

const auth = (user) => ({ Authorization: bearer(user) });

describe('authentication', () => {
  it.each([
    ['get', '/api/appointments'],
    ['get', '/api/appointments/5'],
    ['post', '/api/appointments'],
    ['patch', '/api/appointments/5/status'],
    ['delete', '/api/appointments/5'],
  ])('%s %s returns 401 without a token', async (method, url) => {
    const res = await request(app)[method](url).send({});
    expect(res.status).toBe(401);
  });
});

describe('GET /api/appointments', () => {
  beforeEach(() => appointmentRepository.findAll.mockResolvedValue([APPT]));

  it('lets an admin list with any filters', async () => {
    const res = await request(app).get('/api/appointments?doctorId=20&patientId=11&date=2026-06-20&status=scheduled').set(auth(ADMIN));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [APPT] });
    expect(appointmentRepository.findAll).toHaveBeenCalledWith({
      doctorId: 20,
      patientId: 11,
      date: '2026-06-20',
      status: 'scheduled',
    });
  });

  it("forces a patient's own patientId, ignoring the query", async () => {
    const res = await request(app).get('/api/appointments?patientId=11').set(auth(PATIENT));
    expect(res.status).toBe(200);
    expect(appointmentRepository.findAll).toHaveBeenCalledWith({ patientId: PATIENT.patientId });
  });

  it("forces a doctor's own doctorId, ignoring the query", async () => {
    const res = await request(app).get('/api/appointments?doctorId=21&date=2026-06-20').set(auth(DOCTOR));
    expect(res.status).toBe(200);
    expect(appointmentRepository.findAll).toHaveBeenCalledWith({ doctorId: DOCTOR.doctorId, date: '2026-06-20' });
  });

  it('returns 403 for a patient token without a patient profile', async () => {
    const res = await request(app).get('/api/appointments').set(auth({ ...PATIENT, patientId: null }));
    expect(res.status).toBe(403);
    expect(appointmentRepository.findAll).not.toHaveBeenCalled();
  });

  it('returns 403 for a doctor token without a doctor profile', async () => {
    const res = await request(app).get('/api/appointments').set(auth({ ...DOCTOR, doctorId: null }));
    expect(res.status).toBe(403);
    expect(appointmentRepository.findAll).not.toHaveBeenCalled();
  });

  it.each([
    ['a bad date', '?date=2026-13-01'],
    ['a bad status', '?status=lost'],
    ['a bad id', '?doctorId=abc'],
    ['a repeated key', '?date=2026-06-20&date=2026-06-21'],
  ])('returns 400 for %s', async (_, query) => {
    const res = await request(app).get(`/api/appointments${query}`).set(auth(ADMIN));
    expect(res.status).toBe(400);
    expect(appointmentRepository.findAll).not.toHaveBeenCalled();
  });
});

describe('GET /api/appointments/:id', () => {
  it.each([
    ['an admin', ADMIN],
    ['the patient', PATIENT],
    ['the doctor', DOCTOR],
  ])('returns the appointment to %s', async (_, user) => {
    appointmentRepository.findById.mockResolvedValue(APPT);
    const res = await request(app).get('/api/appointments/5').set(auth(user));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(APPT);
  });

  it.each([
    ['another patient', PATIENT],
    ['another doctor', DOCTOR],
  ])("returns 403 for %s's appointment", async (_, user) => {
    appointmentRepository.findById.mockResolvedValue(OTHER_DOCTORS_APPT);
    const res = await request(app).get('/api/appointments/6').set(auth(user));
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown appointment', async () => {
    appointmentRepository.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/appointments/99').set(auth(ADMIN));
    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid id', async () => {
    const res = await request(app).get('/api/appointments/5abc').set(auth(ADMIN));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/appointments', () => {
  const slot = { doctorId: 20, appointmentDate: '2026-06-20', startTime: '10:00', endTime: '10:30', reason: 'Check-up' };

  beforeEach(() => {
    appointmentRepository.lockDoctor.mockResolvedValue(true);
    patientRepository.findById.mockResolvedValue({ id: 10 });
    appointmentRepository.findOverlapping.mockResolvedValue([]);
    appointmentRepository.create.mockResolvedValue(APPT);
  });

  it('books a slot for the logged-in patient inside a transaction', async () => {
    const res = await request(app).post('/api/appointments').set(auth(PATIENT)).send(slot);

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(APPT);
    const expected = { ...slot, startTime: '10:00:00', endTime: '10:30:00', patientId: PATIENT.patientId };
    expect(appointmentRepository.lockDoctor).toHaveBeenCalledWith(20, connection);
    expect(appointmentRepository.findOverlapping).toHaveBeenCalledWith(expect.objectContaining(expected), connection);
    expect(appointmentRepository.create).toHaveBeenCalledWith(expect.objectContaining(expected), connection);
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  it('rejects a patientId sent by a patient', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set(auth(PATIENT))
      .send({ ...slot, patientId: OTHER_PATIENT.patientId });
    expect(res.status).toBe(400);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it.each([
    ['off the half-hour grid', { startTime: '10:15', endTime: '10:45' }],
    ['longer than one slot', { startTime: '10:00', endTime: '11:00' }],
    ['outside working hours', { startTime: '17:00', endTime: '17:30' }],
  ])('returns 400 for a patient slot %s', async (_, times) => {
    const res = await request(app).post('/api/appointments').set(auth(PATIENT)).send({ ...slot, ...times });
    expect(res.status).toBe(400);
  });

  it('lets an admin book any time range for a named patient', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set(auth(ADMIN))
      .send({ ...slot, patientId: 11, startTime: '18:15', endTime: '18:40' });
    expect(res.status).toBe(201);
    expect(appointmentRepository.create).toHaveBeenCalledWith(expect.objectContaining({ patientId: 11 }), connection);
  });

  it('returns 400 when an admin omits patientId', async () => {
    const res = await request(app).post('/api/appointments').set(auth(ADMIN)).send(slot);
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('patientId');
  });

  it('returns 400 for a missing date', async () => {
    const { appointmentDate, ...rest } = slot;
    const res = await request(app).post('/api/appointments').set(auth(PATIENT)).send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('appointmentDate');
  });

  it.each([
    ['an earlier day', { appointmentDate: '2026-06-14' }],
    ['earlier today', { appointmentDate: '2026-06-15', startTime: '10:00', endTime: '10:30' }],
  ])('returns 400 for a slot on %s', async (_, change) => {
    const res = await request(app).post('/api/appointments').set(auth(PATIENT)).send({ ...slot, ...change });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Appointments cannot be booked in the past');
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('returns 403 for a doctor', async () => {
    const res = await request(app).post('/api/appointments').set(auth(DOCTOR)).send({ ...slot, patientId: 10 });
    expect(res.status).toBe(403);
  });

  it('returns 404 and rolls back for an unknown doctor', async () => {
    appointmentRepository.lockDoctor.mockResolvedValue(false);
    const res = await request(app).post('/api/appointments').set(auth(PATIENT)).send(slot);
    expect(res.status).toBe(404);
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown patient', async () => {
    patientRepository.findById.mockResolvedValue(null);
    const res = await request(app).post('/api/appointments').set(auth(ADMIN)).send({ ...slot, patientId: 99 });
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Patient 99 not found');
  });

  it('returns 409 and rolls back when the slot is taken', async () => {
    appointmentRepository.findOverlapping.mockResolvedValue([{ id: 1 }]);
    const res = await request(app).post('/api/appointments').set(auth(PATIENT)).send(slot);
    expect(res.status).toBe(409);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });
});

describe('PATCH /api/appointments/:id/status', () => {
  beforeEach(() => {
    appointmentRepository.findById.mockResolvedValue(APPT);
    appointmentRepository.updateStatus.mockImplementation(async (id, status) => ({ ...APPT, status }));
    appointmentRepository.lockDoctor.mockResolvedValue(true);
    appointmentRepository.findOverlapping.mockResolvedValue([]);
  });

  const patch = (user, status, id = 5) =>
    request(app).patch(`/api/appointments/${id}/status`).set(auth(user)).send({ status });

  it('lets a patient cancel their own appointment', async () => {
    const res = await patch(PATIENT, 'cancelled');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(5, 'cancelled');
  });

  it('returns 403 when a patient sets anything other than cancelled', async () => {
    const res = await patch(PATIENT, 'confirmed');
    expect(res.status).toBe(403);
    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("returns 403 when a patient cancels someone else's appointment", async () => {
    const res = await patch(OTHER_PATIENT, 'cancelled');
    expect(res.status).toBe(403);
  });

  // "Now" is 2026-06-15 10:10; APPT is on 2026-06-20, so it is upcoming
  const PAST_APPT = { ...APPT, appointmentDate: '2026-06-15', startTime: '09:30:00', endTime: '10:00:00' };

  it('lets a patient cancel an upcoming confirmed visit', async () => {
    appointmentRepository.findById.mockResolvedValue({ ...APPT, status: 'confirmed' });
    const res = await patch(PATIENT, 'cancelled');
    expect(res.status).toBe(200);
  });

  it.each([
    ['a completed visit', { ...PAST_APPT, status: 'completed' }],
    ['a past visit that is still scheduled', PAST_APPT],
    ['a visit that is already cancelled', { ...APPT, status: 'cancelled' }],
    ['a visit starting right now', { ...APPT, appointmentDate: '2026-06-15', startTime: '10:10:00' }],
  ])('returns 409 when a patient cancels %s', async (_, appointment) => {
    appointmentRepository.findById.mockResolvedValue(appointment);
    const res = await patch(PATIENT, 'cancelled');
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Only upcoming visits can be cancelled');
    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it.each(['confirmed', 'cancelled'])('lets the doctor set %s on their own upcoming appointment', async (status) => {
    const res = await patch(DOCTOR, status);
    expect(res.status).toBe(200);
    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(5, status);
  });

  it.each(['completed', 'no_show'])('lets the doctor mark a visit that has started %s', async (status) => {
    appointmentRepository.findById.mockResolvedValue({ ...PAST_APPT, status: 'confirmed' });
    const res = await patch(DOCTOR, status);
    expect(res.status).toBe(200);
    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(5, status);
  });

  it.each(['completed', 'no_show'])('returns 409 when a doctor marks a future visit %s', async (status) => {
    appointmentRepository.findById.mockResolvedValue({ ...APPT, status: 'confirmed' });
    const res = await patch(DOCTOR, status);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("This visit hasn't started yet");
    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('lets an admin mark a future visit completed', async () => {
    const res = await patch(ADMIN, 'completed');
    expect(res.status).toBe(200);
  });

  it("returns 403 when a doctor changes another doctor's appointment", async () => {
    appointmentRepository.findById.mockResolvedValue(OTHER_DOCTORS_APPT);
    const res = await patch(DOCTOR, 'confirmed', 6);
    expect(res.status).toBe(403);
    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('returns 403 when a doctor sets an appointment back to scheduled', async () => {
    const res = await patch(DOCTOR, 'scheduled');
    expect(res.status).toBe(403);
  });

  it('lets an admin set any status', async () => {
    const res = await patch(ADMIN, 'scheduled');
    expect(res.status).toBe(200);
  });

  it('returns 400 for an unknown status', async () => {
    const res = await patch(ADMIN, 'lost');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('status');
  });

  it('returns 404 for an unknown appointment', async () => {
    appointmentRepository.findById.mockResolvedValue(null);
    const res = await patch(ADMIN, 'confirmed', 99);
    expect(res.status).toBe(404);
  });

  it('re-checks the slot when a cancelled appointment is reactivated', async () => {
    appointmentRepository.findById.mockResolvedValue({ ...APPT, status: 'cancelled' });
    const res = await patch(ADMIN, 'confirmed');
    expect(res.status).toBe(200);
    expect(appointmentRepository.findOverlapping).toHaveBeenCalledWith(
      expect.objectContaining({ doctorId: 20, appointmentDate: '2026-06-20', excludeId: 5 }),
      connection,
    );
    expect(connection.commit).toHaveBeenCalled();
  });

  it('returns 409 when reactivating into a slot that was rebooked', async () => {
    appointmentRepository.findById.mockResolvedValue({ ...APPT, status: 'cancelled' });
    appointmentRepository.findOverlapping.mockResolvedValue([{ id: 8 }]);
    const res = await patch(DOCTOR, 'confirmed');
    expect(res.status).toBe(409);
    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalled();
  });
});

describe('DELETE /api/appointments/:id', () => {
  it('lets an admin delete', async () => {
    appointmentRepository.remove.mockResolvedValue(true);
    const res = await request(app).delete('/api/appointments/5').set(auth(ADMIN));
    expect(res.status).toBe(204);
    expect(appointmentRepository.remove).toHaveBeenCalledWith(5);
  });

  it.each([['patient', PATIENT], ['doctor', DOCTOR]])('returns 403 for a %s', async (_, user) => {
    const res = await request(app).delete('/api/appointments/5').set(auth(user));
    expect(res.status).toBe(403);
    expect(appointmentRepository.remove).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown appointment', async () => {
    appointmentRepository.remove.mockResolvedValue(false);
    const res = await request(app).delete('/api/appointments/99').set(auth(ADMIN));
    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid id', async () => {
    const res = await request(app).delete('/api/appointments/x').set(auth(ADMIN));
    expect(res.status).toBe(400);
  });
});
