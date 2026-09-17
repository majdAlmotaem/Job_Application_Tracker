/**
 * Safely sanitizes an external URL to prevent javascript: or data: XSS attacks.
 * Only http:// and https:// protocols are permitted.
 */
export function sanitizeExternalUrl(url?: string): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  // Auto-prepend https:// if it looks like a domain name without protocol
  if (/^[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return "#";
}
