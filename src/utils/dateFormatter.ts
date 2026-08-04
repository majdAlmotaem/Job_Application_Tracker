// Clean, robust German date & time utilities for uniform display and sorting

export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const str = String(dateStr).trim();

  // If already DD.MM.YYYY
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(str)) {
    const parts = str.split(".");
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    return `${day}.${month}.${parts[2]}`;
  }

  // If ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split("-");
    return `${parts[2].slice(0, 2)}.${parts[1]}.${parts[0]}`;
  }

  // Handle formats like "Aug 4, 2026" or Date.parse-able strings
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}.${month}.${year}`;
  }

  return str;
}

export function parseGermanDate(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const str = String(dateStr).trim();

  // If DD.MM.YYYY
  if (str.includes(".")) {
    const parts = str.split(".");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return Number(`${year}${month}${day}`) || 0;
    }
  }

  // If YYYY-MM-DD
  if (str.includes("-")) {
    const parts = str.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, "0");
      const day = parts[2].slice(0, 2).padStart(2, "0");
      return Number(`${year}${month}${day}`) || 0;
    }
  }

  // Fallback: parse via new Date() for formats like "Aug 4, 2026"
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return Number(`${year}${month}${day}`) || 0;
  }

  return 0;
}

export function formatGermanDateTime(dateStr?: string | null, timeStr?: string | null): string {
  if (!dateStr) return "-";
  const formatted = formatDisplayDate(dateStr);
  return timeStr?.trim() ? `${formatted} um ${timeStr.trim()} Uhr` : formatted;
}
