import { Link, Navigate } from 'react-router-dom';
import httpClient from '../api/httpClient';
import { appointmentService } from '../services/appointmentService';
import { useAsync } from '../hooks/useAsync';
import { useClinicTime } from '../hooks/useClinicTime';
import { homeFor, useAuth } from '../context/AuthContext';
import StatusMessage from '../components/StatusMessage';
import AppointmentSlip from '../components/AppointmentSlip';
import { dayOfMonth, formatDay, greeting, hhmm, isUpcoming, monthShort } from '../utils/format';

function GuestHome() {
  return (
    <section>
      <div className="page-header">
        <h1>Book a visit with our doctors</h1>
        <p className="lede">See every doctor&apos;s open times and reserve a 30-minute visit in under a minute.</p>
      </div>
      <div className="button-row">
        <Link className="btn" to="/doctors">Find a doctor</Link>
        <Link className="btn btn-secondary" to="/register">Create account</Link>
      </div>
    </section>
  );
}

function PatientHome({ user }) {
  const appointments = useAsync(() => appointmentService.list());
  const { clock } = useClinicTime();
  const next = clock && appointments.data?.find((a) => ['scheduled', 'confirmed'].includes(a.status) && isUpcoming(a, clock));

  return (
    <section>
      <div className="page-header">
        <h1>{greeting()}, {user.firstName}</h1>
        <p className="lede">Book a new visit or check the ones you have coming up.</p>
      </div>
      <StatusMessage loading={appointments.loading || !clock} error={appointments.error} />
      {appointments.data && clock && (next ? (
        <section className="next-visit">
          <div className="slip-date">
            <div className="slip-month">{monthShort(next.appointmentDate)}</div>
            <div className="slip-day">{dayOfMonth(next.appointmentDate)}</div>
          </div>
          <div>
            <p className="muted">Your next visit</p>
            <h2>Dr. {next.doctorName}</h2>
            <p className="muted">{formatDay(next.appointmentDate)}, {hhmm(next.startTime)}</p>
          </div>
          <Link className="btn btn-on-dark" to="/appointments">View visits</Link>
        </section>
      ) : (
        <div className="empty-state section-gap">
          <p>You have no upcoming visits.</p>
          <Link className="btn" to="/doctors">Find a doctor</Link>
        </div>
      ))}
      {next && <Link className="btn btn-secondary" to="/doctors">Find a doctor</Link>}
    </section>
  );
}

function AdminHome() {
  const health = useAsync(() => httpClient.get('/health').then((res) => res.data));
  const { clock } = useClinicTime();
  const today = clock?.date;
  const todays = useAsync(() => (today ? appointmentService.list({ date: today }) : null), [today]);
  const list = todays.data ?? [];
  const apiUp = health.data?.database === 'up';

  return (
    <section>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="lede">
          {health.loading ? 'Checking system status…' : apiUp ? 'API and database are online.' : 'The database is unavailable.'}
        </p>
      </div>
      <div className="summary-row">
        <span><strong>{list.length}</strong>visits today</span>
        <span><strong>{list.filter((a) => a.status === 'scheduled').length}</strong>awaiting confirmation</span>
      </div>
      <div className="panel-header">
        <h2>Today&apos;s schedule</h2>
        <Link to="/appointments">Manage appointments</Link>
      </div>
      <StatusMessage loading={todays.loading || !today} error={todays.error} empty={todays.data?.length === 0} emptyText="No visits booked for today." />
      {list.length > 0 && (
        <ul className="slip-list">
          {list.map((a) => (
            <AppointmentSlip key={a.id} appointment={a} title={a.patientName} detail={`Dr. ${a.doctorName}`} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <GuestHome />;
  if (user.role === 'doctor') return <Navigate to={homeFor('doctor')} replace />;
  if (user.role === 'admin') return <AdminHome />;
  return <PatientHome user={user} />;
}
