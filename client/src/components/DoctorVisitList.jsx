import { useState } from 'react';
import { appointmentService } from '../services/appointmentService';
import AppointmentSlip from './AppointmentSlip';

// What a doctor can do next with a visit in each status; the toast reuses the verb
export const DOCTOR_ACTIONS = {
  scheduled: [
    { label: 'Confirm visit', status: 'confirmed', toast: 'Visit confirmed' },
    { label: 'Cancel visit', status: 'cancelled', toast: 'Visit cancelled', danger: true },
  ],
  confirmed: [
    { label: 'Mark completed', status: 'completed', toast: 'Visit marked completed' },
    { label: 'Mark no-show', status: 'no_show', toast: 'Visit marked no-show', danger: true },
    { label: 'Cancel visit', status: 'cancelled', toast: 'Visit cancelled', danger: true },
  ],
};

// A doctor's visits as slips with status actions. Calls onChanged(toastText) after an update.
export default function DoctorVisitList({ appointments, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  async function act(appointment, action) {
    setBusyId(appointment.id);
    setError(null);
    try {
      await appointmentService.updateStatus(appointment.id, action.status);
      onChanged(action.toast);
    } catch (err) {
      setError(err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {error && <p className="alert alert-error">{error.message}</p>}
      <ul className="slip-list">
        {appointments.map((a) => (
          <AppointmentSlip key={a.id} appointment={a} title={a.patientName}>
            {(DOCTOR_ACTIONS[a.status] ?? []).map((action) => (
              <button
                key={action.status}
                type="button"
                className={action.danger ? 'btn btn-danger' : 'btn btn-secondary'}
                disabled={busyId === a.id}
                onClick={() => act(a, action)}
              >
                {action.label}
              </button>
            ))}
          </AppointmentSlip>
        ))}
      </ul>
    </>
  );
}
