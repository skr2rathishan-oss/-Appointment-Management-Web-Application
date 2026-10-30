import { Router } from 'express';
import * as appointmentController from '../controllers/appointment.controller.js';
import { validate, validateByRole } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  createAppointmentSchema,
  patientBookingSchema,
  updateStatusSchema,
} from '../validators/appointment.validator.js';

const router = Router();

// Every appointment route needs a login; per-role rules live in the service
router.use(authenticate);

router.get('/', appointmentController.list);
router.get('/:id', appointmentController.getById);
router.post(
  '/',
  authorize('patient', 'admin'),
  validateByRole({ patient: patientBookingSchema, admin: createAppointmentSchema }),
  appointmentController.create,
);
router.patch('/:id/status', validate(updateStatusSchema), appointmentController.updateStatus);
router.delete('/:id', authorize('admin'), appointmentController.remove);

export default router;
