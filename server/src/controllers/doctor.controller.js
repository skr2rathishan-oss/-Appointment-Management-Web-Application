import * as doctorService from '../services/doctor.service.js';
import { parseOrThrow } from '../middlewares/validate.js';
import { availabilityQuerySchema } from '../validators/doctor.validator.js';
import { parseId } from '../utils/parseId.js';

export async function list(req, res) {
  res.json({ data: await doctorService.listDoctors() });
}

export async function getById(req, res) {
  res.json({ data: await doctorService.getDoctor(parseId(req.params.id)) });
}

export async function getAvailability(req, res) {
  const id = parseId(req.params.id);
  const { date } = parseOrThrow(availabilityQuerySchema, req.query);
  res.json({ data: await doctorService.getAvailability(id, date) });
}

export async function create(req, res) {
  res.status(201).json({ data: await doctorService.createDoctor(req.body) });
}
