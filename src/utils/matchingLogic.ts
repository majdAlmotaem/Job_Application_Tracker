export interface MatchableEntity {
  company: string;
  role: string;
  location?: string;
}

export function cleanCompanyString(name: string): string[] {
  if (!name) return [];
  const suffixes = /(?:\b|(?<=[^a-zA-Z]))(gmbh\s*&\s*co\s*\.?\s*kg|gmbh\s*&\s*co\s*kg|gmbh|ag\s*&\s*co\s*kgaa|kgaa|ag|co|kg|ltd|inc|group|gruppe|holding|corp|corporation|gbr|e\.?v\.?|se|solutions|services|de|deutschland|germany|ab|as|sas|sarl|spa)\b/gi;
  const cleaned = name
    .toLowerCase()
    .replace(suffixes, "")
    .replace(/[.,\/#!$%\^*;:{}=\-_`~()]/g, " ")
    .trim();
  return cleaned.split(/\s+/).filter(word => word.length >= 2);
}

export function isSimilarCompany(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;

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
  if (clean1 === clean2) return true;

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

export function isFuzzyDuplicate(existingApp: MatchableEntity, update: MatchableEntity): boolean {
  if (!isSimilarCompany(existingApp.company, update.company)) {
    return false;
  }
  const roleMatch = isSimilarText(existingApp.role, update.role);
  const locationMatch = isSimilarLocation(existingApp.location || "", update.location || "");
  return roleMatch || locationMatch;
}

export function getLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}.${month}.${year}`;
}
