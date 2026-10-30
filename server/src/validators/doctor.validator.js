import { z } from 'zod';
import { dateString, optionalText } from './common.js';

export const createDoctorSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  specialization: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(255),
  phone: optionalText(30),
});

export const availabilityQuerySchema = z.object({
  date: dateString,
});
