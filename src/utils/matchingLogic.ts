export interface MatchableEntity {
  company: string;
  role: string;
  location?: string;
  date?: string;
}

export function isUnknownValue(val?: string | null): boolean {
  if (!val) return true;
  const cleaned = val.trim().toLowerCase();
  if (
    cleaned === "" ||
    cleaned === "unknown" ||
    cleaned === "unbekannt" ||
    cleaned === "n/a" ||
    cleaned === "na" ||
    cleaned === "-" ||
    cleaned === "none" ||
    cleaned === "null" ||
    /^[\s\-?]+$/.test(cleaned)
  ) {
    return true;
  }
  return false;
}

export function cleanCompanyString(name: string): string[] {
  if (!name || isUnknownValue(name)) return [];
  const suffixes = /(?:\b|(?<=[^a-zA-Z]))(gmbh\s*&\s*co\s*\.?\s*kg|gmbh\s*&\s*co\s*kg|gmbh|ag\s*&\s*co\s*kgaa|kgaa|ag|co|kg|ltd|inc|group|gruppe|holding|corp|corporation|gbr|e\.?v\.?|se|solutions|services|de|deutschland|germany|ab|as|sas|sarl|spa)\b/gi;
  const cleaned = name
    .toLowerCase()
    .replace(suffixes, "")
    .replace(/[.,\/#!$%\^*;:{}=\-_`~()]/g, " ")
    .trim();
  return cleaned.split(/\s+/).filter(word => word.length >= 2);
}

export function isSimilarCompany(name1: string, name2: string): boolean {
  if (!name1 || !name2 || isUnknownValue(name1) || isUnknownValue(name2)) return false;

  const normalize = (s: string) => {
    const suffixes = /(?:\b|(?<=[^a-zA-Z]))(gmbh\s*&\s*co\s*\.?\s*kg|gmbh\s*&\s*co\s*kg|gmbh|ag\s*&\s*co\s*kgaa|kgaa|ag|co|kg|ltd|inc|group|gruppe|holding|corp|corporation|gbr|e\.?v\.?|se|solutions|services|de|deutschland|germany|ab|as|sas|sarl|spa)\b/gi;
    return s
      .toLowerCase()
      .replace(suffixes, "")
      .replace(/\s+/g, "")
      .replace(/[.,\/#!$%\^*;:{}=\-_`~()]/g, "")
      .trim();
  };

  const clean1 = normalize(name1);
  const clean2 = normalize(name2);

  // 1. Exact match after suffix removal
  if (clean1 && clean2 && clean1 === clean2) return true;

  // 2. Token-based analysis (more strict)
  const tokens1 = cleanCompanyString(name1);
  const tokens2 = cleanCompanyString(name2);
  
  if (tokens1.length === 0 || tokens2.length === 0) return false;

  const genericWords = new Set([
    "gmbh", "co", "kg", "ag", "ltd", "inc", "group", "gruppe", "holding", 
    "corp", "corporation", "gbr", "ev", "se", "solutions", "services", "service", 
    "de", "deutschland", "germany", "ab", "as", "sas", "sarl", "spa", 
    "informatik", "software", "technologies", "technology", "consulting", 
    "consult", "systems", "systeme", "digital", "engineering", "tech", "it"
  ]);

  const filtered1 = tokens1.filter(t => !genericWords.has(t));
  const filtered2 = tokens2.filter(t => !genericWords.has(t));

  // If we have non-generic tokens, check for similarity on those
  if (filtered1.length > 0 && filtered2.length > 0) {
    const intersect = filtered1.filter(t => filtered2.includes(t));
    if (intersect.length === 0) return false;
    
    // Require high overlap on significant (non-generic) tokens
    const matchRatio = intersect.length / Math.max(filtered1.length, filtered2.length);
    return matchRatio >= 0.6;
  }

  // Fallback to raw tokens if one has only generic words (e.g. "Software Systems GmbH")
  const intersect = tokens1.filter(t => tokens2.includes(t));
  if (intersect.length === 0) return false;
  
  const matchRatio = intersect.length / Math.max(tokens1.length, tokens2.length);
  return matchRatio >= 0.75; // require even higher threshold for generic ones
}

export function normalizeRole(role?: string | null): string {
  if (!role || isUnknownValue(role)) return "";
  return role
    .toLowerCase()
    .replace(/\b(m\/w\/d|f\/m\/d|w\/m\/d|m\/f\/d|d\/m\/w|all\s+genders|gn)\b/gi, "")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSameRole(role1?: string | null, role2?: string | null): boolean {
  if (isUnknownValue(role1) || isUnknownValue(role2)) return false;
  const r1 = normalizeRole(role1);
  const r2 = normalizeRole(role2);
  if (!r1 || !r2) return false;
  return r1 === r2;
}

export function isSameCompany(company1?: string | null, company2?: string | null): boolean {
  if (isUnknownValue(company1) || isUnknownValue(company2)) return false;
  const c1 = company1!.trim().toLowerCase();
  const c2 = company2!.trim().toLowerCase();
  if (c1 === c2) return true;
  return isSimilarCompany(company1!, company2!);
}

export function parseDateToTimestamp(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str) return null;

  // DD.MM.YYYY or D.M.YYYY (with optional time)
  const germanMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (germanMatch) {
    const day = parseInt(germanMatch[1], 10);
    const month = parseInt(germanMatch[2], 10) - 1;
    const year = parseInt(germanMatch[3], 10);
    const dt = new Date(year, month, day);
    if (!isNaN(dt.getTime())) return dt.getTime();
  }

  // YYYY-MM-DD or ISO
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const dt = new Date(year, month, day);
    if (!isNaN(dt.getTime())) return dt.getTime();
  }

  // Fallback to standard Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  return null;
}

export function getDaysDifference(date1?: string | null, date2?: string | null): number | null {
  const t1 = parseDateToTimestamp(date1);
  const t2 = parseDateToTimestamp(date2);
  if (t1 === null || t2 === null) return null;
  const diffMs = Math.abs(t1 - t2);
  return diffMs / (1000 * 60 * 60 * 24);
}

export function isDuplicateApplication(
  existingApp: MatchableEntity,
  incoming: MatchableEntity,
  maxDaysDifference = 30
): boolean {
  // 1. Handle "Unknown" values: do not auto-discard if company or role is Unknown
  if (
    isUnknownValue(existingApp.company) ||
    isUnknownValue(incoming.company) ||
    isUnknownValue(existingApp.role) ||
    isUnknownValue(incoming.role)
  ) {
    return false;
  }

  // 2. Strict company match
  if (!isSameCompany(existingApp.company, incoming.company)) {
    return false;
  }

  // 3. Strict role match (Different Role = New Job)
  if (!isSameRole(existingApp.role, incoming.role)) {
    return false;
  }

  // 4. Date check (Different Date > 30 days = New Job)
  const daysDiff = getDaysDifference(existingApp.date, incoming.date);
  if (daysDiff !== null && daysDiff > maxDaysDifference) {
    return false;
  }

  return true;
}

export function isFuzzyDuplicate(existingApp: MatchableEntity, update: MatchableEntity): boolean {
  return isDuplicateApplication(existingApp, update, 30);
}

export function isSimilarText(text1: string, text2: string): boolean {
  const clean = (t: string) => t.toLowerCase()
    .replace(/\b(m\/w\/d|f\/m\/d|w\/m\/d|m\/f\/d|all\s+genders|junior|senior|lead|head\s+of)\b/g, "")
    .replace(/[()\-.,\/#!$%\^&\*;:{}=\-_`~]/g, " ")
    .trim();
  const c1 = clean(text1);
  const c2 = clean(text2);
  if (c1 === c2) return true;
  if (c1.length > 3 && c2.length > 3 && (c1.includes(c2) || c2.includes(c1))) return true;

  const words1 = c1.split(/\s+/).filter(w => w.length >= 4);
  const words2 = c2.split(/\s+/).filter(w => w.length >= 4);
  return words1.some(w => words2.includes(w));
}

export function isSimilarLocation(loc1: string, loc2: string): boolean {
  const clean = (l: string) => l.toLowerCase()
    .replace(/\b(germany|deutschland|hybrid|remote|onsite|home\s*office)\b/g, "")
    .replace(/[,\-.]/g, " ")
    .trim();
  const c1 = clean(loc1);
  const c2 = clean(loc2);
  if (c1 === c2) return true;
  if (c1.length > 2 && c2.length > 2 && (c1.includes(c2) || c2.includes(c1))) return true;

  const words1 = c1.split(/\s+/).filter(w => w.length >= 3);
  const words2 = c2.split(/\s+/).filter(w => w.length >= 3);
  return words1.some(w => words2.includes(w));
}

export function getLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}.${month}.${year}`;
}

