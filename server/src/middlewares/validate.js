import { ApiError } from '../utils/ApiError.js';

// Parses input with a zod schema, throwing a 400 ApiError listing each invalid field.
export function parseOrThrow(schema, input) {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw ApiError.badRequest('Validation failed', details);
  }
  return result.data;
}

// Validates req.body against a zod schema and replaces it with the parsed result.
export const validate = (schema) => (req, res, next) => {
  try {
    req.body = parseOrThrow(schema, req.body);
    next();
  } catch (err) {
    next(err);
  }
};

// Like validate, but picks the schema by req.user.role (use after authenticate/authorize)
export const validateByRole = (schemasByRole) => (req, res, next) => validate(schemasByRole[req.user.role])(req, res, next);
