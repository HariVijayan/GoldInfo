const MILLISECONDS_PER_DAY = 86_400_000;

/** Dates are handled in UTC so a user's time zone can never shift a day. */
export function parseIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shiftIsoDateByDays(isoDate: string, dayCount: number): string {
  const shiftedDate = parseIsoDate(isoDate);
  shiftedDate.setUTCDate(shiftedDate.getUTCDate() + dayCount);
  return toIsoDate(shiftedDate);
}

/** Subtracts whole months, clamping to the last day of shorter months. */
export function shiftIsoDateByMonths(isoDate: string, monthCount: number): string {
  const shiftedDate = parseIsoDate(isoDate);
  const originalDayOfMonth = shiftedDate.getUTCDate();

  shiftedDate.setUTCDate(1);
  shiftedDate.setUTCMonth(shiftedDate.getUTCMonth() + monthCount);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(shiftedDate.getUTCFullYear(), shiftedDate.getUTCMonth() + 1, 0)
  ).getUTCDate();
  shiftedDate.setUTCDate(Math.min(originalDayOfMonth, lastDayOfTargetMonth));

  return toIsoDate(shiftedDate);
}

export function calculateSpanInDays(firstIsoDate: string, lastIsoDate: string): number {
  return Math.round(
    (parseIsoDate(lastIsoDate).getTime() - parseIsoDate(firstIsoDate).getTime()) /
      MILLISECONDS_PER_DAY
  );
}

export function formatLongDate(isoDate: string): string {
  return parseIsoDate(isoDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatMonthAndYear(isoDate: string): string {
  return parseIsoDate(isoDate).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export function formatDayAndMonth(isoDate: string): string {
  return parseIsoDate(isoDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const SHORT_SPAN_DAYS = 150;
const LONG_SPAN_DAYS = 1500;

/** Short spans label days, medium spans label months, long spans label years. */
export function createDateTickFormatter(spanInDays: number): (isoDate: string) => string {
  if (spanInDays <= SHORT_SPAN_DAYS) return formatDayAndMonth;
  if (spanInDays <= LONG_SPAN_DAYS) return formatMonthAndYear;
  return (isoDate: string) => isoDate.slice(0, 4);
}
