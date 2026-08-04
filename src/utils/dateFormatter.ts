// Clean, minimal German date & time utilities

export function parseGermanDate(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const str = String(dateStr).trim();
  if (str.includes(".")) {
    const parts = str.split(".");
    if (parts.length === 3) {
      return Number(parts[2] + parts[1].padStart(2, "0") + parts[0].padStart(2, "0")) || 0;
    }
  }
  if (str.includes("-")) {
    const parts = str.split("-");
    if (parts.length === 3) {
      return Number(parts[0] + parts[1].padStart(2, "0") + parts[2].padStart(2, "0")) || 0;
    }
  }
  return 0;
}

export function formatGermanDateTime(dateStr?: string | null, timeStr?: string | null): string {
  if (!dateStr) return "-";
  return timeStr?.trim() ? `${dateStr} um ${timeStr.trim()} Uhr` : dateStr;
}
