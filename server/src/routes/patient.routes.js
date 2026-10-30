import { Router } from 'express';
import * as patientController from '../controllers/patient.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { createPatientSchema } from '../validators/patient.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin'), patientController.list);
// Admin, or the patient themselves (checked in the service)
router.get('/:id', patientController.getById);
router.post('/', authorize('admin'), validate(createPatientSchema), patientController.create);

export default router;
