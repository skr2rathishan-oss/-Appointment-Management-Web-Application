import { appointmentService } from '../../services/appointmentService';
import { useAsync } from '../../hooks/useAsync';
import { useClinicTime } from '../../hooks/useClinicTime';
import { useAuth } from '../../context/AuthContext';
import StatusMessage from '../../components/StatusMessage';
import DoctorVisitList from '../../components/DoctorVisitList';
import Toast, { useToast } from '../../components/Toast';
import { greeting } from '../../utils/format';

export default function DoctorTodayPage() {
  const { user } = useAuth();
  const [toast, showToast] = useToast();
  // "Today" is the clinic's date; the server limits a doctor's list to their own appointments
  const { clock } = useClinicTime();
  const date = clock?.date;
  const today = useAsync(() => (date ? appointmentService.list({ date }) : null), [date]);
  const visits = today.data ?? [];
  const count = (status) => visits.filter((a) => a.status === status).length;

  return (
    <section>
      <div className="page-header">
        <h1>{greeting()}, Dr. {user.lastName}</h1>
        <p className="lede">Here is who you are seeing today.</p>
      </div>

      <div className="summary-row">
        <span><strong>{visits.length}</strong>visits today</span>
        <span><strong>{count('scheduled')}</strong>awaiting confirmation</span>
        <span><strong>{count('completed')}</strong>completed today</span>
      </div>

      <StatusMessage
        loading={today.loading || !date}
        error={today.error}
        empty={today.data?.length === 0}
        emptyText="No visits booked for today."
      />
      {visits.length > 0 && (
        <DoctorVisitList
          appointments={visits}
          onChanged={(message) => {
            showToast(message);
            today.reload();
          }}
        />
      )}
      <Toast message={toast} />
    </section>
  );
}
