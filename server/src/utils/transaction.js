import { pool } from '../config/db.js';

// Runs fn(connection) inside a transaction: commits on success, rolls back on any error.
export async function withTransaction(fn) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (err) {
    // A failed rollback (e.g. lost connection) must not hide the error that caused it
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error('Transaction rollback failed', rollbackErr);
    }
    throw err;
  } finally {
    connection.release();
  }
}
