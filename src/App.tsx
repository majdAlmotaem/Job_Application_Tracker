import React, { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { 
  Sparkles, 
  Mail, 
  RefreshCw, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink, 
  Plus, 
  Search, 
  LogOut, 
  Filter, 
  AlertCircle,
  Table,
  MapPin,
  Briefcase,
  Sun,
  Moon,
  Link2,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  initAuth, 
  googleSignIn, 
  logout 
} from "./googleAuth";
import { 
  createJobTrackerSpreadsheet, 
  fetchJobApplications, 
  addJobApplication, 
  updateJobApplicationRow,
  getSpreadsheetTitle
} from "./sheetsService";
import { 
  searchGmailMessages, 
  GmailMessageSummary 
} from "./gmailService";
import { JobApplication, EmailUpdate } from "./types";

export function parseSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

interface MatchableEntity {
  company: string;
  role: string;
  location?: string;
}

export function cleanCompanyString(name: string): string[] {
  if (!name) return [];
  const suffixes = /\b(gmbh\s*&\s*co\s*\.?\s*kg|gmbh\s*&\s*co\s*kg|gmbh|ag|co|kg|ltd|inc|group|gruppe|holding|corp|corporation|gbr|e\.?v\.?|se|solutions|services|de|deutschland|germany)\b/gi;
  const cleaned = name
    .toLowerCase()
    .replace(suffixes, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .trim();
  return cleaned.split(/\s+/).filter(word => word.length >= 3);
}

export function isSimilarCompany(name1: string, name2: string): boolean {
  const clean1 = name1.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  const clean2 = name2.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  if (clean1 === clean2) return true;
  if (clean1.length > 2 && clean2.length > 2 && (clean1.includes(clean2) || clean2.includes(clean1))) return true;

  const tokens1 = cleanCompanyString(name1);
  const tokens2 = cleanCompanyString(name2);
  if (tokens1.length === 0 || tokens2.length === 0) return false;
  return tokens1.some(token => tokens2.includes(token));
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

export default function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sheets Config State
  const [spreadsheetId, setSpreadsheetId] = useState<string>("");
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");
  const [customSpreadsheetId, setCustomSpreadsheetId] = useState<string>("");
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [showBindInput, setShowBindInput] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isInboxScanned, setIsInboxScanned] = useState<boolean>(false);
  const [isNeueExpanded, setIsNeueExpanded] = useState<boolean>(true);
  const [isStatusExpanded, setIsStatusExpanded] = useState<boolean>(true);

  // Forced Darkmode
  const isDarkMode = true;

  // Applications & Gmail scan State
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isFetchingApps, setIsFetchingApps] = useState(false);
  // Default query customized for Deutschemarkt / German job application emails
  const [gmailQuery, setGmailQuery] = useState<string>(
    'Bewerbung OR Interview OR Absage OR Vertrag OR Stelle OR Softwareentwickler OR Webentwickler OR candidate OR "vielen Dank für Ihre Bewerbung"'
  );
  const [rawEmails, setRawEmails] = useState<GmailMessageSummary[]>([]);
  const [emailUpdates, setEmailUpdates] = useState<EmailUpdate[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Manual Add Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualCompany, setManualCompany] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualLocation, setManualLocation] = useState("Düsseldorf, Germany");
  const [manualAnstellungsart, setManualAnstellungsart] = useState("Festanstellung");
  const [manualStatus, setManualStatus] = useState<JobApplication["status"]>("Applied");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Search, Sort and Filter table state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [sortType, setSortType] = useState<string>("date_desc");

  // Notifications or toast messages
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Keep track of which email is being individually synced or status updated
  const [syncingEmailId, setSyncingEmailId] = useState<string | null>(null);
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        
        // Restore spreadsheet configuration from localStorage if available
        const savedId = localStorage.getItem(`spreadsheet_${currentUser.uid}`);
        if (savedId) {
          setSpreadsheetId(savedId);
          setCustomSpreadsheetId(savedId);
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Darkmode sync with DOM - forced on startup
  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("darkMode", "true");
  }, []);

  // Fetch job applications when sheet config and tokens are ready, otherwise load localStorage offline backup
  useEffect(() => {
    if (token && spreadsheetId) {
      loadApplications();
    } else {
      const savedApps = localStorage.getItem("offline_applications");
      if (savedApps) {
        try {
          setApplications(JSON.parse(savedApps));
        } catch (e) {
          console.error("Failed to parse offline applications", e);
        }
      } else {
        setApplications([]);
      }
    }
  }, [token, spreadsheetId]);

  // Clear toast notifications after 5s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const triggerToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const authResult = await googleSignIn();
      if (authResult) {
        setToken(authResult.accessToken);
        setUser(authResult.user);
        setNeedsAuth(false);
        const savedId = localStorage.getItem(`spreadsheet_${authResult.user.uid}`);
        if (savedId) {
          setSpreadsheetId(savedId);
          setCustomSpreadsheetId(savedId);
        }
        triggerToast("success", "Erfolgreich mit Google verbunden.");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("error", err.message || "Authentifizierung fehlgeschlagen.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setToken(null);
      setUser(null);
      setApplications([]);
      setRawEmails([]);
      setEmailUpdates([]);
      setSpreadsheetId("");
      setCustomSpreadsheetId("");
      triggerToast("success", "Abgemeldet.");
    } catch (err: any) {
      console.error(err);
      triggerToast("error", "Abmeldung fehlgeschlagen");
    }
  };

  // Google Sheet Operations Tasks
  const handleCreateSheet = async () => {
    if (!token || !user) return;
    setIsCreatingSheet(true);
    setSheetError(null);
    try {
      // Create a sheet specifically tagged for Bewerbungen
      const newSheetId = await createJobTrackerSpreadsheet(token, "Bewerbungen Tracker");
      setSpreadsheetId(newSheetId);
      setSpreadsheetTitle("Bewerbungen Tracker");
      setCustomSpreadsheetId(newSheetId);
      localStorage.setItem(`spreadsheet_${user.uid}`, newSheetId);
      triggerToast("success", "Google Tabelle erfolgreich erstellt!");
    } catch (err: any) {
      console.error(err);
      setSheetError(err.message || "Failed to create tracker spreadsheet");
      triggerToast("error", "Fehler beim Erstellen der Tabelle. Google OAuth Scopes prüfen.");
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const loadApplications = async () => {
    if (!token || !spreadsheetId) return;
    setIsFetchingApps(true);
    try {
      const title = await getSpreadsheetTitle(token, spreadsheetId).catch(() => "Google Tabelle");
      setSpreadsheetTitle(title);
      const apps = await fetchJobApplications(token, spreadsheetId);
      setApplications(apps);
    } catch (err: any) {
      console.error(err);
      triggerToast("error", `Fehler beim Laden: ${err.message}`);
    } finally {
      setIsFetchingApps(false);
    }
  };

  const handleBindCustomSheet = async () => {
    if (!customSpreadsheetId.trim() || !user || !token) return;
    const cleanId = parseSpreadsheetId(customSpreadsheetId);
    setSpreadsheetId(cleanId);
    setCustomSpreadsheetId(cleanId);
    localStorage.setItem(`spreadsheet_${user.uid}`, cleanId);
    triggerToast("success", "Tabelle erfolgreich verknüpft.");
    setShowBindInput(false);
    try {
      const title = await getSpreadsheetTitle(token, cleanId);
      setSpreadsheetTitle(title);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to find existing matching application by company name (using fuzzy company matching)
  const getCompanyMatch = (companyName: string) => {
    if (!companyName) return null;
    return applications.find(app => isSimilarCompany(app.company, companyName));
  };

  // Gmail Scanning & Gemini Analysis Tasks
  const handleScanInboxAndAnalyze = async () => {
    if (!token) return;
    setIsScanning(true);
    try {
      triggerToast("success", "Emails werden aus dem Posteingang geladen...");
      const messages = await searchGmailMessages(token, gmailQuery, 15);
      setRawEmails(messages);

      if (messages.length === 0) {
        triggerToast("error", "Keine passenden Emails im Posteingang gefunden.");
        setIsScanning(false);
        return;
      }

      triggerToast("success", "Gemini analysiert Ihre Emails auf Bewerbungsstatus...");
      
      const response = await fetch("/api/analyze-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emails: messages }),
      });

      if (!response.ok) {
        throw new Error("Gemini-Analyse-Serverfehler.");
      }

      const backendData = await response.json();
      const parsedResults: any[] = backendData.results || [];

      // Link backend results back to raw email details
      const updates: EmailUpdate[] = parsedResults.map((result: any) => {
        const raw = messages.find(m => m.id === result.emailId) || {
          subject: "(Kein Betreff)",
          snippet: "",
          date: new Date().toLocaleDateString(),
        };

        return {
          emailId: result.emailId,
          subject: raw.subject,
          snippet: raw.snippet,
          date: raw.date,
          isJobRelated: result.isJobRelated,
          company: result.company,
          role: result.role,
          status: result.status,
          classification: result.classification || "Neue Bewerbung",
          location: result.location || "N/A",
          anstellungsart: result.anstellungsart || "N/A",
          confidence: result.confidence,
          summary: result.summary,
          suggestedAction: result.suggestedAction,
          synced: false,
        };
      });

      // Retrieve dismissed emails from localStorage
      let dismissedList: string[] = [];
      if (user) {
        try {
          const dismissedStr = localStorage.getItem(`dismissed_emails_${user.uid}`) || "[]";
          dismissedList = JSON.parse(dismissedStr);
        } catch (e) {
          console.error("Failed to parse dismissed list from localstorage", e);
        }
      }

      // Filter out non-job-related elements, already matched/synced by emailId, or user dismissed
      const filteredUpdates = updates.filter(up => {
        if (!up.isJobRelated) return false;

        // 1. Check if application already exists with this emailId in applications list
        const alreadyInApps = applications.some(app => app.emailId === up.emailId);
        if (alreadyInApps) return false;

        // 2. Check if this update has been dismissed/rejected by the user
        if (dismissedList.includes(up.emailId)) return false;

        // 3. Check fuzzy duplicates in existing applications
        const fuzzyDuplicate = applications.find(app => isFuzzyDuplicate(app, up));
        if (fuzzyDuplicate) {
          // If it's a new application entry scan result, hide it because we already track it
          if (up.classification !== "Statuswechsel") {
            return false;
          }
          // If it's a status change scan result, hide it only if the status matches what is already recorded
          if (fuzzyDuplicate.status.toLowerCase() === up.status.toLowerCase()) {
            return false;
          }
        }

        return true;
      });

      setEmailUpdates(filteredUpdates);
      setIsInboxScanned(true);

      if (filteredUpdates.length === 0) {
        triggerToast("success", "Scan abgeschlossen. Keine neuen Bewerbungs-Updates gefunden.");
      } else {
        triggerToast("success", `${filteredUpdates.length} relevante Updates geladen! Sie können jedes Element manuell freigeben.`);
      }

    } catch (err: any) {
      console.error(err);
      triggerToast("error", `Fehler beim Scan: ${err.message || "Unbekannter Fehler"}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Manual accept or status update decision handler
  const handleAcceptEmailChange = async (update: EmailUpdate) => {
    setSyncingEmailId(update.emailId);
    try {
      const match = getCompanyMatch(update.company);

      // Duplicate Check and Action splitting
      if (update.classification === "Statuswechsel" && match) {
        // Update existing row status and link the email details so future scans skip this email
        if (token && spreadsheetId) {
          await updateJobApplicationRow(token, spreadsheetId, match.id, { 
            status: update.status,
            emailId: update.emailId,
            subject: update.subject,
            summary: update.summary,
            suggestedAction: update.suggestedAction
          });
        }
        
        // Update UI states
        const updated = applications.map(app => 
          app.id === match.id 
            ? { 
                ...app, 
                status: update.status,
                emailId: update.emailId,
                subject: update.subject,
                summary: update.summary,
                suggestedAction: update.suggestedAction
              } 
            : app
        );
        setApplications(updated);
        localStorage.setItem("offline_applications", JSON.stringify(updated));
        
        triggerToast("success", `Status für ${update.company} auf "${update.status}" aktualisiert.`);
      } else {
        // Add new application manually (or fallback offline)
        if (token && spreadsheetId) {
          await addJobApplication(token, spreadsheetId, {
            company: update.company,
            role: update.role,
            status: update.status,
            date: update.date,
            location: update.location || "N/A",
            anstellungsart: update.anstellungsart || "N/A",
            subject: update.subject,
            summary: update.summary,
            suggestedAction: update.suggestedAction,
            emailId: update.emailId,
          });
        }
        
        // Add locally always as well to sync structures
        const newApp: JobApplication = {
          id: String(Date.now()),
          company: update.company,
          role: update.role,
          status: update.status,
          date: update.date,
          location: update.location || "N/A",
          anstellungsart: update.anstellungsart || "N/A",
          subject: update.subject,
          summary: update.summary,
          suggestedAction: update.suggestedAction,
          emailId: update.emailId,
        };
        const updated = [newApp, ...applications];
        setApplications(updated);
        localStorage.setItem("offline_applications", JSON.stringify(updated));
        
        triggerToast("success", `Neue Bewerbung bei ${update.company} eingetragen!`);
      }

      // Mark as synced
      update.synced = true;
      setEmailUpdates([...emailUpdates]);
      
      if (token && spreadsheetId) {
        await loadApplications();
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("error", `Fehler beim Übernehmen: ${err.message}`);
    } finally {
      setSyncingEmailId(null);
    }
  };

  const handleRefuseEmailUpdate = (emailId: string) => {
    setEmailUpdates(prev => prev.filter(up => up.emailId !== emailId));
    if (user) {
      try {
        const dismissedStr = localStorage.getItem(`dismissed_emails_${user.uid}`) || "[]";
        const dismissed = JSON.parse(dismissedStr) as string[];
        if (!dismissed.includes(emailId)) {
          dismissed.push(emailId);
          localStorage.setItem(`dismissed_emails_${user.uid}`, JSON.stringify(dismissed));
        }
      } catch (e) {
        console.error("Failed to save dismissed emails", e);
      }
    }
    triggerToast("success", "Vorschlag entfernt.");
  };

  // Bulk actions handlers for categories
  const handleAcceptAll = async (updatesToAccept: EmailUpdate[]) => {
    const unsynced = updatesToAccept.filter(up => !up.synced);
    if (unsynced.length === 0) return;
    
    const confirmed = window.confirm(`Möchten Sie alle ${unsynced.length} Einträge in dieser Kategorie übernehmen?`);
    if (!confirmed) return;

    setIsScanning(true);
    triggerToast("success", `${unsynced.length} Einträge werden verarbeitet...`);
    let successCount = 0;
    
    // Copy applications to avoid stale references in state updates
    let currentApplications = [...applications];
    
    for (const update of unsynced) {
      try {
        const match = currentApplications.find(app => app.company.toLowerCase().trim() === update.company.toLowerCase().trim());
        if (update.classification === "Statuswechsel" && match) {
          if (token && spreadsheetId) {
            await updateJobApplicationRow(token, spreadsheetId, match.id, { 
              status: update.status,
              emailId: update.emailId,
              subject: update.subject,
              summary: update.summary,
              suggestedAction: update.suggestedAction
            });
          }
          currentApplications = currentApplications.map(app => 
            app.id === match.id 
              ? { 
                  ...app, 
                  status: update.status,
                  emailId: update.emailId,
                  subject: update.subject,
                  summary: update.summary,
                  suggestedAction: update.suggestedAction
                } 
              : app
          );
        } else {
          if (token && spreadsheetId) {
            await addJobApplication(token, spreadsheetId, {
              company: update.company,
              role: update.role,
              status: update.status,
              date: update.date,
              location: update.location || "N/A",
              anstellungsart: update.anstellungsart || "N/A",
              subject: update.subject,
              summary: update.summary,
              suggestedAction: update.suggestedAction,
              emailId: update.emailId,
            });
          }
          const newApp: JobApplication = {
            id: String(Date.now() + successCount),
            company: update.company,
            role: update.role,
            status: update.status,
            date: update.date,
            location: update.location || "N/A",
            anstellungsart: update.anstellungsart || "N/A",
            subject: update.subject,
            summary: update.summary,
            suggestedAction: update.suggestedAction,
            emailId: update.emailId,
          };
          currentApplications = [newApp, ...currentApplications];
        }
        update.synced = true;
        successCount++;
      } catch (e: any) {
        console.error(`Fehler bei ${update.company}:`, e);
      }
    }
    
    setApplications(currentApplications);
    localStorage.setItem("offline_applications", JSON.stringify(currentApplications));
    setEmailUpdates([...emailUpdates]);
    
    if (token && spreadsheetId) {
      await loadApplications();
    }
    setIsScanning(false);
    triggerToast("success", `${successCount} Einträge erfolgreich übernommen!`);
  };

  const handleRejectAll = (updatesToReject: EmailUpdate[]) => {
    const unsynced = updatesToReject.filter(up => !up.synced);
    if (unsynced.length === 0) return;

    const confirmed = window.confirm(`Möchten Sie alle ${unsynced.length} Einträge in dieser Kategorie verwerfen?`);
    if (!confirmed) return;

    if (user) {
      try {
        const dismissedStr = localStorage.getItem(`dismissed_emails_${user.uid}`) || "[]";
        const dismissed = JSON.parse(dismissedStr) as string[];
        
        unsynced.forEach(up => {
          if (!dismissed.includes(up.emailId)) {
            dismissed.push(up.emailId);
          }
        });
        
        localStorage.setItem(`dismissed_emails_${user.uid}`, JSON.stringify(dismissed));
      } catch (e) {
        console.error("Failed to save dismissed emails", e);
      }
    }

    const idsToReject = unsynced.map(up => up.emailId);
    setEmailUpdates(prev => prev.filter(up => !idsToReject.includes(up.emailId)));
    triggerToast("success", `${unsynced.length} Einträge verworfen.`);
  };

  // CSV/Excel Custom File Drag-Drop & Input Parser Handler
  const handleCsvFileParse = async (text: string) => {
    try {
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        triggerToast("error", "Die Datei enthält unzureichende Zeilenanzahl.");
        return;
      }

      // Detect Delimiter
      const headerLine = lines[0];
      let delimiter = ",";
      if (headerLine.includes(";")) delimiter = ";";
      else if (headerLine.includes("\t")) delimiter = "\t";

      // Robust Quote-protected column parser
      const parseCsvLine = (line: string) => {
        const result = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            result.push(cur.trim().replace(/^["']|["']$/g, ""));
            cur = "";
          } else {
            cur += char;
          }
        }
        result.push(cur.trim().replace(/^["']|["']$/g, ""));
        return result;
      };

      const rawHeaders = parseCsvLine(headerLine).map(h => h.toLowerCase().trim());
      
      const findIdx = (keywords: string[]) => {
        return rawHeaders.findIndex(h => keywords.some(k => h.includes(k) || k.includes(h)));
      };

      const indexes = {
        company: findIdx(["company", "unternehmen", "firma", "employer", "arbeitgeber"]),
        role: findIdx(["jobtitle", "job title", "role", "rolle", "stelle", "berufsbezeichnung", "position"]),
        status: findIdx(["status", "stage", "hiring status"]),
        date: findIdx(["applied", "date", "datum", "bewerbungsdatum"]),
        location: findIdx(["location", "standort", "ort", "stadt"]),
        anstellungsart: findIdx(["anstellungsart", "employment type", "job type", "art der anstellung", "type"]),
      };

      const getColVal = (row: string[], idx: number, fallback = "") => {
        return idx >= 0 && idx < row.length ? row[idx] : fallback;
      };

      const parsedApps: JobApplication[] = [];
      for (let i = 1; i < lines.length; i++) {
        const rowCols = parseCsvLine(lines[i]);
        if (rowCols.length === 0 || !rowCols[0]) continue;

        const company = getColVal(rowCols, indexes.company >= 0 ? indexes.company : 0, "Unbekannt");
        const role = getColVal(rowCols, indexes.role >= 0 ? indexes.role : 1, "Stelle");
        const statusStr = getColVal(rowCols, indexes.status >= 0 ? indexes.status : 3, "Applied").trim();
        const dateVal = getColVal(rowCols, indexes.date >= 0 ? indexes.date : 2, new Date().toLocaleDateString("de-DE"));
        const locationVal = getColVal(rowCols, indexes.location >= 0 ? indexes.location : 4, "N/A");
        const jobTypeVal = getColVal(rowCols, indexes.anstellungsart >= 0 ? indexes.anstellungsart : 5, "N/A");

        let status: JobApplication["status"] = "Applied";
        if (statusStr.toLowerCase().includes("interview")) status = "Interviewing";
        else if (statusStr.toLowerCase().includes("reject") || statusStr.toLowerCase().includes("absage")) status = "Rejected";
        else if (statusStr.toLowerCase().includes("offer") || statusStr.toLowerCase().includes("angebot")) status = "Offer";
        else if (statusStr.toLowerCase().includes("receive")) status = "Received";

        parsedApps.push({
          id: String(parsedApps.length + 2),
          company,
          role,
          status,
          date: dateVal,
          location: locationVal,
          anstellungsart: jobTypeVal,
        });
      }

      if (parsedApps.length === 0) {
        triggerToast("error", "Keine Bewerbungen in den Zeilen ausfindig gemacht.");
        return;
      }

      // Merge and set
      setApplications(parsedApps);
      localStorage.setItem("offline_applications", JSON.stringify(parsedApps));
      triggerToast("success", `${parsedApps.length} Bewerbungsdaten erfolgreich aus Dokument geladen.`);

      // Prompt to upload to connected sheet if possible
      if (token && spreadsheetId) {
        const acceptPush = window.confirm(
          `Sie haben die Datei erfolgreich in die App geladen! Möchten Sie diese ${parsedApps.length} Zeilen direkt in Ihre verknüpfte Google-Tabelle importieren?`
        );
        if (acceptPush) {
          triggerToast("success", "Synchronisiere mit Google Tabelle...");
          for (const app of parsedApps) {
            await addJobApplication(token, spreadsheetId, {
              company: app.company,
              role: app.role,
              status: app.status,
              date: app.date,
              location: app.location || "N/A",
              anstellungsart: app.anstellungsart || "N/A",
            });
          }
          triggerToast("success", "Alle importierten Bewerbungen in Google Sheets hinterlegt!");
          await loadApplications();
        }
      }
    } catch (e: any) {
      console.error(e);
      triggerToast("error", "Import fehlgeschlagen: " + e.message);
    }
  };

  // Row update operation
  const handleUpdateStatus = async (rowId: string, newStatus: JobApplication["status"]) => {
    setUpdatingRowId(rowId);
    
    // Warn/Ask for user confirmation as required
    const confirmed = window.confirm(
      `Möchten Sie den Status für diese Bewerbung auf "${newStatus}" ändern?`
    );
    if (!confirmed) {
      setUpdatingRowId(null);
      return;
    }

    try {
      if (token && spreadsheetId) {
        await updateJobApplicationRow(token, spreadsheetId, rowId, { status: newStatus });
        triggerToast("success", "Status in Google-Tabelle geändert.");
        await loadApplications(); // reload
      } else {
        // Offline Update Fallback
        const updated = applications.map(app => app.id === rowId ? { ...app, status: newStatus } : app);
        setApplications(updated);
        localStorage.setItem("offline_applications", JSON.stringify(updated));
        triggerToast("success", "Status lokal aktualisiert.");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("error", `Fehler beim Ändern: ${err.message}`);
    } finally {
      setUpdatingRowId(null);
    }
  };

  // Manual Add Form submission
  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCompany.trim() || !manualRole.trim()) {
      triggerToast("error", "Firma und Stelle sind Pflichtfelder.");
      return;
    }

    setIsSavingManual(true);
    try {
      if (token && spreadsheetId) {
        await addJobApplication(token, spreadsheetId, {
          company: manualCompany.trim(),
          role: manualRole.trim(),
          status: manualStatus,
          date: manualDate,
          location: manualLocation.trim() || "N/A",
          anstellungsart: manualAnstellungsart.trim() || "N/A",
          subject: "Manuelle Erfassung",
          summary: "Manuell im Dashboard registriert",
          suggestedAction: "In Beobachtung",
        });
        triggerToast("success", "Erfolgreich in Google Sheets hinzugefügt.");
        await loadApplications();
      } else {
        // Offline Save Fallback
        const newApp: JobApplication = {
          id: String(Date.now()),
          company: manualCompany.trim(),
          role: manualRole.trim(),
          status: manualStatus,
          date: manualDate,
          location: manualLocation.trim() || "N/A",
          anstellungsart: manualAnstellungsart.trim() || "N/A",
          subject: "Manuelle Erfassung",
          summary: "Manuell im Dashboard registriert",
          suggestedAction: "In Beobachtung",
        };
        const updated = [newApp, ...applications];
        setApplications(updated);
        localStorage.setItem("offline_applications", JSON.stringify(updated));
        triggerToast("success", "Erfolgreich lokal gespeichert.");
      }

      setManualCompany("");
      setManualRole("");
      setManualLocation("Düsseldorf, Germany");
      setManualAnstellungsart("Festanstellung");
      setShowAddForm(false);
    } catch (err: any) {
      console.error(err);
      triggerToast("error", `Fehler beim Hinzufügen: ${err.message}`);
    } finally {
      setIsSavingManual(false);
    }
  };

  // Metrics indicators computed stats
  const metrics = {
    total: applications.length,
    interviewing: applications.filter(app => app.status === "Interviewing").length,
    offers: applications.filter(app => app.status === "Offer").length,
    rejected: applications.filter(app => app.status === "Rejected").length,
  };

  // Render status helper
  const getStatusColorClass = (status: JobApplication["status"]) => {
    switch (status) {
      case "Applied":
        return "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200/80 dark:border-blue-900/50";
      case "Interviewing":
        return "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-350 border-violet-200/80 dark:border-violet-900/50";
      case "Rejected":
        return "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-900/50";
      case "Offer":
        return "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/50";
      case "Received":
        return "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/50";
      default:
        return "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800";
    }
  };

  // Date parsing helper to safely compare dynamic German dates "DD.MM.YYYY" or ISO formats
  const parseDateForSort = (dateStr: any) => {
    if (!dateStr) return 0;
    const trimmed = String(dateStr).trim();
    if (!trimmed) return 0;

    // 1. Check for German or generic DD.MM.YYYY / DD.MM.YY format first
    const ddmmyyyy = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if (ddmmyyyy) {
      let year = parseInt(ddmmyyyy[3]);
      if (year < 100) year += 2000;
      const month = parseInt(ddmmyyyy[2]) - 1;
      const day = parseInt(ddmmyyyy[1]);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    // 2. Check for YYYY-MM-DD
    const yyyymmdd = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
    if (yyyymmdd) {
      const d = new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
      if (!isNaN(d.getTime())) return d.getTime();
    }

    // 3. Try native Date.parse
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) {
      return parsed;
    }

    // 4. Try parsing "DD/MM/YYYY" or "DD-MM-YYYY"
    const slashOrDash = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (slashOrDash) {
      let year = parseInt(slashOrDash[3]);
      if (year < 100) year += 2000;
      const month = parseInt(slashOrDash[2]) - 1;
      const day = parseInt(slashOrDash[1]);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    return 0;
  };

  // Filtered applications computed rows
  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.location && app.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (app.anstellungsart && app.anstellungsart.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterStatus === "All") return matchesSearch;
    return app.status === filterStatus && matchesSearch;
  });

  // Keep final sorted list based on user selections
  const filteredAndSortedApplications = [...filteredApplications].sort((a, b) => {
    switch (sortType) {
      case "date_desc": {
        const diff = parseDateForSort(b.date) - parseDateForSort(a.date);
        if (diff !== 0) return diff;
        // Tie breaker: larger ID (newer row) first
        return (parseInt(b.id) || 0) - (parseInt(a.id) || 0);
      }
      case "date_asc": {
        const diff = parseDateForSort(a.date) - parseDateForSort(b.date);
        if (diff !== 0) return diff;
        // Tie breaker: smaller ID (older row) first
        return (parseInt(a.id) || 0) - (parseInt(b.id) || 0);
      }
      case "company_asc":
        return a.company.localeCompare(b.company);
      case "company_desc":
        return b.company.localeCompare(a.company);
      case "status_asc":
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  // Login page fallback
  if (needsAuth) {
    return (
      <div id="login-container" className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col justify-center py-12 px-6 lg:px-8 transition-colors duration-200">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="mx-auto h-12 w-12 bg-[#2563EB] dark:bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-xl sm:text-2xl font-bold tracking-tight text-[#1E293B] dark:text-slate-100">
            SyncSheet Bewerbungs-Tracker
          </h2>
          <p className="mt-2 text-sm text-[#64748B] dark:text-slate-450 max-w-sm mx-auto">
            Automatisieren Sie die Erfassung Ihrer Bewerbungen aus Gmail in Google Sheets mithilfe von Gemini AI.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-[#111827] py-8 px-6 border border-[#E2E8F0] dark:border-slate-800 rounded-xl shadow-sm transition-colors duration-200">
            <div className="space-y-6">
              <div className="rounded-lg bg-[#EFF6FF] dark:bg-slate-950 p-4 border border-[#DBEAFE] dark:border-slate-800 text-slate-700 dark:text-slate-350 text-xs sm:text-sm space-y-3">
                <div className="font-semibold text-[#1E40AF] dark:text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Optimiert für den deutschen Markt
                </div>
                <p className="text-[#1E293B] dark:text-slate-205 m-0">Durch die Verknüpfung Ihres Google-Kontos führt das Tool folgende Aktionen aus:</p>
                <ul className="list-disc pl-5 space-y-1 text-[#64748B] dark:text-slate-400 text-xs text-left m-0">
                  <li>Durchsucht Ihren Gmail-Posteingang nach Bewerbungsschreiben.</li>
                  <li>Trägt neue Einträge direkt in Ihre Google-Tabelle ein.</li>
                  <li>Analysiert den Status (Applied, Interviewing, Rejected, Offer) und extrahiert Ort & Anstellungsart.</li>
                </ul>
              </div>

              <div className="flex justify-center pt-2">
                <button 
                  id="sign-in-button" 
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full flex justify-center items-center gap-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition duration-150 disabled:opacity-50 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '18px', height: '18px' }}>
                      <path fill="#ffffff" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#ffffff" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#ffffff" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#ffffff" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  )}
                  <span>Anmelden & Starten</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="app-container" className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row font-sans transition-colors duration-200">
      
      {/* Toast Notification Box */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-lg text-sm font-medium ${
              notification.type === "success" 
                ? "bg-[#1E293B] border-[#334155] text-white" 
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR SECTION */}
      <aside className="w-full lg:w-72 bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-[#E2E8F0] dark:border-slate-800 p-6 flex flex-col shrink-0 transition-colors duration-200">
        
        {/* Brand Representation Logo */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-[#2563EB] dark:bg-blue-600 rounded-lg flex items-center justify-center text-white font-black shadow-sm">
              <Mail className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1E293B] dark:text-slate-100 tracking-tight leading-none">SyncSheet</h1>
              <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-mono leading-none">Bewerbungs-Tracker</span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items representation - KIS: Clean menu */}
        <nav className="space-y-1 mb-8">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-[#EFF6FF] dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 cursor-pointer">
            <Table className="h-4 w-4" />
            <span>Verwaltung</span>
          </div>
        </nav>

        {/* Google Spreadsheet link/settings wrapper */}
        <div className="mt-2 pt-5 border-t border-[#E2E8F0] dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Tabelle</span>
            {spreadsheetId ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Verbunden
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Unverknüpft</span>
            )}
          </div>

          {spreadsheetId ? (
            <div className="space-y-3 bg-[#F8FAFC] dark:bg-slate-950 rounded-lg p-3.5 border border-[#E2E8F0] dark:border-slate-800">
              <div className="text-xs font-bold text-[#1E293B] dark:text-slate-100 flex items-center gap-1.5 truncate">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{spreadsheetTitle || "Google Tabelle"}</span>
              </div>
              <div className="text-[9px] font-mono select-all bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-1.5 rounded truncate text-[#64748B] dark:text-slate-400">
                ID: {spreadsheetId}
              </div>
              <a 
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline"
              >
                In Google Drive öffnen <ExternalLink className="h-3 w-3" />
              </a>

              {/* Direct Switch Sheet feature - satisfy "erstelle einen button damit ich andere google sheet auswählen kann" */}
              <button
                type="button"
                onClick={() => {
                  setShowBindInput(!showBindInput);
                  setShowDisconnectConfirm(false);
                }}
                className="w-full text-center py-1.5 text-[11px] font-semibold border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#1E293B] dark:text-slate-200 rounded-md transition duration-150 cursor-pointer flex items-center justify-center gap-1"
              >
                <Link2 className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-400" /> Tabelle wechseln
              </button>

              {showBindInput && (
                <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-800 space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase block">Sheets-ID oder URL</label>
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      placeholder="Neue ID oder URL" 
                      value={customSpreadsheetId}
                      onChange={(e) => setCustomSpreadsheetId(e.target.value)}
                      className="flex-grow bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-mono text-[#1E293B] dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={handleBindCustomSheet}
                      className="bg-[#2563EB] dark:bg-blue-600 text-white hover:bg-blue-700 font-semibold px-2.5 py-1 rounded-lg text-xs flex items-center cursor-pointer shrink-0"
                    >
                      Links
                    </button>
                  </div>
                </div>
              )}

              {/* Secure in-app confirmation workflow for disconnecting */}
              {!showDisconnectConfirm ? (
                <button
                  onClick={() => {
                    setShowDisconnectConfirm(true);
                    setShowBindInput(false);
                  }}
                  className="w-full text-center py-1.5 text-[11px] font-medium border border-red-250 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 hover:bg-red-100/80 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400 rounded-md transition duration-150 cursor-pointer"
                >
                  Verbindung trennen
                </button>
              ) : (
                <div className="pt-2 border-t border-red-100 dark:border-red-900/60 space-y-2 text-center bg-red-50/50 dark:bg-red-950/20 p-2 rounded-lg">
                  <span className="text-[10px] font-bold text-red-700 dark:text-red-400 block leading-tight">Tabelle wirklich trennen?</span>
                  <div className="flex gap-1.5 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSpreadsheetId("");
                        setCustomSpreadsheetId("");
                        localStorage.removeItem(`spreadsheet_${user?.uid}`);
                        setApplications([]);
                        setEmailUpdates([]);
                        setIsInboxScanned(false);
                        localStorage.removeItem("offline_applications");
                        if (user) {
                          localStorage.removeItem(`dismissed_emails_${user.uid}`);
                        }
                        triggerToast("success", "Verbindung getrennt & Dashboard zurückgesetzt.");
                        setShowDisconnectConfirm(false);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded text-[10px] cursor-pointer"
                    >
                      Ja, trennen
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDisconnectConfirm(false)}
                      className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium px-2.5 py-1 rounded text-[10px] cursor-pointer"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[11px] text-[#64748B] dark:text-slate-400 leading-relaxed">
                Verknüpfen Sie eine Tabelle, um Gmail-Daten zu protokollieren.
              </div>

              {/* TWO SEPARATE INTUITIVE BUTTONS */}
              <div className="space-y-2">
                <button
                  onClick={handleCreateSheet}
                  disabled={isCreatingSheet}
                  className="w-full justify-center flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg text-xs shadow-sm transition duration-150 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingSheet ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin text-white" /> Erstelle...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" /> Neue Tabelle erstellen
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowBindInput(!showBindInput)}
                  className="w-full justify-center flex items-center gap-1.5 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 text-[#1E293B] font-medium py-2 px-3 rounded-lg text-xs shadow-sm transition duration-150 cursor-pointer"
                >
                  <Link2 className="h-3.5 w-3.5 text-[#64748B] dark:text-slate-400" /> Bestehende Tabelle verknüpfen
                </button>
              </div>

              {showBindInput && (
                <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-800 space-y-1.5">
                  <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase block">Sheets-URL oder ID eingeben</label>
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      placeholder="Tabellen-ID oder URL" 
                      value={customSpreadsheetId}
                      onChange={(e) => setCustomSpreadsheetId(e.target.value)}
                      className="flex-grow bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#1E293B] dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleBindCustomSheet}
                      className="bg-[#1E293B] dark:bg-blue-600 text-white hover:bg-[#334155] dark:hover:bg-blue-700 font-semibold px-2.5 py-1.5 rounded-lg text-xs flex items-center cursor-pointer"
                    >
                      Binden
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal block">
                    Unterstützt komplette Google-Sheets URLs (aus der Browser-Suchleiste kopiert).
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CSV Import Drag-Drop Zone Card - KIS design */}
        <div className="mt-5 pt-5 border-t border-[#E2E8F0] dark:border-slate-800 space-y-2.5">
          <span className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">Importieren / Excel / CSV</span>
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                const text = await file.text();
                await handleCsvFileParse(text);
              }
            }}
            className="border-2 border-dashed border-[#E2E8F0] dark:border-slate-800 hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-950/40 rounded-xl p-4 text-center cursor-pointer transition relative"
          >
            <input 
              type="file" 
              accept=".csv,.txt"
              onChange={async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const file = e.target.files[0];
                  const text = await file.text();
                  await handleCsvFileParse(text);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <FileSpreadsheet className="h-6 w-6 text-slate-400 dark:text-slate-600 mx-auto mb-1.5" />
            <span className="text-xs font-semibold text-[#1E293B] dark:text-slate-200 block">CSV ablegen</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Klicken zum Upload</span>
          </div>

          {applications.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Möchten Sie alle lokal importierten bzw. offline angezeigten Bewerbungsdaten vom Dashboard löschen?")) {
                  setApplications([]);
                  setEmailUpdates([]);
                  setIsInboxScanned(false);
                  localStorage.removeItem("offline_applications");
                  if (user) {
                    localStorage.removeItem(`dismissed_emails_${user.uid}`);
                  }
                  triggerToast("success", "Importierte Bewerbungen entfernt & Dashboard gelöscht.");
                }
              }}
              className="w-full text-center py-2 text-[11px] font-semibold border border-rose-250 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-md transition duration-150 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trash2 className="h-4 w-4 text-rose-500" /> CSV / Daten entfernen
            </button>
          )}
        </div>

        {/* Account status info card */}
        <div className="mt-auto pt-6 border-t border-[#E2E8F0] dark:border-slate-800">
          <div className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Benutzer</div>
          <div className="font-bold text-sm text-[#1E293B] dark:text-slate-105 mt-1 truncate">{user?.displayName || "Majd Almotaem"}</div>
          <div className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono truncate">{user?.email}</div>
          
          <button 
            id="sign-out-button"
            onClick={handleSignOut}
            className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 border border-[#E2E8F0] dark:border-slate-800 rounded-lg text-xs font-medium text-[#64748B] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition duration-150 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Log Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT SPACE AREA */}
      <main className="flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto">
        
        {!spreadsheetId && (
          <div className="flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl p-4 border border-amber-200 dark:border-amber-900/60 transition-colors">
            <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold m-0">Google-Tabelle nicht verknüpft</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 m-0">
                Bitte erstellen Sie eine neue Google-Tabelle oder verknüpfen Sie ein bestehendes Sheet über die ID oder URL in der linken Seitenleiste, um Ihre Gmail-Nachrichten zu synchronisieren.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic header row */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E293B] dark:text-slate-100 m-0">Übersicht & Automation</h2>
            <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1 m-0">
              Automatische Synchronisation aus Gmail in die Google-Tabelle.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#1E293B] dark:text-slate-200 font-medium py-1.5 px-4 rounded-lg text-sm shadow-sm transition duration-150 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Eintrag hinzufügen
            </button>

            <button
              id="scan-button"
              onClick={handleScanInboxAndAnalyze}
              disabled={isScanning || !spreadsheetId}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-1.5 px-4 rounded-lg text-sm shadow-sm transition duration-150 flex items-center gap-1.5 cursor-pointer"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Analysiere...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Gmail synchronisieren
                </>
              )}
            </button>
          </div>
        </header>

        {/* Elegant statistical widgets grids row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="professional-card p-5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">Verarbeitete Bewerbungen</span>
              <span className="text-3xl font-bold text-[#1E293B] dark:text-slate-100 block mt-2">{applications.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#059669] dark:text-emerald-400 mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block"></span> 
              Tabelle synchron
            </div>
          </div>

          <div className="professional-card p-5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">Aktive Interviews</span>
              <span className="text-3xl font-bold text-amber-600 dark:text-amber-400 block mt-2">{metrics.interviewing}</span>
            </div>
            <div className="text-xs text-[#64748B] dark:text-slate-400 mt-3 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Kalendervorbereitung nötig
            </div>
          </div>

          <div className="professional-card p-5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">Angebote erhalten</span>
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 block mt-2">{metrics.offers}</span>
            </div>
            <div className="text-xs text-[#64748B] dark:text-slate-400 mt-3 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold bg-[#DCFCE7] dark:bg-emerald-950/30 px-2 py-0.5 rounded-full w-max">
              <Sparkles className="w-3.5 h-3.5" /> Herzlichen Glückwunsch!
            </div>
          </div>

          <div className="professional-card p-5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">Absagen</span>
              <span className="text-3xl font-bold text-slate-500 dark:text-slate-400 block mt-2">{metrics.rejected}</span>
            </div>
            <div className="text-xs text-[#64748B] dark:text-slate-400 mt-3 flex items-center gap-1">
              Statistik-Übersicht
            </div>
          </div>

        </div>

        {/* Email parsed updates display widget */}
        {isInboxScanned && (
          <div className="professional-card p-6">
            <div className="border-b border-[#E2E8F0] dark:border-slate-800 pb-4 mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1E293B] dark:text-slate-100 uppercase tracking-wider m-0 flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#2563EB] dark:text-blue-500" />
                Erkannte Bewerbungs-Mails ({emailUpdates.length})
              </h3>
              <span className="text-xs text-[#64748B] dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 px-2 py-0.5 rounded">
                Gefiltert in dieser Sitzung
              </span>
            </div>

            {emailUpdates.length > 0 ? (
              <div className="space-y-4">
                {/* 1. Neue Bewerbung Category */}
                {(() => {
                  const neueBewerbungen = emailUpdates.filter(up => up.classification !== "Statuswechsel");
                  const count = neueBewerbungen.length;
                  return (
                    <div className="border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-hidden bg-[#F8FAFC]/30 dark:bg-slate-900/20">
                      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between bg-[#F8FAFC]/80 dark:bg-slate-900/60 px-4 py-3 border-b border-[#E2E8F0] dark:border-slate-800 gap-2 select-none">
                        <button
                          type="button"
                          onClick={() => setIsNeueExpanded(!isNeueExpanded)}
                          className="flex items-center gap-2 text-xs font-bold text-[#1E293B] dark:text-slate-100 bg-transparent border-none outline-none cursor-pointer"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span>Neue Bewerbung ({count})</span>
                          {isNeueExpanded ? <ChevronUp className="h-4 w-4 text-[#64748B]" /> : <ChevronDown className="h-4 w-4 text-[#64748B]" />}
                        </button>
                        {count > 0 && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRejectAll(neueBewerbungen)}
                              className="text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 font-bold px-2 py-1 rounded-md transition duration-150 cursor-pointer"
                            >
                              Alle verwerfen
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAcceptAll(neueBewerbungen)}
                              className="text-[10px] text-white bg-emerald-600 hover:bg-emerald-700 font-bold px-2 py-1 rounded-md transition duration-150 cursor-pointer"
                            >
                              Alle übernehmen
                            </button>
                          </div>
                        )}
                      </div>

                      {isNeueExpanded && (
                        <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                          {count > 0 ? (
                            neueBewerbungen.map((update, idx) => {
                              const dupMatch = getCompanyMatch(update.company);
                              return (
                                <div key={update.emailId || `neue-${idx}`} className="border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-[#111827] text-left">
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-[#1E293B] dark:text-slate-100">{update.company}</span>
                                        <span className="text-[#64748B] dark:text-slate-555 inline-block">&bull;</span>
                                        <span className="text-xs font-semibold text-[#1E293B] dark:text-slate-205">{update.role}</span>
                                        <span className="text-[#64748B] dark:text-slate-555 inline-block">&bull;</span>
                                        <span className="text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-1">
                                          <MapPin className="h-3 w-3" /> {update.location}
                                        </span>
                                        <span className="text-[#64748B] dark:text-slate-555 inline-block">&bull;</span>
                                        <span className="text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-1">
                                          <Briefcase className="h-3 w-3" /> {update.anstellungsart}
                                        </span>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getStatusColorClass(update.status)}`}>
                                          {update.status}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1.5">Datum: {update.date}</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {update.synced ? (
                                        <span className="text-[#059669] dark:text-[#34D399] px-2.5 py-1 text-xs font-semibold rounded bg-[#DCFCE7] dark:bg-emerald-950/40 flex items-center gap-1">
                                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-450" /> Übernommen
                                        </span>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => handleRefuseEmailUpdate(update.emailId)}
                                            disabled={syncingEmailId === update.emailId}
                                            className="bg-transparent hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 border border-rose-500/20 disabled:opacity-50 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition select-none"
                                          >
                                            <XCircle className="h-3.5 w-3.5" />
                                            Verwerfen
                                          </button>
                                          <button
                                            onClick={() => handleAcceptEmailChange(update)}
                                            disabled={syncingEmailId === update.emailId}
                                            className="bg-[#2563EB] hover:bg-blue-700 text-white disabled:opacity-50 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition select-none"
                                          >
                                            {syncingEmailId === update.emailId ? (
                                              <RefreshCw className="h-3 w-3 animate-spin text-white" />
                                            ) : (
                                              <FileSpreadsheet className="h-3.5 w-3.5" />
                                            )}
                                            {dupMatch ? "Trotzdem anlegen" : "Eintragen"}
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {dupMatch && (
                                    <div className="mb-3 text-xs flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                      <span>
                                        Eintrag existiert bereits mit Rolle: "{dupMatch.role}". Bitte prüfen Sie Duplikate vor Freigabe.
                                      </span>
                                    </div>
                                  )}

                                  <div className="bg-white dark:bg-slate-950 rounded-lg p-3 text-xs text-[#1E293B] dark:text-slate-200 space-y-1.5 border border-[#E2E8F0] dark:border-slate-800">
                                    <div>
                                      <span className="font-bold text-[#64748B] dark:text-slate-400">Betreff:</span> <span className="font-medium">{update.subject}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-[#64748B] dark:text-slate-400">Zusammenfassung:</span> <span className="italic">"{update.summary}"</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-[#64748B] dark:text-slate-400">Empfohlene Aktion:</span> <span className="text-[#2563EB] dark:text-blue-400 font-semibold">{update.suggestedAction}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-4">Keine Mails in dieser Kategorie.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2. Statusänderung Category */}
                {(() => {
                  const statusAenderungen = emailUpdates.filter(up => up.classification === "Statuswechsel");
                  const count = statusAenderungen.length;
                  return (
                    <div className="border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-hidden bg-[#F8FAFC]/30 dark:bg-slate-900/20">
                      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between bg-[#F8FAFC]/80 dark:bg-slate-900/60 px-4 py-3 border-b border-[#E2E8F0] dark:border-slate-800 gap-2 select-none">
                        <button
                          type="button"
                          onClick={() => setIsStatusExpanded(!isStatusExpanded)}
                          className="flex items-center gap-2 text-xs font-bold text-[#1E293B] dark:text-slate-100 bg-transparent border-none outline-none cursor-pointer"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                          <span>Statusänderung ({count})</span>
                          {isStatusExpanded ? <ChevronUp className="h-4 w-4 text-[#64748B]" /> : <ChevronDown className="h-4 w-4 text-[#64748B]" />}
                        </button>
                        {count > 0 && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRejectAll(statusAenderungen)}
                              className="text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 font-bold px-2 py-1 rounded-md transition duration-150 cursor-pointer"
                            >
                              Alle verwerfen
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAcceptAll(statusAenderungen)}
                              className="text-[10px] text-white bg-[#2563EB] hover:bg-blue-700 font-bold px-2 py-1 rounded-md transition duration-150 cursor-pointer"
                            >
                              Alle übernehmen
                            </button>
                          </div>
                        )}
                      </div>

                      {isStatusExpanded && (
                        <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                          {count > 0 ? (
                            statusAenderungen.map((update, idx) => {
                              const dupMatch = getCompanyMatch(update.company);
                              return (
                                <div key={update.emailId || `status-${idx}`} className="border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-[#111827] text-left">
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-[#1E293B] dark:text-slate-100">{update.company}</span>
                                        <span className="text-[#64748B] dark:text-slate-555 inline-block">&bull;</span>
                                        <span className="text-xs font-semibold text-[#1E293B] dark:text-slate-205">{update.role}</span>
                                        <span className="text-[#64748B] dark:text-slate-555 inline-block">&bull;</span>
                                        <span className="text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-1">
                                          <MapPin className="h-3 w-3" /> {update.location}
                                        </span>
                                        <span className="text-[#64748B] dark:text-slate-555 inline-block">&bull;</span>
                                        <span className="text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-1">
                                          <Briefcase className="h-3 w-3" /> {update.anstellungsart}
                                        </span>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getStatusColorClass(update.status)}`}>
                                          {update.status}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1.5">Datum: {update.date}</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {update.synced ? (
                                        <span className="text-[#059669] dark:text-[#34D399] px-2.5 py-1 text-xs font-semibold rounded bg-[#DCFCE7] dark:bg-emerald-950/40 flex items-center gap-1">
                                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-450" /> Übernommen
                                        </span>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => handleRefuseEmailUpdate(update.emailId)}
                                            disabled={syncingEmailId === update.emailId}
                                            className="bg-transparent hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 border border-rose-500/20 disabled:opacity-50 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition select-none"
                                          >
                                            <XCircle className="h-3.5 w-3.5" />
                                            Verwerfen
                                          </button>
                                          <button
                                            onClick={() => handleAcceptEmailChange(update)}
                                            disabled={syncingEmailId === update.emailId}
                                            className="bg-[#2563EB] hover:bg-blue-700 text-white disabled:opacity-50 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition select-none"
                                          >
                                            {syncingEmailId === update.emailId ? (
                                              <RefreshCw className="h-3 w-3 animate-spin text-white" />
                                            ) : (
                                              <FileSpreadsheet className="h-3.5 w-3.5" />
                                            )}
                                            {dupMatch ? "Status übernehmen" : "Eintragen"}
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {dupMatch && (
                                    <div className="mb-3 text-xs flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                      <span>
                                        Bestehender Eintrag gefunden (Status: "{dupMatch.status}"). Klick auf "Status übernehmen" setzt Status auf "{update.status}".
                                      </span>
                                    </div>
                                  )}

                                  <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-3 text-xs text-[#1E293B] dark:text-slate-200 space-y-1.5 border border-[#E2E8F0] dark:border-slate-800">
                                    <div>
                                      <span className="font-bold text-[#64748B] dark:text-slate-400">Betreff:</span> <span className="font-medium">{update.subject}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-[#64748B] dark:text-slate-400">Zusammenfassung:</span> <span className="italic">"{update.summary}"</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-[#64748B] dark:text-slate-400">Empfohlene Aktion:</span> <span className="text-[#2563EB] dark:text-blue-400 font-semibold">{update.suggestedAction}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-4">Keine Mails in dieser Kategorie.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-10 rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-800 text-[#64748B] dark:text-slate-450 bg-[#F8FAFC]/55 dark:bg-slate-900/20">
                <Sparkles className="h-7 w-7 mx-auto mb-2.5 text-slate-350 dark:text-slate-650 animate-pulse" />
                <p className="text-xs font-semibold text-[#1E293B] dark:text-slate-200">Keine neuen Bewerbungs-Mails gefunden</p>
              </div>
            )}
          </div>
        )}

        {/* Global Trackings list datatable grid */}
        <div id="grid-table-container" className="professional-card p-6">
          
          {/* Header title controller and Search bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-[#E2E8F0] dark:border-slate-800 gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#1E293B] dark:text-slate-100 uppercase tracking-wider m-0 flex items-center gap-2">
                <Table className="h-4.5 w-4.5 text-[#2563EB] dark:text-blue-400" /> Aktuelle Bewerbungsdatenbank
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 m-0">
                Die Auswahl eines neuen Status aktualisiert direkt die Zeile in Ihrer Google-Tabelle.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
                <input 
                  type="text" 
                  placeholder="Firma oder Stelle filtern..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg text-xs text-[#1E293B] dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500 w-[200px]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-[#64748B] dark:text-slate-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 py-1 px-2.5 rounded-lg text-xs text-[#1E293B] dark:text-slate-200 font-medium cursor-pointer focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
                >
                  <option value="All">Alle Status</option>
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offer">Offers</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#64748B] dark:text-slate-400 font-medium">Sortieren:</span>
                <select
                  value={sortType}
                  onChange={(e) => setSortType(e.target.value as any)}
                  className="bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 py-1 px-2.5 rounded-lg text-xs text-[#1E293B] dark:text-slate-205 font-medium cursor-pointer focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
                >
                  <option value="date_desc">Neueste zuerst</option>
                  <option value="date_asc">Älteste zuerst</option>
                  <option value="company_asc">Unternehmen (A-Z)</option>
                  <option value="company_desc">Unternehmen (Z-A)</option>
                  <option value="status_asc">Status</option>
                </select>
              </div>
            </div>
          </div>

          {/* Manual Entry Collapsible Form drawer component */}
          {showAddForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleManualAddSubmit}
              className="bg-[#F8FAFC] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 mb-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-[#64748B] dark:text-slate-400 tracking-wider m-0">Bewerbung manuell erfassen</h3>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-semibold text-[#2563EB] dark:text-blue-405 hover:underline"
                >
                  Schließen
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B] dark:text-slate-400 block">Unternehmen *</label>
                  <input 
                    type="text" 
                    placeholder="z.B. FINOVESTA GmbH" 
                    value={manualCompany}
                    required
                    onChange={(e) => setManualCompany(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B] dark:text-slate-400 block">Stelle / Rolle *</label>
                  <input 
                    type="text" 
                    placeholder="z.B. Softwareentwickler" 
                    value={manualRole}
                    required
                    onChange={(e) => setManualRole(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B] dark:text-slate-400 block">Anstellungsart</label>
                  <input 
                    type="text" 
                    placeholder="z.B. Festanstellung / Vollzeit" 
                    value={manualAnstellungsart}
                    onChange={(e) => setManualAnstellungsart(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B] dark:text-slate-400 block">Standort</label>
                  <input 
                    type="text" 
                    placeholder="z.B. Düsseldorf, Germany" 
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B] dark:text-slate-400 block">Status</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as JobApplication["status"])}
                    className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-slate-200 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
                  >
                    <option value="Applied">Applied</option>
                    <option value="Interviewing">Interviewing</option>
                    <option value="Offer">Offer</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B] dark:text-slate-400 block">Datum</label>
                  <input 
                    type="date" 
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-slate-200 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSavingManual}
                  className="bg-[#2563EB] hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition"
                >
                  {isSavingManual ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : spreadsheetId ? (
                    "In Google Sheets speichern"
                  ) : (
                    "Lokal speichern"
                  )}
                </button>
              </div>
            </motion.form>
          )}

          {/* Grid table view */}
          {isFetchingApps ? (
            <div className="text-center py-12">
              <RefreshCw className="h-7 w-7 text-[#2563EB] dark:text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium">Bewerbungsdaten werden geladen...</p>
            </div>
          ) : (spreadsheetId || applications.length > 0) ? (
            filteredAndSortedApplications.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="professional-table-header border-b border-[#E2E8F0] dark:border-slate-800/80">
                      <th className="p-3 text-center w-12 bg-slate-50/20 dark:bg-slate-900/10">Zeile</th>
                      <th className="p-3">Unternehmen</th>
                      <th className="p-3">Stelle / Rolle</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 w-32">Bewerbungsdatum</th>
                      <th className="p-3">Standort</th>
                      <th className="p-3">Anstellungsart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60">
                    {filteredAndSortedApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-[#F8FAFC]/55 dark:hover:bg-slate-850/40 bg-white dark:bg-[#111827] transition-colors">
                        <td className="p-3.5 text-center font-mono text-[10px] text-[#64748B] dark:text-slate-400 font-bold bg-[#F8FAFC]/50 dark:bg-slate-900/40 border-r border-[#E2E8F0] dark:border-slate-800">{app.id}</td>
                        <td className="p-3.5 font-bold text-[#1E293B] dark:text-slate-100">{app.company}</td>
                        <td className="p-3.5 font-medium text-[#64748B] dark:text-slate-300">{app.role}</td>
                        <td className="p-3.5">
                          {updatingRowId === app.id ? (
                            <div className="flex items-center gap-1 font-semibold text-slate-400 py-1">
                              <RefreshCw className="h-3 w-3 animate-spin text-slate-450" /> Speichere...
                            </div>
                          ) : (
                            <div className="relative inline-block w-full text-[#1E293B] dark:text-slate-200">
                              <select
                                value={app.status || "Applied"}
                                onChange={(e) => handleUpdateStatus(app.id, e.target.value as JobApplication["status"])}
                                className={`w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md text-xs font-semibold focus:outline-none cursor-pointer text-slate-800 dark:text-slate-200 ${getStatusColorClass(app.status)}`}
                              >
                                <option value="Applied" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Applied</option>
                                <option value="Interviewing" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Interviewing</option>
                                <option value="Offer" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Offer</option>
                                <option value="Rejected" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Rejected</option>
                              </select>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-[#64748B] dark:text-slate-350 font-medium">{app.date}</td>
                        <td className="p-3.5 text-[#64748B] dark:text-slate-350 font-medium">{app.location || "N/A"}</td>
                        <td className="p-3.5 text-[#64748B] dark:text-slate-350 font-medium">{app.anstellungsart || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-[#F8FAFC]/50 dark:bg-slate-900/10 border border-dashed border-[#E2E8F0] dark:border-slate-800 rounded-xl">
                <Table className="h-8 w-8 text-slate-350 dark:text-slate-650 mx-auto mb-2.5" />
                <p className="text-xs font-semibold text-[#1E293B] dark:text-slate-200">Keine Einträge für diese Filter</p>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-normal max-w-sm mx-auto mt-0.5">
                  Geben Sie einen anderen Suchbegriff ein oder ändern Sie den Statusfilter.
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-12 bg-[#F8FAFC]/50 dark:bg-slate-900/10 border border-dashed border-[#E2E8F0] dark:border-slate-800 rounded-xl">
              <FileSpreadsheet className="h-9 w-9 text-slate-300 dark:text-slate-600 mx-auto mb-2.5 animate-bounce" />
              <p className="text-xs font-semibold text-[#1E293B] dark:text-slate-200">Google Sheets Verbindung nötig</p>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-normal max-w-md mx-auto mt-0.5">
                Verknüpfen Sie eine vorhandene Google-Tabelle über die ID oder erstellen Sie eine neue über die Seitenleiste.
              </p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
