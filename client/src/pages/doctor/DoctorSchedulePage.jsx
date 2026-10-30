import { useState } from 'react';
import { appointmentService } from '../../services/appointmentService';
import { useAsync } from '../../hooks/useAsync';
import { useClinicTime } from '../../hooks/useClinicTime';
import StatusMessage from '../../components/StatusMessage';
import DayStrip from '../../components/DayStrip';
import DoctorVisitList from '../../components/DoctorVisitList';
import Toast, { useToast } from '../../components/Toast';
import { formatDay, nextDays } from '../../utils/format';

// Today plus the next 14 days
const DAYS_SHOWN = 15;

export default function DoctorSchedulePage() {
  const { clock } = useClinicTime();
  const days = clock ? nextDays(DAYS_SHOWN, clock.date) : [];
  const [picked, setPicked] = useState(null);
  const date = picked ?? days[0]; // the clinic's today until a day is picked
  const [toast, showToast] = useToast();
  const schedule = useAsync(() => (date ? appointmentService.list({ date }) : null), [date]);

  return (
    <section>
      <div className="page-header">
        <h1>Schedule</h1>
        <p className="lede">Pick a day to see and update its visits.</p>
      </div>

      <DayStrip days={days} selected={date} onSelect={setPicked} />

      <StatusMessage
        loading={schedule.loading || !date}
        error={schedule.error}
        empty={schedule.data?.length === 0}
        emptyText={date ? `No visits booked for ${formatDay(date)}.` : ''}
      />
      {schedule.data?.length > 0 && (
        <DoctorVisitList
          appointments={schedule.data}
          onChanged={(message) => {
            showToast(message);
            schedule.reload();
          }}
        />
      )}
      <Toast message={toast} />
    </section>
  );
}
