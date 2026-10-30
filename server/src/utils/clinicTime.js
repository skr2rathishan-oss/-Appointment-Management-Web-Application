import { env } from '../config/env.js';

// Wall-clock date and time of the instant `now` in an IANA time zone, e.g. 'Asia/Colombo'
export function toZonedDateTime(now, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

// Current { date: 'YYYY-MM-DD', time: 'HH:MM:SS' } in the clinic's time zone (CLINIC_TZ)
export const clinicNow = (now = new Date()) => toZonedDateTime(now, env.clinicTimeZone);
