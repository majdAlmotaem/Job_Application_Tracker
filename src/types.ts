export interface JobApplication {
  id: string; // Row number in the sheet
  company: string;
  role: string; // maps to jobtitle
  status: "Applied" | "Interviewing" | "Rejected" | "Offer" | "Received" | "Unknown";
  date: string; // maps to applicationdate
  location?: string;
  anstellungsart?: string;
  subject?: string;
  summary?: string;
  suggestedAction?: string;
  emailId?: string;
}

export interface EmailUpdate {
  emailId: string;
  subject: string;
  snippet: string;
  date: string;
  isJobRelated: boolean;
  company: string;
  role: string; // maps to jobtitle
  status: "Applied" | "Interviewing" | "Rejected" | "Offer" | "Received" | "Unknown";
  location?: string;
  anstellungsart?: string;
  confidence: number;
  summary: string;
  suggestedAction: string;
  synced: boolean;
  classification?: "Neue Bewerbung" | "Statuswechsel";
}

export interface SpreadsheetConfig {
  spreadsheetId: string;
  sheetName: string;
  status: "valid" | "not_found" | "unconfigured" | "creating";
}

