import { pool } from '../config/db.js';

// Names come from the linked patient or doctor record (admins have none)
const COLUMNS = `
  u.id, u.email, u.role, u.patient_id AS patientId, u.doctor_id AS doctorId,
  COALESCE(p.first_name, d.first_name) AS firstName,
  COALESCE(p.last_name, d.last_name) AS lastName`;

const FROM = `
  FROM users u
  LEFT JOIN patients p ON p.id = u.patient_id
  LEFT JOIN doctors d ON d.id = u.doctor_id`;

export async function findById(id) {
  const [rows] = await pool.execute(`SELECT ${COLUMNS} ${FROM} WHERE u.id = :id`, { id });
  return rows[0] ?? null;
}

// Only used for login: the one query that returns the password hash
export async function findByEmailWithPassword(email) {
  const [rows] = await pool.execute(
    `SELECT ${COLUMNS}, u.password_hash AS passwordHash ${FROM} WHERE u.email = :email`,
    { email },
  );
  return rows[0] ?? null;
}

export async function existsByEmail(email) {
  const [rows] = await pool.execute('SELECT 1 FROM users WHERE email = :email', { email });
  return rows.length > 0;
}

// `db` may be a transaction connection; defaults to the pool
export async function create({ email, passwordHash, role = 'patient', patientId = null, doctorId = null }, db = pool) {
  const [result] = await db.execute(
    `INSERT INTO users (email, password_hash, role, patient_id, doctor_id)
     VALUES (:email, :passwordHash, :role, :patientId, :doctorId)`,
    { email, passwordHash, role, patientId, doctorId },
  );
  return result.insertId;
}
