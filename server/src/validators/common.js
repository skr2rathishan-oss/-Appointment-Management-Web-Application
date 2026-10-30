import { z } from 'zod';

// True only for real calendar dates (rejects e.g. 2026-02-30)
const isCalendarDate = (value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format')
  .refine(isCalendarDate, 'Invalid date');

// Accepts HH:MM or HH:MM:SS and normalises to HH:MM:SS
export const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Expected time in HH:MM format')
  .transform((t) => (t.length === 5 ? `${t}:00` : t));

export const optionalText = (max) => z.string().trim().max(max).optional().nullable();

export const email = z.string().trim().toLowerCase().email().max(255);

// An id sent as a query-string value, e.g. ?doctorId=3
export const idString = z
  .string()
  .regex(/^\d+$/, 'Expected a positive integer id')
  .transform(Number)
  .refine((id) => id > 0 && Number.isSafeInteger(id), 'Expected a positive integer id');
