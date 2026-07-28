export type ApplicationStage = "Applied" | "Interview" | "Offer";
export type ApplicationStatus = "Open" | "Rejected" | "Accepted" | "Withdrawn";

export interface JobApplication {
  id: string; // Row number in the sheet
  company: string;
  role: string; // maps to jobtitle
  stage: ApplicationStage;
  status: ApplicationStatus;
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
  stage: ApplicationStage;
  status: ApplicationStatus;
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

export function normalizeStage(stageStr: string | undefined | null): ApplicationStage {
  if (!stageStr) return "Applied";
  const cleaned = stageStr.trim().toLowerCase();
  
  if (cleaned.includes("interview") || cleaned.includes("gespräch") || cleaned.includes("gespraech") || cleaned.includes("eingeladen") || cleaned.includes("vorstellungsgespräch") || cleaned.includes("screening")) {
    return "Interview";
  }
  if (cleaned.includes("offer") || cleaned.includes("angebot") || cleaned.includes("zusage") || cleaned.includes("vertrag")) {
    return "Offer";
  }
  if (cleaned.includes("applied") || cleaned.includes("bewerbung") || cleaned.includes("beworben") || cleaned.includes("gesendet")) {
    return "Applied";
  }
  
  const capitalized = stageStr.trim().charAt(0).toUpperCase() + stageStr.trim().slice(1).toLowerCase();
  if (["Applied", "Interview", "Offer"].includes(capitalized)) {
    return capitalized as ApplicationStage;
  }
  return "Applied";
}

export function normalizeStatus(statusStr: string | undefined | null): ApplicationStatus {
  if (!statusStr) return "Open";
  const cleaned = statusStr.trim().toLowerCase();
  
  if (cleaned.includes("reject") || cleaned.includes("absage") || cleaned.includes("abgelehnt") || cleaned.includes("nicht berücksichtigt") || cleaned.includes("archiviert")) {
    return "Rejected";
  }
  if (cleaned.includes("accepted") || cleaned.includes("angenommen") || cleaned.includes("zugesagt")) {
    return "Accepted";
  }
  if (cleaned.includes("withdrawn") || cleaned.includes("zurückgezogen") || cleaned.includes("abgebrochen")) {
    return "Withdrawn";
  }
  if (cleaned.includes("open") || cleaned.includes("offen") || cleaned.includes("aktiv") || cleaned.includes("laufend")) {
    return "Open";
  }
  
  const capitalized = statusStr.trim().charAt(0).toUpperCase() + statusStr.trim().slice(1).toLowerCase();
  if (["Open", "Rejected", "Accepted", "Withdrawn"].includes(capitalized)) {
    return capitalized as ApplicationStatus;
  }
  return "Open";
}

export interface InterviewReminder {
  id: string;
  applicationId: string;
  company: string;
  date: string;
  tableName: string;
}

export interface JobSearchResultItem {
  company: string;
  job_title: string;
  location: string;
  url: string;
  match_reason: string;
  is_saved?: boolean;
}

export interface JobSearchCriteria {
  job_title: string;
  location: string;
  employment_type: string;
  keywords: string[];
  date_posted: string;
}
