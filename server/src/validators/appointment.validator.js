import { z } from 'zod';
import { dateString, idString, optionalText, timeString } from './common.js';
import { isWorkdaySlot } from '../services/availability.js';

export const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

const endAfterStart = [
  (data) => data.endTime > data.startTime,
  { message: 'endTime must be after startTime', path: ['endTime'] },
];

// Admin booking: any time range, for a named patient
export const createAppointmentSchema = z
  .object({
    patientId: z.coerce.number().int().positive(),
    doctorId: z.coerce.number().int().positive(),
    appointmentDate: dateString,
    startTime: timeString,
    endTime: timeString,
    reason: optionalText(255),
    notes: optionalText(5000),
  })
  .refine(...endAfterStart);

// Patient booking: the patient comes from the token, so patientId (or any other
// unknown key) is rejected; the time must be one of the 30-minute workday slots
export const patientBookingSchema = z
  .strictObject({
    doctorId: z.coerce.number().int().positive(),
    appointmentDate: dateString,
    startTime: timeString,
    endTime: timeString,
    reason: optionalText(255),
  })
  .refine((data) => isWorkdaySlot(data.startTime, data.endTime), {
    message: 'Choose one of the 30-minute slots between 09:00 and 17:00',
    path: ['startTime'],
  });

export const updateStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
});

// Query string for GET /appointments; repeated keys (arrays) fail as non-strings
export const listQuerySchema = z.object({
  doctorId: idString.optional(),
  patientId: idString.optional(),
  date: dateString.optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
});
