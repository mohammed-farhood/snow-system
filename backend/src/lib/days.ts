// The factory works on Baghdad time (UTC+3, no daylight saving). The server may run in UTC,
// so "today" is always computed with this fixed offset.
const OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the Baghdad day that contains `d`, as a real instant. */
export function startOfDay(d: Date = new Date()): Date {
  const local = d.getTime() + OFFSET_MS;
  return new Date(local - (local % DAY_MS) - OFFSET_MS);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

/** "YYYY-MM-DD" of the Baghdad day containing `d`. */
export function dayKey(d: Date): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Parses "YYYY-MM-DD" as the start of that Baghdad day. */
export function parseDay(s: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("bad day");
  return new Date(Date.parse(`${s}T00:00:00Z`) - OFFSET_MS);
}

export function today() {
  const from = startOfDay();
  return { from, to: addDays(from, 1) };
}
