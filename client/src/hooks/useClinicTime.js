import { clinicService } from '../services/clinicService';
import { browserClock } from '../utils/format';
import { useAsync } from './useAsync';

// The clinic's "today" and current time from the server (CLINIC_TZ), so pages agree with
// the server about which day it is. Falls back to the browser clock if the call fails.
export function useClinicTime() {
  const clinic = useAsync(() => clinicService.getTime());
  const clock = clinic.data ?? (clinic.error ? browserClock() : null);
  return { clock, loading: !clock };
}
