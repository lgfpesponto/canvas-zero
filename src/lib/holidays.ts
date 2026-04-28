/**
 * Feriados nacionais brasileiros — cálculo determinístico, sem API externa.
 * Cobre fixos + móveis (relativos à Páscoa). Usado para descontar dias úteis.
 */

const cache = new Map<number, Map<string, string>>();

/** Algoritmo de Meeus/Jones/Butcher: Páscoa (domingo) para um dado ano. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function key(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** Mapa YYYY-MM-DD -> nome do feriado, para o ano informado. */
export function getNationalHolidays(year: number): Map<string, string> {
  const cached = cache.get(year);
  if (cached) return cached;

  const map = new Map<string, string>();

  // Fixos
  map.set(`${year}-01-01`, 'Confraternização Universal');
  map.set(`${year}-04-21`, 'Tiradentes');
  map.set(`${year}-05-01`, 'Dia do Trabalho');
  map.set(`${year}-09-07`, 'Independência');
  map.set(`${year}-10-12`, 'Nossa Senhora Aparecida');
  map.set(`${year}-11-02`, 'Finados');
  map.set(`${year}-11-15`, 'Proclamação da República');
  // Consciência Negra: feriado nacional desde 2024 (Lei 14.759/2023).
  if (year >= 2024) map.set(`${year}-11-20`, 'Consciência Negra');
  map.set(`${year}-12-25`, 'Natal');

  // Móveis (relativos à Páscoa)
  const easter = easterSunday(year);
  map.set(key(addDays(easter, -48)), 'Carnaval (segunda)');
  map.set(key(addDays(easter, -47)), 'Carnaval (terça)');
  map.set(key(addDays(easter, -2)), 'Sexta-Feira Santa');
  map.set(key(addDays(easter, 60)), 'Corpus Christi');

  cache.set(year, map);
  return map;
}

export function isHoliday(date: Date): boolean {
  return getNationalHolidays(date.getFullYear()).has(key(date));
}

/** Dia útil = não é sábado, domingo, nem feriado nacional. */
export function isBusinessDay(date: Date): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false;
  return !isHoliday(date);
}

export interface HolidayEntry {
  date: Date;
  iso: string;
  name: string;
  dow: number;
}

/** Feriados de um mês (month: 1-12), em ordem. */
export function getHolidaysInMonth(year: number, month: number): HolidayEntry[] {
  const all = getNationalHolidays(year);
  const out: HolidayEntry[] = [];
  for (const [iso, name] of all) {
    const [y, m, d] = iso.split('-').map(Number);
    if (m === month) {
      const date = new Date(y, m - 1, d);
      out.push({ date, iso, name, dow: date.getDay() });
    }
  }
  out.sort((a, b) => a.date.getTime() - b.date.getTime());
  return out;
}
