export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/**
 * Safely parse any date value (YYYY-MM-DD, ISO string, DD/MM/YYYY, Date, timestamp, Arabic numerals)
 * into numeric year, month, day components without UTC/timezone offset corruption.
 */
export const parseDateParts = (dateVal?: string | Date | number | null): DateParts | null => {
  if (!dateVal) return null;

  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null;
    return {
      year: dateVal.getFullYear(),
      month: dateVal.getMonth() + 1,
      day: dateVal.getDate()
    };
  }

  if (typeof dateVal === 'number') {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate()
    };
  }

  let str = String(dateVal).trim();
  if (!str) return null;

  // Normalize Eastern Arabic / Hindi digits to ASCII digits (0-9)
  str = str.replace(/[٠-٩]/g, (ch) => '٠١٢٣٤٥٦٧٨٩'.indexOf(ch).toString());
  str = str.replace(/[۰-۹]/g, (ch) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(ch).toString());

  // 1. Try YYYY-MM-DD or YYYY/MM/DD (e.g. 2026-09-20, 2026/09/20, 2026-09-20T00:00:00.000Z)
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // 2. Try DD-MM-YYYY or DD/MM/YYYY (e.g. 20/09/2026, 20-9-2026)
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // 3. Fallback to JS Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth() + 1,
      day: parsed.getDate()
    };
  }

  return null;
};

/**
 * Helper to format dates into standard Gregorian calendar representation (e.g., 2026/09/20 م).
 */
export const formatGregorianDate = (dateVal?: string | Date | number | null): string => {
  const parts = parseDateParts(dateVal);
  if (!parts) return typeof dateVal === 'string' ? dateVal : '';
  const year = parts.year;
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${year}/${month}/${day} م`;
};

/**
 * Format Gregorian date with day of week in Arabic (e.g., الأحد، 20 سبتمبر 2026 م)
 */
export const formatGregorianWithDay = (dateVal?: string | Date | number | null): string => {
  const parts = parseDateParts(dateVal);
  if (!parts) return typeof dateVal === 'string' ? dateVal : '';

  // Construct noon local date to reliably determine day of week without UTC timezone shift
  const d = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0);
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const dayName = days[d.getDay()];
  const monthName = months[parts.month - 1];
  return `${dayName}، ${parts.day} ${monthName} ${parts.year} م`;
};

/**
 * Format Gregorian date with pure numeric date and day of week (e.g. 2026/09/20 - الأحد)
 */
export const formatGregorianNumericWithDay = (dateVal?: string | Date | number | null): string => {
  const parts = parseDateParts(dateVal);
  if (!parts) return typeof dateVal === 'string' ? dateVal : '';

  const d = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0);
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dayName = days[d.getDay()];

  const yearStr = String(parts.year);
  const monthStr = String(parts.month).padStart(2, '0');
  const dayStr = String(parts.day).padStart(2, '0');

  return `${yearStr}/${monthStr}/${dayStr} - ${dayName}`;
};

