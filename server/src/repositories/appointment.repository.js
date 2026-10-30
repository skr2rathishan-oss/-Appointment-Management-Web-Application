import { pool } from '../config/db.js';

const SELECT = `
  SELECT a.id, a.patient_id AS patientId, a.doctor_id AS doctorId,
         a.appointment_date AS appointmentDate, a.start_time AS startTime,
         a.end_time AS endTime, a.status, a.reason, a.notes, a.created_at AS createdAt,
         CONCAT(p.first_name, ' ', p.last_name) AS patientName,
         CONCAT(d.first_name, ' ', d.last_name) AS doctorName,
         d.specialization AS doctorSpecialization
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
  JOIN doctors d ON d.id = a.doctor_id`;

// Statuses that no longer hold a time slot
export const INACTIVE_STATUSES = ['cancelled', 'no_show'];

export async function findAll({ doctorId, patientId, date, status } = {}) {
  const conditions = [];
  const params = {};
  if (doctorId) { conditions.push('a.doctor_id = :doctorId'); params.doctorId = doctorId; }
  if (patientId) { conditions.push('a.patient_id = :patientId'); params.patientId = patientId; }
  if (date) { conditions.push('a.appointment_date = :date'); params.date = date; }
  if (status) { conditions.push('a.status = :status'); params.status = status; }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `${SELECT} ${where} ORDER BY a.appointment_date, a.start_time`,
    params,
  );
  return rows;
}

export async function findById(id, db = pool) {
  const [rows] = await db.execute(`${SELECT} WHERE a.id = :id`, { id });
  return rows[0] ?? null;
}

// Start/end of the doctor's active appointments on one day (for the availability grid)
export async function findActiveByDoctorAndDate(doctorId, date) {
  const [rows] = await pool.execute(
    `SELECT start_time AS startTime, end_time AS endTime FROM appointments
     WHERE doctor_id = :doctorId
       AND appointment_date = :date
       AND status NOT IN ('cancelled', 'no_show')
     ORDER BY start_time`,
    { doctorId, date },
  );
  return rows;
}

// Locks the doctor's row until the transaction ends, so concurrent bookings for the
// same doctor run their overlap check one at a time. Returns false if the doctor is missing.
export async function lockDoctor(doctorId, db) {
  const [rows] = await db.execute('SELECT id FROM doctors WHERE id = :doctorId FOR UPDATE', { doctorId });
  return rows.length > 0;
}

// Active appointments for the doctor whose time range overlaps [startTime, endTime)
export async function findOverlapping({ doctorId, appointmentDate, startTime, endTime, excludeId = 0 }, db = pool) {
  const [rows] = await db.execute(
    `SELECT id FROM appointments
     WHERE doctor_id = :doctorId
       AND appointment_date = :appointmentDate
       AND status NOT IN ('cancelled', 'no_show')
       AND start_time < :endTime AND end_time > :startTime
       AND id <> :excludeId`,
    { doctorId, appointmentDate, startTime, endTime, excludeId },
  );
  return rows;
}

export async function create({ patientId, doctorId, appointmentDate, startTime, endTime, reason, notes }, db = pool) {
  const [result] = await db.execute(
    `INSERT INTO appointments (patient_id, doctor_id, appointment_date, start_time, end_time, reason, notes)
     VALUES (:patientId, :doctorId, :appointmentDate, :startTime, :endTime, :reason, :notes)`,
    { patientId, doctorId, appointmentDate, startTime, endTime, reason: reason ?? null, notes: notes ?? null },
  );
  return findById(result.insertId, db);
}

export async function updateStatus(id, status, db = pool) {
  await db.execute('UPDATE appointments SET status = :status WHERE id = :id', { id, status });
  return findById(id, db);
}

export async function remove(id) {
  const [result] = await pool.execute('DELETE FROM appointments WHERE id = :id', { id });
  return result.affectedRows > 0;
}
