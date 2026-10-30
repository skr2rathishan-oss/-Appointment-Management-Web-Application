import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { doctorService } from '../services/doctorService';
import { appointmentService } from '../services/appointmentService';
import { useAsync } from '../hooks/useAsync';
import { useClinicTime } from '../hooks/useClinicTime';
import { useAuth } from '../context/AuthContext';
import ProfileBand from '../components/ProfileBand';
import DayStrip from '../components/DayStrip';
import StatusMessage from '../components/StatusMessage';
import Toast, { useToast } from '../components/Toast';
import { formatDay, hhmm, nextDays } from '../utils/format';

const DAYS_SHOWN = 14;

function ConfirmPanel({ doctor, date, slot, onCancel, onBooked }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await appointmentService.create({
        doctorId: doctor.id,
        appointmentDate: date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        reason: reason.trim() || null,
      });
      onBooked(slot);
    } catch (err) {
      setError(err.status === 409 ? new Error('That time was just taken. Pick another slot.') : err);
      setSaving(false);
    }
  }

  return (
    <form className="confirm-panel" onSubmit={handleSubmit}>
      <p>
        {formatDay(date)}, {hhmm(slot.startTime)}–{hhmm(slot.endTime)} with Dr. {doctor.lastName}
      </p>
      <label>
        Reason for visit (optional)
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} autoFocus />
      </label>
      <div className="confirm-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Back</button>
        <button type="submit" disabled={saving}>{saving ? 'Booking…' : 'Confirm booking'}</button>
      </div>
      {error && <p className="alert alert-error" role="alert">{error.message}</p>}
    </form>
  );
}

export default function DoctorDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [toast, showToast] = useToast();
  const [selected, setSelected] = useState(null); // startTime of the slot being confirmed

  // Days start at the clinic's today, not the browser's
  const { clock } = useClinicTime();
  const days = clock ? nextDays(DAYS_SHOWN, clock.date) : [];
  const date = days.includes(searchParams.get('date')) ? searchParams.get('date') : days[0];

  const doctor = useAsync(() => doctorService.getById(id), [id]);
  const availability = useAsync(() => (date ? doctorService.getAvailability(id, date) : null), [id, date]);

  // Signed-out visitors may reserve (they sign in first); staff accounts can only look
  const canBook = !user || user.role === 'patient';

  function selectDay(day) {
    setSelected(null);
    setSearchParams({ date: day }, { replace: true });
  }

  function reserve(slot) {
    if (!user) {
      navigate('/login', {
        state: { from: { pathname: location.pathname, search: `?date=${date}` }, booking: true },
      });
      return;
    }
    setSelected(selected === slot.startTime ? null : slot.startTime);
  }

  function handleBooked(slot) {
    setSelected(null);
    showToast(`Booked: ${formatDay(date)}, ${hhmm(slot.startTime)} with Dr. ${doctor.data.lastName}`);
    availability.reload();
  }

  if (doctor.loading || doctor.error || !clock) {
    return (
      <section>
        <Link className="back-link" to="/doctors">All doctors</Link>
        <StatusMessage
          loading={doctor.loading || !clock}
          error={doctor.error?.status === 404 ? new Error('We couldn’t find that doctor. Choose one from the list.') : doctor.error}
        />
      </section>
    );
  }

  const slots = availability.data?.date === date ? availability.data.slots : [];
  const anyFree = slots.some((s) => s.available);
  // The server says what "now" is at the clinic; earlier slots today read "Passed"
  const isPassed = (slot) =>
    availability.data && date === availability.data.today && slot.startTime <= availability.data.now;

  return (
    <section>
      <Link className="back-link" to="/doctors">All doctors</Link>
      <ProfileBand doctor={doctor.data} />

      <div className="panel">
        <div className="panel-header">
          <h2>Choose a time</h2>
          <span className="muted">30-minute visits</span>
        </div>
        <DayStrip days={days} selected={date} onSelect={selectDay} />

        {user && !canBook && (
          <p className="muted ledger-note">
            {user.role === 'admin'
              ? 'Book on behalf of a patient from the Appointments page.'
              : 'Patients book these times from their own account.'}
          </p>
        )}

        <StatusMessage loading={availability.loading || !availability.data} error={availability.error} />
        {availability.data && !availability.loading && !availability.error && (
          anyFree ? (
            <ul className="ledger">
              {slots.map((slot) => {
                const time = hhmm(slot.startTime);
                if (!slot.available) {
                  return (
                    <li key={slot.startTime} className="ledger-row is-taken">
                      <span className="ledger-time">{time}</span>
                      <span className="ledger-line" />
                      <span className="ledger-state">{isPassed(slot) ? 'Passed' : 'Taken'}</span>
                    </li>
                  );
                }
                const isSelected = selected === slot.startTime;
                return (
                  <li key={slot.startTime} className={isSelected ? 'ledger-row is-selected' : 'ledger-row'}>
                    <span className="ledger-time">{time}</span>
                    <span className="ledger-line" />
                    {canBook ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        aria-expanded={isSelected}
                        onClick={() => reserve(slot)}
                      >
                        Reserve {time}
                      </button>
                    ) : (
                      <span className="ledger-state">Free</span>
                    )}
                    {isSelected && (
                      <ConfirmPanel
                        doctor={doctor.data}
                        date={date}
                        slot={slot}
                        onCancel={() => setSelected(null)}
                        onBooked={handleBooked}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="empty-state">
              <p>No free times on {formatDay(date)}.</p>
              <p>Try another day above.</p>
            </div>
          )
        )}
      </div>
      <Toast message={toast} />
    </section>
  );
}
