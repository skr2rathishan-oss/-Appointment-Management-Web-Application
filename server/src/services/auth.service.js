import * as userRepository from '../repositories/user.repository.js';
import * as patientRepository from '../repositories/patient.repository.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/token.js';
import { withTransaction } from '../utils/transaction.js';
import { ApiError } from '../utils/ApiError.js';

const INVALID_CREDENTIALS = 'Invalid email or password';
const EMAIL_TAKEN = 'An account with this email already exists';
// Compared against when the email is unknown, so both failure paths take similar time
const DUMMY_HASH = '$2b$10$jAr2DZDM5iCKl0dClSEvLuxR5Ku6n.L4T0yQryj.38r.fZaX8PPj2';

// The shape returned to clients: never includes the password hash
export const toPublicUser = ({ id, email, role, patientId, doctorId, firstName, lastName }) => ({
  id,
  email,
  role,
  patientId: patientId ?? null,
  doctorId: doctorId ?? null,
  firstName: firstName ?? null,
  lastName: lastName ?? null,
});

const session = (user) => ({ token: signToken(user), user: toPublicUser(user) });

// Creates the patient record and its login in one transaction
export async function register({ password, ...profile }) {
  if (await userRepository.existsByEmail(profile.email)) {
    throw ApiError.conflict(EMAIL_TAKEN);
  }
  const passwordHash = await hashPassword(password);

  let userId;
  try {
    userId = await withTransaction(async (connection) => {
      const patient = await patientRepository.create(profile, connection);
      return userRepository.create(
        { email: profile.email, passwordHash, role: 'patient', patientId: patient.id },
        connection,
      );
    });
  } catch (err) {
    // Lost a race with another sign-up, or an existing patient record already uses this email
    if (err.code === 'ER_DUP_ENTRY') throw ApiError.conflict(EMAIL_TAKEN);
    throw err;
  }

  return session(await userRepository.findById(userId));
}

export async function login({ email, password }) {
  const user = await userRepository.findByEmailWithPassword(email);
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw ApiError.unauthorized(INVALID_CREDENTIALS);
  return session(user);
}

export async function getCurrentUser(id) {
  const user = await userRepository.findById(id);
  // The token is valid but the account was deleted since it was issued
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  return toPublicUser(user);
}
