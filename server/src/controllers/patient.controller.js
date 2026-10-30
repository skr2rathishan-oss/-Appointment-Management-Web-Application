import * as patientService from '../services/patient.service.js';
import { parseId } from '../utils/parseId.js';

export async function list(req, res) {
  res.json({ data: await patientService.listPatients() });
}

export async function getById(req, res) {
  res.json({ data: await patientService.getPatientForUser(parseId(req.params.id), req.user) });
}

export async function create(req, res) {
  res.status(201).json({ data: await patientService.createPatient(req.body) });
}
