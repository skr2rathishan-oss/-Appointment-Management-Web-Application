import { pool } from '../config/db.js';

const COLUMNS = `
  id, first_name AS firstName, last_name AS lastName, specialization,
  email, phone, created_at AS createdAt`;

export async function findAll() {
  const [rows] = await pool.query(`SELECT ${COLUMNS} FROM doctors ORDER BY last_name, first_name`);
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM doctors WHERE id = :id`, { id });
  return rows[0] ?? null;
}

export async function create({ firstName, lastName, specialization, email, phone }) {
  const [result] = await pool.execute(
    `INSERT INTO doctors (first_name, last_name, specialization, email, phone)
     VALUES (:firstName, :lastName, :specialization, :email, :phone)`,
    { firstName, lastName, specialization, email, phone: phone ?? null },
  );
  return findById(result.insertId);
}
