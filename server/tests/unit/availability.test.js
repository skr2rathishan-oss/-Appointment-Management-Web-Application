import { describe, expect, it } from 'vitest';
import { buildSlots, isInPast, isWorkdaySlot, workdaySlots } from '../../src/services/availability.js';
import { toZonedDateTime } from '../../src/utils/clinicTime.js';

const NOW = { date: '2026-06-15', time: '10:10:00' };

describe('workdaySlots', () => {
  it('returns 16 consecutive 30-minute slots from 09:00 to 17:00', () => {
    const slots = workdaySlots();
    expect(slots).toHaveLength(16);
    expect(slots[0]).toEqual({ startTime: '09:00:00', endTime: '09:30:00' });
    expect(slots[1]).toEqual({ startTime: '09:30:00', endTime: '10:00:00' });
    expect(slots.at(-1)).toEqual({ startTime: '16:30:00', endTime: '17:00:00' });
  });
});

describe('isWorkdaySlot', () => {
  it.each([
    ['09:00:00', '09:30:00', true],
    ['16:30:00', '17:00:00', true],
    ['09:15:00', '09:45:00', false],
    ['09:00:00', '10:00:00', false],
    ['08:30:00', '09:00:00', false],
    ['17:00:00', '17:30:00', false],
  ])('%s-%s -> %s', (start, end, expected) => {
    expect(isWorkdaySlot(start, end)).toBe(expected);
  });
});

describe('isInPast', () => {
  it.each([
    ['2026-06-14', '16:00:00', true],
    ['2026-06-15', '09:30:00', true],
    ['2026-06-15', '10:10:00', true], // starting right now counts as past
    ['2026-06-15', '10:30:00', false],
    ['2026-06-16', '09:00:00', false],
  ])('%s %s -> %s', (date, time, expected) => {
    expect(isInPast(date, time, NOW)).toBe(expected);
  });
});

describe('buildSlots', () => {
  const available = (slots) => slots.filter((s) => s.available).map((s) => s.startTime.slice(0, 5));

  it('marks every slot available on a free future day', () => {
    const slots = buildSlots({ date: '2026-06-16', booked: [], clinicNow: NOW });
    expect(slots).toHaveLength(16);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it('marks every slot unavailable on a past day', () => {
    const slots = buildSlots({ date: '2026-06-14', booked: [], clinicNow: NOW });
    expect(slots.some((s) => s.available)).toBe(false);
  });

  it('marks slots that started today before now unavailable', () => {
    const slots = buildSlots({ date: '2026-06-15', booked: [], clinicNow: NOW });
    expect(available(slots)[0]).toBe('10:30');
  });

  it('blocks every slot that overlaps a booking, including partial overlaps', () => {
    const slots = buildSlots({
      date: '2026-06-16',
      booked: [
        { startTime: '09:00:00', endTime: '09:30:00' }, // exact
        { startTime: '10:15:00', endTime: '10:45:00' }, // straddles 10:00 and 10:30
        { startTime: '13:00:00', endTime: '14:00:00' }, // covers two slots
      ],
      clinicNow: NOW,
    });
    const blocked = slots.filter((s) => !s.available).map((s) => s.startTime.slice(0, 5));
    expect(blocked).toEqual(['09:00', '10:00', '10:30', '13:00', '13:30']);
  });

  it('does not block a slot that only touches a booking edge', () => {
    const slots = buildSlots({
      date: '2026-06-16',
      booked: [{ startTime: '09:30:00', endTime: '10:00:00' }],
      clinicNow: NOW,
    });
    expect(slots[0].available).toBe(true); // 09:00-09:30 ends where the booking starts
    expect(slots[2].available).toBe(true); // 10:00-10:30 starts where it ends
    expect(slots[1].available).toBe(false);
  });
});

describe('toZonedDateTime', () => {
  const instant = new Date('2026-06-15T20:45:30Z');

  it('formats the instant in UTC', () => {
    expect(toZonedDateTime(instant, 'UTC')).toEqual({ date: '2026-06-15', time: '20:45:30' });
  });

  it('rolls over to the next day east of UTC', () => {
    // Colombo is UTC+05:30
    expect(toZonedDateTime(instant, 'Asia/Colombo')).toEqual({ date: '2026-06-16', time: '02:15:30' });
  });

  it('uses 00 rather than 24 for midnight', () => {
    expect(toZonedDateTime(new Date('2026-06-15T00:05:00Z'), 'UTC').time).toBe('00:05:00');
  });
});
