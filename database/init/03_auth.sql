-- Login accounts. A user is linked to at most one patient or doctor record;
-- admins have neither.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('patient', 'doctor', 'admin') NOT NULL DEFAULT 'patient',
  patient_id      INT UNSIGNED NULL UNIQUE,
  doctor_id       INT UNSIGNED NULL UNIQUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_patient FOREIGN KEY (patient_id)
    REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_users_doctor FOREIGN KEY (doctor_id)
    REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Development-only accounts (bcryptjs hashes, cost 10). Change or remove before any
-- real deployment.
--   admin@clinic.local / Admin@12345  admin
--   patient@demo.local / Patient@123  patient, linked to Saman Silva (patient 1)
--   doctor@demo.local  / Doctor@123   doctor, linked to Dr. Anjali Perera (doctor 1)
INSERT INTO users (email, password_hash, role, patient_id, doctor_id) VALUES
  ('admin@clinic.local', '$2b$10$xegsjkiDPxa0OyA9PtXJa.m5WMB1y/oOqcXh2vsHS8TRiLWrJn8uO', 'admin',   NULL, NULL),
  ('patient@demo.local', '$2b$10$pDt9hy/Ea2V9/wBg8Y5M9eBAQMwdWRphvfKcsFc8xesXYzWRThyz6', 'patient', 1,    NULL),
  ('doctor@demo.local',  '$2b$10$EkH1mL/JBY35ztaWkt1g2OiGnXtnp2DlkaWGgPWH60jK2U.Pks6Ty', 'doctor',  NULL, 1);
