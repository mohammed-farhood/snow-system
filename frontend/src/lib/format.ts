// Western digits everywhere (owner's rule), Baghdad time for dates.
const TZ = "Asia/Baghdad";
const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const n = (v: number) => num.format(Math.round(v));
export const iqd = (v: number) => `${n(v)} د.ع`;

export function time(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(new Date(iso));
}

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];

/** "YYYY-MM-DD" of today in Baghdad. */
export function todayKey(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

function partsOf(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** "الثلاثاء 7 تشرين الأول" — or اليوم / أمس. */
export function dayLabel(key: string) {
  if (key === todayKey()) return "اليوم";
  if (key === todayKey(-1)) return "أمس";
  const p = partsOf(key);
  return `${DAYS[p.dow]} ${p.d} ${MONTHS[p.m - 1]}`;
}

/** Always the full date, e.g. "الثلاثاء 7 تشرين الأول". */
export function fullDay(key: string) {
  const p = partsOf(key);
  return `${DAYS[p.dow]} ${p.d} ${MONTHS[p.m - 1]}`;
}

export const shortDay = (key: string) => DAYS[partsOf(key).dow];

export function dateOf(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

/** "7/10" style short date. */
export function dm(iso: string) {
  const p = partsOf(dateOf(iso));
  return `${p.d}/${p.m}`;
}

export function ago(iso: string | null) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 30) return `قبل ${days} يوم`;
  return `قبل ${Math.floor(days / 30)} شهر`;
}

export const ROLE: Record<string, string> = { OWNER: "المالك", SUPERVISOR: "مشرف", WORKER: "عامل" };

export const EXPENSE: Record<string, string> = {
  GAS: "غاز",
  ELECTRICITY: "كهرباء",
  WATER: "ماء",
  SALARY: "رواتب",
  MAINTENANCE: "صيانة",
  OTHER: "أخرى",
};

/** Accepts Eastern digits people may type and returns a whole number. */
export function toInt(s: string): number {
  const western = s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[^\d]/g, "");
  return western ? parseInt(western, 10) : 0;
}
