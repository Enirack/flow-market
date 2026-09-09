import { describe, expect, it } from 'vitest';
import { hasSchedulingConflict } from './booking-conflict.util';

function at(hour: number, minute = 0): Date {
  return new Date(2026, 0, 15, hour, minute, 0, 0);
}

describe('hasSchedulingConflict', () => {
  const existing = [{ scheduledAt: at(10), durationMinutes: 60 }]; // 10:00–11:00

  it('returns false when there is no existing booking', () => {
    expect(hasSchedulingConflict([], at(10), 60)).toBe(false);
  });

  it('returns false for a slot entirely before the existing booking', () => {
    expect(hasSchedulingConflict(existing, at(8), 60)).toBe(false); // 08:00–09:00
  });

  it('returns false for a slot entirely after the existing booking', () => {
    expect(hasSchedulingConflict(existing, at(11), 60)).toBe(false); // 11:00–12:00 (back-to-back)
  });

  it('returns true when the new slot starts inside the existing booking', () => {
    expect(hasSchedulingConflict(existing, at(10, 30), 60)).toBe(true); // 10:30–11:30
  });

  it('returns true when the new slot ends inside the existing booking', () => {
    expect(hasSchedulingConflict(existing, at(9, 30), 60)).toBe(true); // 09:30–10:30
  });

  it('returns true when the new slot fully contains the existing booking', () => {
    expect(hasSchedulingConflict(existing, at(9), 180)).toBe(true); // 09:00–12:00
  });

  it('returns true when the new slot is fully contained within the existing booking', () => {
    expect(hasSchedulingConflict(existing, at(10, 15), 15)).toBe(true); // 10:15–10:30
  });

  it('returns true for an exact duplicate slot', () => {
    expect(hasSchedulingConflict(existing, at(10), 60)).toBe(true);
  });

  it('ignores bookings on other days', () => {
    const otherDay = [{ scheduledAt: new Date(2026, 0, 16, 10), durationMinutes: 60 }];
    expect(hasSchedulingConflict(otherDay, at(10), 60)).toBe(false);
  });

  it('detects a conflict against any one of several existing bookings', () => {
    const multiple = [
      { scheduledAt: at(8), durationMinutes: 60 },
      { scheduledAt: at(10), durationMinutes: 60 },
      { scheduledAt: at(14), durationMinutes: 60 },
    ];
    expect(hasSchedulingConflict(multiple, at(10, 30), 30)).toBe(true);
  });
});
