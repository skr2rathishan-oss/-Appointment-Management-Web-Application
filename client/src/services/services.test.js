import { describe, expect, it, vi } from 'vitest';
import httpClient from '../api/httpClient';
import { authService } from './authService';
import { doctorService } from './doctorService';
import { patientService } from './patientService';
import { APPOINTMENT_STATUSES, appointmentService } from './appointmentService';
import { clinicService } from './clinicService';

// Every service goes through the shared client, so mocking it isolates the services
vi.mock('../api/httpClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

// axios-style response wrapping the API's { data } envelope
const reply = (data) => Promise.resolve({ data: { data } });

describe('authService', () => {
  it('register posts the form to /auth/register and returns { token, user }', async () => {
    const session = { token: 't', user: { id: 1 } };
    httpClient.post.mockReturnValue(reply(session));
    const form = { firstName: 'A', email: 'a@b.c', password: 'secret123' };

    await expect(authService.register(form)).resolves.toEqual(session);
    expect(httpClient.post).toHaveBeenCalledWith('/auth/register', form);
  });

  it('login posts the credentials to /auth/login and returns { token, user }', async () => {
    const session = { token: 't', user: { id: 1 } };
    httpClient.post.mockReturnValue(reply(session));

    await expect(authService.login('a@b.c', 'secret123')).resolves.toEqual(session);
    expect(httpClient.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.c', password: 'secret123' });
  });

  it('me gets /auth/me and returns the user', async () => {
    httpClient.get.mockReturnValue(reply({ id: 1, role: 'patient' }));
    await expect(authService.me()).resolves.toEqual({ id: 1, role: 'patient' });
    expect(httpClient.get).toHaveBeenCalledWith('/auth/me');
  });
});

describe('doctorService', () => {
  it('list gets /doctors', async () => {
    httpClient.get.mockReturnValue(reply([{ id: 1 }]));
    await expect(doctorService.list()).resolves.toEqual([{ id: 1 }]);
    expect(httpClient.get).toHaveBeenCalledWith('/doctors');
  });

  it('getById gets /doctors/:id', async () => {
    httpClient.get.mockReturnValue(reply({ id: 3 }));
    await expect(doctorService.getById(3)).resolves.toEqual({ id: 3 });
    expect(httpClient.get).toHaveBeenCalledWith('/doctors/3');
  });

  it('create posts to /doctors', async () => {
    const doctor = { firstName: 'K', lastName: 'F', specialization: 'Cardiology', email: 'k@c.l' };
    httpClient.post.mockReturnValue(reply({ id: 4, ...doctor }));
    await expect(doctorService.create(doctor)).resolves.toEqual({ id: 4, ...doctor });
    expect(httpClient.post).toHaveBeenCalledWith('/doctors', doctor);
  });

  it('getAvailability gets /doctors/:id/availability with the date param', async () => {
    const availability = { date: '2026-11-05', doctorId: 2, slots: [] };
    httpClient.get.mockReturnValue(reply(availability));
    await expect(doctorService.getAvailability(2, '2026-11-05')).resolves.toEqual(availability);
    expect(httpClient.get).toHaveBeenCalledWith('/doctors/2/availability', { params: { date: '2026-11-05' } });
  });
});

describe('patientService', () => {
  it('list gets /patients', async () => {
    httpClient.get.mockReturnValue(reply([{ id: 1 }]));
    await expect(patientService.list()).resolves.toEqual([{ id: 1 }]);
    expect(httpClient.get).toHaveBeenCalledWith('/patients');
  });

  it('getById gets /patients/:id', async () => {
    httpClient.get.mockReturnValue(reply({ id: 7 }));
    await expect(patientService.getById(7)).resolves.toEqual({ id: 7 });
    expect(httpClient.get).toHaveBeenCalledWith('/patients/7');
  });

  it('create posts to /patients', async () => {
    const patient = { firstName: 'S', lastName: 'S', dateOfBirth: '1985-04-12', phone: '1' };
    httpClient.post.mockReturnValue(reply({ id: 8, ...patient }));
    await expect(patientService.create(patient)).resolves.toEqual({ id: 8, ...patient });
    expect(httpClient.post).toHaveBeenCalledWith('/patients', patient);
  });
});

describe('appointmentService', () => {
  it('exposes the five statuses in API order', () => {
    expect(APPOINTMENT_STATUSES).toEqual(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']);
  });

  it('list gets /appointments with the filters as params', async () => {
    httpClient.get.mockReturnValue(reply([{ id: 1 }]));
    await expect(appointmentService.list({ date: '2026-11-05' })).resolves.toEqual([{ id: 1 }]);
    expect(httpClient.get).toHaveBeenCalledWith('/appointments', { params: { date: '2026-11-05' } });
  });

  it('list defaults to no filters', async () => {
    httpClient.get.mockReturnValue(reply([]));
    await appointmentService.list();
    expect(httpClient.get).toHaveBeenCalledWith('/appointments', { params: {} });
  });

  it('getById gets /appointments/:id', async () => {
    httpClient.get.mockReturnValue(reply({ id: 5 }));
    await expect(appointmentService.getById(5)).resolves.toEqual({ id: 5 });
    expect(httpClient.get).toHaveBeenCalledWith('/appointments/5');
  });

  it('create posts to /appointments', async () => {
    const booking = { doctorId: 2, appointmentDate: '2026-11-05', startTime: '09:30:00', endTime: '10:00:00' };
    httpClient.post.mockReturnValue(reply({ id: 9, ...booking }));
    await expect(appointmentService.create(booking)).resolves.toEqual({ id: 9, ...booking });
    expect(httpClient.post).toHaveBeenCalledWith('/appointments', booking);
  });

  it('updateStatus patches /appointments/:id/status with { status }', async () => {
    httpClient.patch.mockReturnValue(reply({ id: 5, status: 'cancelled' }));
    await expect(appointmentService.updateStatus(5, 'cancelled')).resolves.toEqual({ id: 5, status: 'cancelled' });
    expect(httpClient.patch).toHaveBeenCalledWith('/appointments/5/status', { status: 'cancelled' });
  });

  it('remove deletes /appointments/:id', async () => {
    httpClient.delete.mockResolvedValue({ status: 204 });
    await appointmentService.remove(5);
    expect(httpClient.delete).toHaveBeenCalledWith('/appointments/5');
  });
});

describe('clinicService', () => {
  it('getTime gets /clinic/time and returns { date, time, timeZone }', async () => {
    const clock = { date: '2026-11-05', time: '10:10:00', timeZone: 'Asia/Colombo' };
    httpClient.get.mockReturnValue(reply(clock));
    await expect(clinicService.getTime()).resolves.toEqual(clock);
    expect(httpClient.get).toHaveBeenCalledWith('/clinic/time');
  });
});
