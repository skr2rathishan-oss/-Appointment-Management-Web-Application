import { STATUS_LABELS, dayOfMonth, hhmm, monthShort, weekday } from '../utils/format';

// One appointment as a reservation slip. `title` is who the visit is with (the doctor for
// patients, the patient for doctors); `detail` is extra meta such as the specialty.
// Action buttons are passed as children and shown under the status pill.
export default function AppointmentSlip({ appointment: a, title, detail, past = false, children }) {
  return (
    <li className={past ? 'slip is-past' : 'slip'}>
      <div className="slip-date">
        <div className="slip-month">{monthShort(a.appointmentDate)}</div>
        <div className="slip-day">{dayOfMonth(a.appointmentDate)}</div>
      </div>
      <div>
        <div className="slip-title">{title}</div>
        <div className="slip-meta">
          {weekday(a.appointmentDate)}, {hhmm(a.startTime)}–{hhmm(a.endTime)}
          {detail && ` · ${detail}`}
        </div>
        {a.reason && <div className="slip-meta">{a.reason}</div>}
      </div>
      <div className="slip-actions">
        <span className={`pill status-${a.status}`}>{STATUS_LABELS[a.status] ?? a.status}</span>
        {children}
      </div>
    </li>
  );
}
