import * as appointmentRepository from '../repositories/appointment.repository.js';
import * as patientRepository from '../repositories/patient.repository.js';
import { INACTIVE_STATUSES } from '../repositories/appointment.repository.js';
import { isInPast } from './availability.js';
import { clinicNow } from '../utils/clinicTime.js';
import { withTransaction } from '../utils/transaction.js';
import { ApiError } from '../utils/ApiError.js';

const SLOT_TAKEN = 'The doctor already has an appointment in this time slot';
// Statuses of a visit that is still going ahead
const ACTIVE_STATUSES = ['scheduled', 'confirmed'];

// `user` is req.user from the auth middleware: { id, role, patientId, doctorId }

// A patient account's own patient id; 403 if the token has none
function ownPatientId(user) {
  if (!Number.isInteger(user.patientId) || user.patientId <= 0) {
    throw ApiError.forbidden('This account has no patient profile');
  }
  return user.patientId;
}

// A doctor account's own doctor id; 403 if the token has none
function ownDoctorId(user) {
  if (!Number.isInteger(user.doctorId) || user.doctorId <= 0) {
    throw ApiError.forbidden('This account has no doctor profile');
  }
  return user.doctorId;
}

// Patients and doctors may only touch appointments they are part of; admins see everything
function assertCanAccess(appointment, user) {
  const own =
    user.role === 'admin' ||
    (user.role === 'patient' && appointment.patientId === ownPatientId(user)) ||
    (user.role === 'doctor' && appointment.doctorId === ownDoctorId(user));
  if (!own) throw ApiError.forbidden('You can only access your own appointments');
}

// Statuses each non-admin role may set on its own appointments
const ALLOWED_STATUS_CHANGES = {
  patient: ['cancelled'],
  doctor: ['confirmed', 'completed', 'no_show', 'cancelled'],
};

// Patients and doctors only ever see their own appointments, whatever filters they send
export function listAppointments(filters, user) {
  if (user.role === 'patient') {
    return appointmentRepository.findAll({ ...filters, patientId: ownPatientId(user) });
  }
  if (user.role === 'doctor') {
    return appointmentRepository.findAll({ ...filters, doctorId: ownDoctorId(user) });
  }
  return appointmentRepository.findAll(filters);
}

export async function getAppointment(id, user) {
  const appointment = await appointmentRepository.findById(id);
  if (!appointment) throw ApiError.notFound(`Appointment ${id} not found`);
  assertCanAccess(appointment, user);
  return appointment;
}

// Patients book for themselves (patientId from the token); admins name the patient
export async function createAppointment(input, user, now = new Date()) {
  const data = { ...input, patientId: user.role === 'patient' ? ownPatientId(user) : input.patientId };

  if (isInPast(data.appointmentDate, data.startTime, clinicNow(now))) {
    throw ApiError.badRequest('Appointments cannot be booked in the past');
  }

  // The doctor row lock serialises concurrent bookings, so two requests can't both pass the overlap check
  return withTransaction(async (connection) => {
    if (!(await appointmentRepository.lockDoctor(data.doctorId, connection))) {
      throw ApiError.notFound(`Doctor ${data.doctorId} not found`);
    }
    if (!(await patientRepository.findById(data.patientId, connection))) {
      throw ApiError.notFound(`Patient ${data.patientId} not found`);
    }
    const clashes = await appointmentRepository.findOverlapping(data, connection);
    if (clashes.length > 0) throw ApiError.conflict(SLOT_TAKEN);

    return appointmentRepository.create(data, connection);
  });
}

// Patients may only cancel; doctors confirm/complete/no-show/cancel their own; admins set anything
export async function updateAppointmentStatus(id, status, user, now = new Date()) {
  const appointment = await getAppointment(id, user);
  const allowed = ALLOWED_STATUS_CHANGES[user.role];
  if (allowed && !allowed.includes(status)) {
    throw ApiError.forbidden(`You cannot set an appointment to ${status}`);
  }

  const started = isInPast(appointment.appointmentDate, appointment.startTime, clinicNow(now));
  if (user.role === 'patient' && (!ACTIVE_STATUSES.includes(appointment.status) || started)) {
    throw ApiError.conflict('Only upcoming visits can be cancelled');
  }
  if (user.role === 'doctor' && ['completed', 'no_show'].includes(status) && !started) {
    throw ApiError.conflict("This visit hasn't started yet");
  }

  const reactivating = INACTIVE_STATUSES.includes(appointment.status) && !INACTIVE_STATUSES.includes(status);
  if (!reactivating) return appointmentRepository.updateStatus(id, status);

  // The slot was freed when it was cancelled; someone else may have booked it since
  return withTransaction(async (connection) => {
    await appointmentRepository.lockDoctor(appointment.doctorId, connection);
    const clashes = await appointmentRepository.findOverlapping({ ...appointment, excludeId: id }, connection);
    if (clashes.length > 0) throw ApiError.conflict(SLOT_TAKEN);
    return appointmentRepository.updateStatus(id, status, connection);
  });
}

export async function deleteAppointment(id) {
  const deleted = await appointmentRepository.remove(id);
  if (!deleted) throw ApiError.notFound(`Appointment ${id} not found`);
}
