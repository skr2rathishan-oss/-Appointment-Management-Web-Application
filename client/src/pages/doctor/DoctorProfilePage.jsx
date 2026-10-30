import { doctorService } from '../../services/doctorService';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import StatusMessage from '../../components/StatusMessage';
import ProfileBand from '../../components/ProfileBand';

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const doctor = useAsync(() => doctorService.getById(user.doctorId), [user.doctorId]);

  if (!doctor.data) return <StatusMessage loading={doctor.loading} error={doctor.error} />;
  const d = doctor.data;

  return (
    <section>
      <ProfileBand doctor={d} />
      <div className="panel">
        <div className="panel-header">
          <h2>Your details</h2>
          <span className="muted">Ask the clinic admin to change these.</span>
        </div>
        <dl className="details-list">
          <dt>Name</dt><dd>Dr. {d.firstName} {d.lastName}</dd>
          <dt>Specialization</dt><dd>{d.specialization}</dd>
          <dt>Email</dt><dd>{d.email}</dd>
          <dt>Phone</dt><dd>{d.phone || 'Not listed'}</dd>
          <dt>Sign-in email</dt><dd>{user.email}</dd>
        </dl>
      </div>
    </section>
  );
}
