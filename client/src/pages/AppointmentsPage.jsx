import { useState } from 'react';
import { Link } from 'react-router-dom';
import { APPOINTMENT_STATUSES, appointmentService } from '../services/appointmentService';
import { doctorService } from '../services/doctorService';
import { patientService } from '../services/patientService';
import { useAsync } from '../hooks/useAsync';
import { useClinicTime } from '../hooks/useClinicTime';
import { useAuth } from '../context/AuthContext';
import StatusMessage from '../components/StatusMessage';
import AppointmentSlip from '../components/AppointmentSlip';
import FieldError from '../components/FieldError';
import Toast, { useToast } from '../components/Toast';
import { STATUS_LABELS, fieldErrors, formatDay, hhmm, isUpcoming } from '../utils/format';

const ACTIVE = ['scheduled', 'confirmed'];

// ---------- Patient: "My visits" ----------

function PatientVisits() {
  const [toast, showToast] = useToast();
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const appointments = useAsync(() => appointmentService.list());
  const { clock } = useClinicTime();

  // Split by time only: a cancelled future visit stays under Upcoming with its pill
  const all = clock ? appointments.data ?? [] : [];
  const upcoming = all.filter((a) => isUpcoming(a, clock));
  const past = all.filter((a) => !isUpcoming(a, clock)).reverse(); // most recent first

  async function cancel(a) {
    setBusyId(a.id);
    setError(null);
    try {
      await appointmentService.updateStatus(a.id, 'cancelled');
      showToast('Visit cancelled');
      appointments.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>My visits</h1>
        <p className="lede">Your booked visits, and the ones you have already had.</p>
      </div>
      {error && <p className="alert alert-error">{error.message}</p>}
      <StatusMessage loading={appointments.loading || !clock} error={appointments.error} />

      {appointments.data && clock && (
        <>
          <h2>Upcoming</h2>
          {upcoming.length === 0 ? (
            <div className="empty-state section-gap">
              <p>You have no upcoming visits.</p>
              <Link className="btn" to="/doctors">Find a doctor</Link>
            </div>
          ) : (
            <ul className="slip-list section-gap">
              {upcoming.map((a) => (
                <AppointmentSlip key={a.id} appointment={a} title={`Dr. ${a.doctorName}`} detail={a.doctorSpecialization}>
                  {ACTIVE.includes(a.status) && (
                    <button type="button" className="btn btn-danger" disabled={busyId === a.id} onClick={() => cancel(a)}>
                      Cancel visit
                    </button>
                  )}
                </AppointmentSlip>
              ))}
            </ul>
          )}

          {past.length > 0 && (
            <>
              <h2>Past</h2>
              <ul className="slip-list section-gap">
                {past.map((a) => (
                  <AppointmentSlip key={a.id} appointment={a} title={`Dr. ${a.doctorName}`} detail={a.doctorSpecialization} past />
                ))}
              </ul>
            </>
          )}
        </>
      )}
      <Toast message={toast} />
    </section>
  );
}

// ---------- Admin: booking form + full schedule ----------

const EMPTY_FORM = {
  patientId: '',
  doctorId: '',
  appointmentDate: '',
  startTime: '',
  endTime: '',
  reason: '',
};

function AdminAppointments() {
  const [dateFilter, setDateFilter] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [tableError, setTableError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, showToast] = useToast();

  const appointments = useAsync(
    () => appointmentService.list(dateFilter ? { date: dateFilter } : {}),
    [dateFilter],
  );
  const doctors = useAsync(() => doctorService.list());
  const patients = useAsync(() => patientService.list());
  const errors = fieldErrors(formError);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const created = await appointmentService.create({ ...form, reason: form.reason || null });
      setForm(EMPTY_FORM);
      showToast(`Booked: ${formatDay(created.appointmentDate)}, ${hhmm(created.startTime)} with Dr. ${created.doctorName}`);
      appointments.reload();
    } catch (err) {
      setFormError(err.status === 409 ? new Error('That time overlaps another visit for this doctor. Pick another time.') : err);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id, status) {
    setTableError(null);
    try {
      await appointmentService.updateStatus(id, status);
      showToast(`Status changed to ${STATUS_LABELS[status].toLowerCase()}`);
      appointments.reload();
    } catch (err) {
      setTableError(err);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this appointment permanently?')) return;
    setTableError(null);
    try {
      await appointmentService.remove(id);
      showToast('Appointment deleted');
      appointments.reload();
    } catch (err) {
      setTableError(err);
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>Appointments</h1>
        <p className="lede">Book on behalf of a patient and manage every doctor&apos;s schedule.</p>
      </div>

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <h2>Book appointment</h2>
        <label>
          Patient
          <select name="patientId" value={form.patientId} onChange={handleChange} aria-invalid={Boolean(errors.patientId)} required>
            <option value="">Select patient</option>
            {patients.data?.map((p) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
            ))}
          </select>
          <FieldError message={errors.patientId} />
        </label>
        <label>
          Doctor
          <select name="doctorId" value={form.doctorId} onChange={handleChange} aria-invalid={Boolean(errors.doctorId)} required>
            <option value="">Select doctor</option>
            {doctors.data?.map((d) => (
              <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName} ({d.specialization})</option>
            ))}
          </select>
          <FieldError message={errors.doctorId} />
        </label>
        <label>
          Date
          <input type="date" name="appointmentDate" value={form.appointmentDate} onChange={handleChange} required />
          <FieldError message={errors.appointmentDate} />
        </label>
        <label>
          Start
          <input type="time" name="startTime" value={form.startTime} onChange={handleChange} required />
          <FieldError message={errors.startTime} />
        </label>
        <label>
          End
          <input type="time" name="endTime" value={form.endTime} onChange={handleChange} required />
          <FieldError message={errors.endTime} />
        </label>
        <label className="span-all">
          Reason
          <input name="reason" value={form.reason} onChange={handleChange} maxLength={255} />
        </label>
        {formError && !formError.details && <p className="alert alert-error span-all">{formError.message}</p>}
        <div className="form-actions">
          <button type="submit" disabled={saving}>{saving ? 'Booking…' : 'Book appointment'}</button>
        </div>
      </form>

      <div className="panel">
        <div className="panel-header">
          <h2>Schedule</h2>
          <label className="inline">
            Date
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </label>
        </div>
        {tableError && <p className="alert alert-error">{tableError.message}</p>}
        <StatusMessage
          loading={appointments.loading}
          error={appointments.error}
          empty={appointments.data?.length === 0}
          emptyText="No appointments found for this date."
        />
        {appointments.data?.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Reason</th><th>Status</th><th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {appointments.data.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDay(a.appointmentDate)}</td>
                    <td>{hhmm(a.startTime)}–{hhmm(a.endTime)}</td>
                    <td>{a.patientName}</td>
                    <td>Dr. {a.doctorName}</td>
                    <td>{a.reason || '–'}</td>
                    <td>
                      <select
                        value={a.status}
                        aria-label={`Status for ${a.patientName}`}
                        onChange={(e) => handleStatusChange(a.id, e.target.value)}
                      >
                        {APPOINTMENT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td>
                      <button type="button" className="btn btn-danger" onClick={() => handleDelete(a.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Toast message={toast} />
    </section>
  );
}

// Route is limited to patients and admins (doctors use /doctor/schedule)
export default function AppointmentsPage() {
  const { user } = useAuth();
  return user.role === 'admin' ? <AdminAppointments /> : <PatientVisits />;
}
