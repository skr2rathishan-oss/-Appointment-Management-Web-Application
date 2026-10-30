-- Sample data for local development only
SET NAMES utf8mb4;

INSERT INTO doctors (first_name, last_name, specialization, email, phone) VALUES
  ('Anjali', 'Perera',    'General Practice', 'anjali.perera@clinic.local', '+94 77 100 0001'),
  ('Kavin',  'Fernando',  'Cardiology',       'kavin.fernando@clinic.local', '+94 77 100 0002'),
  ('Nisha',  'Rajapakse', 'Pediatrics',       'nisha.rajapakse@clinic.local', '+94 77 100 0003');

INSERT INTO patients (first_name, last_name, date_of_birth, gender, email, phone, address) VALUES
  ('Saman', 'Silva',  '1985-04-12', 'male',   'saman.silva@example.com', '+94 71 200 0001', 'Colombo'),
  ('Dilini', 'Jayasuriya', '1992-09-30', 'female', 'dilini.j@example.com', '+94 71 200 0002', 'Kandy');

INSERT INTO appointments (patient_id, doctor_id, appointment_date, start_time, end_time, status, reason) VALUES
  (1, 1, CURDATE(), '09:00:00', '09:30:00', 'scheduled', 'Annual check-up'),
  (2, 2, CURDATE(), '10:00:00', '10:30:00', 'confirmed', 'Chest pain follow-up');

-- More history and upcoming visits for Dr. Anjali Perera (doctor 1) and Saman Silva
-- (patient 1), who back the demo logins in 03_auth.sql. Dates are relative to the day
-- the database is created, so both portals have past and upcoming data on first login.
INSERT INTO appointments (patient_id, doctor_id, appointment_date, start_time, end_time, status, reason) VALUES
  (1, 1, CURDATE() - INTERVAL 21 DAY, '10:00:00', '10:30:00', 'completed', 'Blood pressure review'),
  (1, 1, CURDATE() - INTERVAL 7 DAY,  '14:00:00', '14:30:00', 'completed', 'Fever and sore throat'),
  (2, 1, CURDATE() - INTERVAL 2 DAY,  '11:30:00', '12:00:00', 'no_show',   'Routine check-up'),
  (2, 1, CURDATE(),                   '11:00:00', '11:30:00', 'confirmed', 'Persistent cough'),
  (1, 1, CURDATE(),                   '15:30:00', '16:00:00', 'scheduled', 'Medication review'),
  (1, 1, CURDATE() + INTERVAL 2 DAY,  '10:30:00', '11:00:00', 'scheduled', 'Vaccination'),
  (2, 1, CURDATE() + INTERVAL 5 DAY,  '09:30:00', '10:00:00', 'confirmed', 'Skin rash'),
  (1, 1, CURDATE() + INTERVAL 9 DAY,  '15:00:00', '15:30:00', 'scheduled', 'Lab results');
