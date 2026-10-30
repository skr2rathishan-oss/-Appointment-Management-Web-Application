import { z } from 'zod';
import { dateString, email } from './common.js';

// bcrypt only uses the first 72 bytes, so cap the length there
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a digit');

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email,
  password,
  phone: z.string().trim().min(1).max(30),
  dateOfBirth: dateString,
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});
