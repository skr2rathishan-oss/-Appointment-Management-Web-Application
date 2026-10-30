import * as appointmentService from '../services/appointment.service.js';
import { parseOrThrow } from '../middlewares/validate.js';
import { listQuerySchema } from '../validators/appointment.validator.js';
import { parseId } from '../utils/parseId.js';

export async function list(req, res) {
  const filters = parseOrThrow(listQuerySchema, req.query);
  res.json({ data: await appointmentService.listAppointments(filters, req.user) });
}

export async function getById(req, res) {
  res.json({ data: await appointmentService.getAppointment(parseId(req.params.id), req.user) });
}

export async function create(req, res) {
  res.status(201).json({ data: await appointmentService.createAppointment(req.body, req.user) });
}

export async function updateStatus(req, res) {
  const appointment = await appointmentService.updateAppointmentStatus(
    parseId(req.params.id),
    req.body.status,
    req.user,
  );
  res.json({ data: appointment });
}

export async function remove(req, res) {
  await appointmentService.deleteAppointment(parseId(req.params.id));
  res.status(204).end();
}
