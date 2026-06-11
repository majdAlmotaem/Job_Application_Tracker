export interface JobApplication {
  id: string; // Row number in the sheet
  company: string;
  role: string; // maps to jobtitle
  status: "Applied" | "Interview" | "Rejected" | "Offer" | "Received" | "Unknown";
  date: string; // maps to applicationdate
  location?: string;
  anstellungsart?: string;
  subject?: string;
  summary?: string;
  suggestedAction?: string;
  emailId?: string;
  source_file?: string;
  interview_date?: string;
}

export interface EmailUpdate {
  emailId: string;
  subject: string;
  snippet: string;
  date: string;
  isJobRelated: boolean;
  company: string;
  role: string; // maps to jobtitle
  status: "Applied" | "Interview" | "Rejected" | "Offer" | "Received" | "Unknown";
  location?: string;
  anstellungsart?: string;
  confidence: number;
  summary: string;
  suggestedAction: string;
  synced: boolean;
  classification?: "Neue Bewerbung" | "Statuswechsel";
  dismissed?: boolean;
  body?: string;
}

export interface SpreadsheetConfig {
  spreadsheetId: string;
  sheetName: string;
  status: "valid" | "not_found" | "unconfigured" | "creating";
}

export function normalizeStatus(statusStr: string | undefined | null): JobApplication["status"] {
  if (!statusStr) return "Applied";
  const cleaned = statusStr.trim().toLowerCase();
  
  if (cleaned.includes("interview") || cleaned.includes("gespräch") || cleaned.includes("gespraech") || cleaned.includes("eingeladen") || cleaned.includes("gespraech") || cleaned.includes("vorstellungsgespräch")) {
    return "Interview";
  }
  if (cleaned.includes("reject") || cleaned.includes("absage") || cleaned.includes("abgelehnt") || cleaned.includes("nicht berücksichtigt") || cleaned.includes("archiviert")) {
    return "Rejected";
  }
  if (cleaned.includes("offer") || cleaned.includes("angebot") || cleaned.includes("zusage") || cleaned.includes("vertrag")) {
    return "Offer";
  }
  if (cleaned.includes("receive") || cleaned.includes("eingegangen") || cleaned.includes("erhalten")) {
    return "Received";
  }
  if (cleaned.includes("applied") || cleaned.includes("bewerbung") || cleaned.includes("beworben") || cleaned.includes("gesendet") || cleaned.includes("offen")) {
    return "Applied";
  }
  
  // Try exact match with first letter capitalized
  const capitalized = statusStr.trim().charAt(0).toUpperCase() + statusStr.trim().slice(1).toLowerCase();
  if (["Applied", "Interview", "Rejected", "Offer", "Received", "Unknown"].includes(capitalized)) {
    return capitalized as JobApplication["status"];
  }
  return "Unknown";
}
export interface InterviewReminder {
  id: string;
  applicationId: string;
  company: string;
  date: string;
  tableName: string;
}
