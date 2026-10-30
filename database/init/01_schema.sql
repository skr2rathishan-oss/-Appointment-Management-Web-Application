-- Appointment Management System schema
-- Runs against the database named by MYSQL_DATABASE (see docker-compose.yml).
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS doctors (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  specialization  VARCHAR(150) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  phone           VARCHAR(30)  NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS patients (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  date_of_birth   DATE NOT NULL,
  gender          ENUM('male', 'female', 'other') NULL,
  email           VARCHAR(255) NULL UNIQUE,
  phone           VARCHAR(30)  NOT NULL,
  address         VARCHAR(255) NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS appointments (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id        INT UNSIGNED NOT NULL,
  doctor_id         INT UNSIGNED NOT NULL,
  appointment_date  DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  status            ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')
                    NOT NULL DEFAULT 'scheduled',
  reason            VARCHAR(255) NULL,
  notes             TEXT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id)
    REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id)
    REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT chk_appointment_time CHECK (end_time > start_time),
  INDEX idx_appointments_doctor_date (doctor_id, appointment_date),
  INDEX idx_appointments_patient (patient_id)
) ENGINE=InnoDB;
