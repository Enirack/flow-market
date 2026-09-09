export interface BookingInterval {
  scheduledAt: Date;
  durationMinutes: number;
}

/** Vrai si [newStart, newStart+newDuration) chevauche l'un des créneaux existants. */
export function hasSchedulingConflict(
  existing: BookingInterval[],
  newStart: Date,
  newDurationMinutes: number,
): boolean {
  const start = newStart.getTime();
  const end = start + newDurationMinutes * 60_000;

  return existing.some((booking) => {
    const bookingStart = booking.scheduledAt.getTime();
    const bookingEnd = bookingStart + booking.durationMinutes * 60_000;
    return bookingStart < end && start < bookingEnd;
  });
}
