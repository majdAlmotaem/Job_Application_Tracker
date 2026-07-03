export function formatDisplayDate(dateString: string | undefined | null): string {
  if (!dateString) return "-";

  // Check for YYYY-MM-DD format strictly to avoid timezone shift bugs
  const ymdMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    return `${ymdMatch[3]}.${ymdMatch[2]}.${ymdMatch[1]}`;
  }

  // Parse other formats like "Jul 2, 2026"
  const d = new Date(dateString);
  if (isNaN(d.getTime())) {
    return dateString;
  }

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}.${month}.${year}`;
}

export function formatInputDate(dateString: string | undefined | null): string {
  if (!dateString) return "";
  
  // If already YYYY-MM-DD, return as is
  const ymdMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) return dateString;

  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  
  return `${year}-${month}-${day}`;
}
