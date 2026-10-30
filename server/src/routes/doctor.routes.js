import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { createDoctorSchema } from '../validators/doctor.validator.js';

const router = Router();

// Browsing doctors and their free slots is public
router.get('/', doctorController.list);
router.get('/:id', doctorController.getById);
router.get('/:id/availability', doctorController.getAvailability);
router.post('/', authenticate, authorize('admin'), validate(createDoctorSchema), doctorController.create);

export default router;
