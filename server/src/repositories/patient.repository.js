import { pool } from '../config/db.js';

const COLUMNS = `
  id, first_name AS firstName, last_name AS lastName, date_of_birth AS dateOfBirth,
  gender, email, phone, address, created_at AS createdAt`;

export async function findAll() {
  const [rows] = await pool.query(`SELECT ${COLUMNS} FROM patients ORDER BY last_name, first_name`);
  return rows;
}

export async function findById(id, db = pool) {
  const [rows] = await db.execute(`SELECT ${COLUMNS} FROM patients WHERE id = :id`, { id });
  return rows[0] ?? null;
}

// `db` may be a transaction connection; defaults to the pool
export async function create({ firstName, lastName, dateOfBirth, gender, email, phone, address }, db = pool) {
  const [result] = await db.execute(
    `INSERT INTO patients (first_name, last_name, date_of_birth, gender, email, phone, address)
     VALUES (:firstName, :lastName, :dateOfBirth, :gender, :email, :phone, :address)`,
    {
      firstName,
      lastName,
      dateOfBirth,
      gender: gender ?? null,
      email: email ?? null,
      phone,
      address: address ?? null,
    },
  );
  return findById(result.insertId, db);
}
