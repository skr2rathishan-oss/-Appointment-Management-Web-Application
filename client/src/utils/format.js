// Display and date helpers shared by pages. API dates are 'YYYY-MM-DD', times 'HH:MM:SS'.

const pad = (n) => String(n).padStart(2, '0');

// Local calendar date as YYYY-MM-DD (never toISOString, which is UTC)
export const toISODate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayISO = () => toISODate(new Date());

// Parse 'YYYY-MM-DD' as a local date (new Date('YYYY-MM-DD') would be UTC midnight)
export const parseISODate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// The browser's own { date, time }; only a fallback when the clinic time can't be loaded
export const browserClock = (now = new Date()) => ({
  date: toISODate(now),
  time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
});

// `count` consecutive 'YYYY-MM-DD' dates starting at `fromISO` (pass the clinic's today)
export function nextDays(count, fromISO = todayISO()) {
  const from = parseISODate(fromISO);
  return Array.from({ length: count }, (_, i) =>
    toISODate(new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)),
  );
}

// "Wed 5 Nov"
export const formatDay = (iso) =>
  parseISODate(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export const weekday = (iso) => parseISODate(iso).toLocaleDateString('en-GB', { weekday: 'short' });
export const monthShort = (iso) => parseISODate(iso).toLocaleDateString('en-GB', { month: 'short' });
export const dayOfMonth = (iso) => parseISODate(iso).getDate();

export const hhmm = (time) => time.slice(0, 5);

export const STATUS_LABELS = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export const doctorName = (doctor) => `Dr. ${doctor.firstName} ${doctor.lastName}`;

export const initials = (first = '', last = '') => `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Server validation details ([{ field, message }]) as { field: message }, first message wins
export function fieldErrors(error) {
  const errors = {};
  for (const { field, message } of error?.details ?? []) {
    if (field && !errors[field]) errors[field] = message;
  }
  return errors;
}

// True when the appointment hasn't started yet. clock: the clinic's { date, time }
export const isUpcoming = (a, clock = browserClock()) =>
  `${a.appointmentDate} ${a.startTime}` > `${clock.date} ${clock.time}`;
