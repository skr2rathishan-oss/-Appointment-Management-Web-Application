import * as patientRepository from '../repositories/patient.repository.js';
import { ApiError } from '../utils/ApiError.js';

export const listPatients = () => patientRepository.findAll();

export async function getPatient(id) {
  const patient = await patientRepository.findById(id);
  if (!patient) throw ApiError.notFound(`Patient ${id} not found`);
  return patient;
}

// Admins can read any patient; a patient only their own record (checked before lookup, so
// other ids give 403 rather than revealing whether they exist)
export async function getPatientForUser(id, user) {
  if (user.role !== 'admin' && user.patientId !== id) {
    throw ApiError.forbidden('You can only view your own patient record');
  }
  return getPatient(id);
}

export const createPatient = (data) => patientRepository.create(data);
