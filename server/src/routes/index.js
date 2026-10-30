import { Router } from 'express';
import { pingDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { clinicNow } from '../utils/clinicTime.js';
import authRoutes from './auth.routes.js';
import doctorRoutes from './doctor.routes.js';
import patientRoutes from './patient.routes.js';
import appointmentRoutes from './appointment.routes.js';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    await pingDatabase();
    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});

// The clinic's current date and time; clients use it for "today" instead of their own clock
router.get('/clinic/time', (req, res) => {
  res.json({ data: { ...clinicNow(), timeZone: env.clinicTimeZone } });
});

router.use('/auth', authRoutes);
router.use('/doctors', doctorRoutes);
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);

export default router;
