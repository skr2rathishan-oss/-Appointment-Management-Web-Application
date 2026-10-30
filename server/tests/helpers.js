import { vi } from 'vitest';
import { signToken } from '../src/utils/token.js';

export const ADMIN = { id: 1, role: 'admin', patientId: null, doctorId: null };
export const PATIENT = { id: 2, role: 'patient', patientId: 10, doctorId: null };
export const OTHER_PATIENT = { id: 3, role: 'patient', patientId: 11, doctorId: null };
export const DOCTOR = { id: 4, role: 'doctor', patientId: null, doctorId: 20 };

export const bearer = (user) => `Bearer ${signToken(user)}`;

// Stand-in for a mysql2 pool connection, with spies for the transaction calls
export function fakeConnection() {
  return {
    execute: vi.fn(),
    beginTransaction: vi.fn().mockResolvedValue(),
    commit: vi.fn().mockResolvedValue(),
    rollback: vi.fn().mockResolvedValue(),
    release: vi.fn(),
  };
}
