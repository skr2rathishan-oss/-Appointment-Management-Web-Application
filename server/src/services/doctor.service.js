import * as doctorRepository from '../repositories/doctor.repository.js';
import * as appointmentRepository from '../repositories/appointment.repository.js';
import { buildSlots } from './availability.js';
import { clinicNow } from '../utils/clinicTime.js';
import { ApiError } from '../utils/ApiError.js';

export const listDoctors = () => doctorRepository.findAll();

export async function getDoctor(id) {
  const doctor = await doctorRepository.findById(id);
  if (!doctor) throw ApiError.notFound(`Doctor ${id} not found`);
  return doctor;
}

export const createDoctor = (data) => doctorRepository.create(data);

// 30-minute slots for one day, each marked available or not. today/now are the clinic's
// current date and time, so the client can label past slots without trusting its own clock.
export async function getAvailability(doctorId, date, now = new Date()) {
  await getDoctor(doctorId);
  const booked = await appointmentRepository.findActiveByDoctorAndDate(doctorId, date);
  const current = clinicNow(now);
  return {
    date,
    doctorId,
    today: current.date,
    now: current.time,
    slots: buildSlots({ date, booked, clinicNow: current }),
  };
}
