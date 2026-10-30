import { z } from 'zod';
import { dateString, optionalText } from './common.js';

export const createPatientSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dateOfBirth: dateString,
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  email: z.string().trim().email().max(255).optional().nullable(),
  phone: z.string().trim().min(1).max(30),
  address: optionalText(255),
});
