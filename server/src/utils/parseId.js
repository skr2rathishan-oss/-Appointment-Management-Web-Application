import { ApiError } from './ApiError.js';

// Only plain positive integers ("12"); rejects "1e3", " 7", "0x1", "-1"
export function parseId(value) {
  const id = /^\d+$/.test(String(value)) ? Number(value) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw ApiError.badRequest(`Invalid id: ${value}`);
  }
  return id;
}
