// Pure scheduling helpers (no I/O, no env) so they can be unit tested with an injected "now".
// Dates are 'YYYY-MM-DD' and times 'HH:MM:SS' strings, which compare correctly as text.

export const WORKDAY_START = '09:00:00';
export const WORKDAY_END = '17:00:00';
export const SLOT_MINUTES = 30;

const pad = (n) => String(n).padStart(2, '0');

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const toTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`;

// clinicNow: { date, time } in clinic time. Earlier days, or today at/before now, are past.
export function isInPast(date, startTime, clinicNow) {
  return date < clinicNow.date || (date === clinicNow.date && startTime <= clinicNow.time);
}

// Every bookable slot of a working day, ignoring bookings: [{ startTime, endTime }]
export function workdaySlots() {
  const slots = [];
  for (let m = toMinutes(WORKDAY_START); m + SLOT_MINUTES <= toMinutes(WORKDAY_END); m += SLOT_MINUTES) {
    slots.push({ startTime: toTime(m), endTime: toTime(m + SLOT_MINUTES) });
  }
  return slots;
}

// True when [startTime, endTime) is exactly one of the working-day slots
export const isWorkdaySlot = (startTime, endTime) =>
  workdaySlots().some((slot) => slot.startTime === startTime && slot.endTime === endTime);

// [startA, endA) and [startB, endB) share some time
const overlaps = (startA, endA, startB, endB) => startA < endB && endA > startB;

// booked: the doctor's active (not cancelled / no-show) appointments on `date`
export function buildSlots({ date, booked = [], clinicNow }) {
  return workdaySlots().map(({ startTime, endTime }) => {
    const taken = booked.some((a) => overlaps(startTime, endTime, a.startTime, a.endTime));
    return { startTime, endTime, available: !taken && !isInPast(date, startTime, clinicNow) };
  });
}
