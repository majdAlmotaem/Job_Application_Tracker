import React, { useEffect, useState, useRef } from "react";
import { User } from "firebase/auth";
import {
  Sparkles,
  Mail,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  ExternalLink,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Table,
  MapPin,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Trash2,
  MoreVertical,
  Upload,
  Download,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { searchGmailMessages } from "../services/gmailService";
import { JobApplication, EmailUpdate } from "../types";
import { JobTable } from "../components/JobTable";
import { StatsDashboard } from "../components/StatsDashboard";

interface MatchableEntity {
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

export function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface InterviewReminder {
  id: string;
  applicationId: string;
  company: string;
  date: string;
  tableName: string;
}

interface PendingTab {
  key: string;
  label: string;
}

interface JobTrackerPageProps {
  user: User | null;
  token: string | null;
  googleSignIn: () => Promise<any>;
  triggerToast: (type: "success" | "error", message: string) => void;
  triggerConfirm: (options: {
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  }) => void;
  selectedTable: string;
  setSelectedTable: (table: string) => void;
  availableTables: string[];
  /** Tabs created in the UI that don't exist in the DB yet */
  pendingTabs: PendingTab[];
  setPendingTabs: React.Dispatch<React.SetStateAction<PendingTab[]>>;
  loadTables: () => Promise<void>;
  onRequestNewTab: () => void;
  dailyGoal: number;
  setDailyGoal: (goal: number) => void;
}

export const JobTrackerPage: React.FC<JobTrackerPageProps> = ({
  user,
  token,
  googleSignIn,
  triggerToast,
  triggerConfirm,
  selectedTable,
  setSelectedTable,
  availableTables,
  pendingTabs,
  setPendingTabs,
  loadTables,
  onRequestNewTab,
  dailyGoal,
  setDailyGoal,
}) => {
  // Is the currently selected tab a pending (not-yet-saved) tab?
  const isPendingTab = pendingTabs.some((pt) => pt.key === selectedTable);
  const pendingTabLabel = pendingTabs.find((pt) => pt.key === selectedTable)?.label ?? selectedTable;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Rename modal — used to name/rename a pending tab before committing to DB
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Interview Reminder states
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reminderAppId, setReminderAppId] = useState("");
  const [reminders, setReminders] = useState<InterviewReminder[]>(() => {
    const saved = localStorage.getItem("syncsheet_interview_reminders");
    return saved ? JSON.parse(saved) : [];
  });

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFileSelected, setExportFileSelected] = useState<string>("job_applications");
  
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [isFetchingApps, setIsFetchingApps] = useState(false);
  const [gmailQuery] = useState<string>(
    'Bewerbung OR Interview OR Absage OR Vertrag OR Stelle OR Softwareentwickler OR Webentwickler OR candidate OR "vielen Dank für Ihre Bewerbung"'
  );
  const [emailUpdates, setEmailUpdates] = useState<EmailUpdate[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncPhase, setSyncPhase] = useState("Gmail-Postfach durchsuchen...");
  const [syncDetails, setSyncDetails] = useState("Hole E-Mails aus Ihrem Gmail-Postfach...");
  const [isInboxScanned, setIsInboxScanned] = useState<boolean>(false);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualCompany, setManualCompany] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualLocation, setManualLocation] = useState("Düsseldorf, Germany");
  const [manualAnstellungsart, setManualAnstellungsart] = useState("Festanstellung");
  const [manualStatus, setManualStatus] = useState<JobApplication["status"]>("Applied");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isSavingManual, setIsSavingManual] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [sortType, setSortType] = useState<string>("date_desc");


  
  const [syncingEmailId, setSyncingEmailId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [draftChanges, setDraftChanges] = useState<Record<string, Partial<JobApplication>>>({});
  const [isSavingDrafts, setIsSavingDrafts] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isNeueExpanded, setIsNeueExpanded] = useState<boolean>(true);
  const [isStatusExpanded, setIsStatusExpanded] = useState<boolean>(true);
  const [expandedEmailIds, setExpandedEmailIds] = useState<string[]>([]);
  
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    select: 48,
    id: 56,
    company: 180,
    role: 180,
    status: 150,
    date: 130,
    location: 160,
    anstellungsart: 150,
  });

  const startResize = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[column] || 150;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setColumnWidths((prev) => ({
        ...prev,
        [column]: Math.max(60, startWidth + deltaX),
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    if (isPendingTab) {
      // Don't fetch from DB — pending tab has no data yet
      setApplications([]);
    } else {
      loadApplications(selectedTable);
    }
  }, [selectedTable, isPendingTab]);

  // Dynamic Reminder Pruning and auto-sync
  const todayStrForReminders = getLocalDateString();
  const activeReminders = reminders.filter(rem => {
    if (rem.tableName !== selectedTable) return false;
    if (rem.date < todayStrForReminders) return false;
    const linkedApp = applications.find(app => app.id === rem.applicationId);
    if (!linkedApp || linkedApp.status !== "Interview") return false;
    return true;
  });

  useEffect(() => {
    const todayStr = getLocalDateString();
    
    // 1. Get all interview reminders from the loaded applications in the DB
    const dbReminders = applications
      .filter(app => app.status === "Interview" && app.interview_date && app.interview_date >= todayStr)
      .map(app => ({
        id: `db-${app.id}`,
        applicationId: app.id,
        company: app.company,
        date: app.interview_date!,
        tableName: selectedTable,
      }));

    // 2. Start with reminders from other tables
    const otherTablesReminders = reminders.filter(r => r.tableName !== selectedTable && r.date >= todayStr);

    // 3. For the current table, merge dbReminders and activeReminders from localStorage
    const currentTableActiveLocal = reminders.filter(r => r.tableName === selectedTable && r.date >= todayStr);
    
    const mergedCurrentTableReminders: InterviewReminder[] = [...dbReminders];
    currentTableActiveLocal.forEach(localRem => {
      const linkedApp = applications.find(app => app.id === localRem.applicationId);
      if (linkedApp && linkedApp.status === "Interview") {
        const alreadyInMerged = mergedCurrentTableReminders.some(r => r.applicationId === localRem.applicationId);
        if (!alreadyInMerged) {
          mergedCurrentTableReminders.push(localRem);
          // Async save to database
          fetch(`/api/applications/${localRem.applicationId}?table_name=${encodeURIComponent(selectedTable)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ interview_date: localRem.date })
          }).catch(console.error);
        }
      }
    });

    const prunedAll = [...otherTablesReminders, ...mergedCurrentTableReminders];
    
    // Prevent infinite loop by checking if values are actually different
    const stringify = (arr: any[]) => JSON.stringify(arr.map(r => ({ id: r.applicationId, date: r.date, table: r.tableName })).sort((a,b) => a.id.localeCompare(b.id)));
    if (stringify(prunedAll) !== stringify(reminders)) {
      setReminders(prunedAll);
      localStorage.setItem("syncsheet_interview_reminders", JSON.stringify(prunedAll));
    }
  }, [applications, selectedTable]);

  const handleSaveReminder = async () => {
    if (!reminderAppId || !reminderDate) {
      triggerToast("error", "Bitte wählen Sie ein Datum und eine Firma aus.");
      return;
    }
    const linkedApp = applications.find(app => app.id === reminderAppId);
    if (!linkedApp) return;

    try {
      const response = await fetch(`/api/applications/${reminderAppId}?table_name=${encodeURIComponent(selectedTable)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interview_date: reminderDate })
      });
      if (!response.ok) throw new Error("Failed to save to DB");
      const updatedApp = await response.json();
      setApplications(prev => prev.map(app => app.id === reminderAppId ? updatedApp : app));

      const newReminder: InterviewReminder = {
        id: Math.random().toString(36).substr(2, 9),
        applicationId: reminderAppId,
        company: linkedApp.company,
        date: reminderDate,
        tableName: selectedTable,
      };

      const updatedReminders = [...reminders, newReminder];
      setReminders(updatedReminders);
      localStorage.setItem("syncsheet_interview_reminders", JSON.stringify(updatedReminders));
      setReminderModalOpen(false);
      triggerToast("success", `Erinnerung für ${linkedApp.company} am ${reminderDate} hinzugefügt.`);
    } catch (err) {
      triggerToast("error", "Fehler beim Speichern in der Datenbank.");
    }
  };

  const handleDeleteReminder = async (id: string) => {
    const rem = reminders.find(r => r.id === id);
    if (rem) {
      try {
        await fetch(`/api/applications/${rem.applicationId}?table_name=${encodeURIComponent(selectedTable)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interview_date: null })
        });
        setApplications(prev => prev.map(app => app.id === rem.applicationId ? { ...app, interview_date: undefined } : app));
      } catch (err) {
        console.error("Failed to clear interview_date in DB:", err);
      }
    }
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    localStorage.setItem("syncsheet_interview_reminders", JSON.stringify(updated));
    triggerToast("success", "Terminerinnerung gelöscht.");
  };

  // After saving data to a pending tab it becomes real → remove from pendingTabs
  const promotePendingTab = () => {
    if (isPendingTab) {
      setPendingTabs((prev) => prev.filter((pt) => pt.key !== selectedTable));
    }
  };

  // Rename — works for pending tabs (state only) and real DB tables (API call)
  const handleRenameConfirm = async () => {
    const newLabel = renameValue.trim();
    if (!newLabel) return;
    let newKey = newLabel.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (newKey.match(/^\d/)) newKey = "_" + newKey;
    if (!newKey) return;

    if (isPendingTab) {
      // No DB entry yet — just update state
      if (availableTables.includes(newKey) || pendingTabs.some((pt) => pt.key === newKey && pt.key !== selectedTable)) {
        triggerToast("error", "Dieser Name ist bereits vergeben.");
        return;
      }
      setPendingTabs((prev) =>
        prev.map((pt) => (pt.key === selectedTable ? { key: newKey, label: newLabel } : pt))
      );
      setSelectedTable(newKey);
      setRenameModalOpen(false);
    } else {
      // Real DB table — call backend rename API
      try {
        const response = await fetch(
          `/api/applications/tables/${encodeURIComponent(selectedTable)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ new_name: newLabel }),
          }
        );
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          triggerToast("error", err.detail || "Umbenennen fehlgeschlagen.");
          return;
        }
        const data = await response.json();
        setSelectedTable(data.new_name);
        setRenameModalOpen(false);
        await loadTables();
        triggerToast("success", `Liste in "${newLabel}" umbenannt.`);
      } catch {
        triggerToast("error", "Umbenennen fehlgeschlagen.");
      }
    }
  };

  // Close action menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatTableName = (name: string) => {
    const pending = pendingTabs.find((pt) => pt.key === name);
    if (pending) return pending.label;
    if (name === "job_applications") return "Standard-Tabelle";
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const loadApplications = async (tableName: string = selectedTable) => {
    setIsFetchingApps(true);
    try {
      const response = await fetch(`/api/applications?table_name=${encodeURIComponent(tableName)}`);
      if (!response.ok) throw new Error("Failed to load applications");
      const apps = await response.json();
      setApplications(apps);
    } catch (err: any) {
      triggerToast("error", `Fehler beim Laden: ${err.message}`);
    } finally {
      setIsFetchingApps(false);
    }
  };

  const getCompanyMatch = (companyName: string) => {
    if (!companyName) return null;
    return applications.find(app => isSimilarCompany(app.company, companyName));
  };

  const handleScanInboxAndAnalyze = async () => {
    let currentToken = token;
    if (!currentToken) {
      setIsScanning(true);
      setSyncProgress(2);
      setSyncPhase("Google Authentifizierung...");
      setSyncDetails("Bitte authentifizieren Sie sich über das Google Popup...");
      try {
        const authResult = await googleSignIn();
        if (authResult) {
          currentToken = authResult.accessToken;
          triggerToast("success", "Erfolgreich mit Google verbunden.");
        } else {
          setIsScanning(false);
          return;
        }
      } catch (err: any) {
        console.error(err);
        triggerToast("error", err.message || "Authentifizierung fehlgeschlagen.");
        setIsScanning(false);
        return;
      }
    }

    setIsScanning(true);
    setSyncProgress(5);
    setSyncPhase("Gmail-Postfach durchsuchen...");
    setSyncDetails("Verbindung mit Gmail wird hergestellt...");
    let progressInterval: any;
    try {
      const messages = await searchGmailMessages(currentToken!, gmailQuery, 15);
      const totalEmails = messages.length;
      
      if (totalEmails === 0) {
        setSyncProgress(100);
        setSyncPhase("Keine E-Mails gefunden.");
        setSyncDetails("Es wurden keine neuen E-Mails in Ihrem Postfach gefunden.");
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsScanning(false);
        setIsInboxScanned(true);
        setEmailUpdates([]);
        triggerToast("success", "Keine E-Mails gefunden.");
        return;
      }

      setSyncProgress(15);
      setSyncPhase("E-Mails analysieren...");
      const numChunks = Math.ceil(totalEmails / 5);
      setSyncDetails(`Gefunden: ${totalEmails} E-Mails. Analysiere in ${numChunks} Blöcken via Gemini...`);

      // Start progress simulation interval
      let currentProgress = 15;
      const estSeconds = Math.max(15, numChunks * 20); // ca 20s per chunk
      const intervalMs = 300;
      const totalSteps = (estSeconds * 1000) / intervalMs;
      const stepIncrement = (95 - 15) / totalSteps;

      progressInterval = setInterval(() => {
        currentProgress += stepIncrement + (Math.random() * 0.05);
        if (currentProgress >= 95) {
          currentProgress = 95;
          setSyncDetails("Antwort wird finalisiert. Gleich fertig...");
        } else {
          // Update details based on progress range
          if (currentProgress < 40) {
            setSyncDetails(`Analysiere E-Mails (Block 1/${numChunks})...`);
          } else if (currentProgress < 70) {
            const currentBlock = Math.min(numChunks, 2);
            setSyncDetails(`Extrahiere Firmen und Bewerbungsstatus (Block ${currentBlock}/${numChunks})...`);
          } else {
            const currentBlock = Math.min(numChunks, numChunks);
            setSyncDetails(`Ergebnisse werden strukturiert (Block ${currentBlock}/${numChunks})...`);
          }
        }
        setSyncProgress(currentProgress);
      }, intervalMs);

      const response = await fetch("/api/analyze-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: messages }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Fehler bei der E-Mail-Analyse");
      }

      const backendData = await response.json();
      const updates: EmailUpdate[] = backendData.results.map((result: any) => {
        const raw = messages.find(m => m.id === result.emailId) || { subject: "(Kein Betreff)", snippet: "", body: "", date: new Date().toLocaleDateString() };
        return { ...result, subject: raw.subject, snippet: raw.snippet, body: raw.body || "", date: raw.date, synced: false };
      });

      let dismissedList: string[] = [];
      if (user) {
        dismissedList = JSON.parse(localStorage.getItem(`dismissed_emails_${user.uid}`) || "[]");
      }

      const filteredUpdates = updates.filter(up => {
        if (!up.isJobRelated) return false;
        if (applications.some(app => app.emailId === up.emailId)) return false;
        if (dismissedList.includes(up.emailId)) return false;
        const fuzzyDuplicate = applications.find(app => isFuzzyDuplicate(app, up));
        if (fuzzyDuplicate && up.classification !== "Statuswechsel") return false;
        if (fuzzyDuplicate && fuzzyDuplicate.status.toLowerCase() === up.status.toLowerCase()) return false;
        return true;
      });

      setSyncProgress(100);
      setSyncPhase("Synchronisierung erfolgreich!");
      setSyncDetails(`Analyse abgeschlossen. ${filteredUpdates.length} relevante Updates geladen.`);
      
      setEmailUpdates(filteredUpdates);
      setIsInboxScanned(true);
      triggerToast("success", `${filteredUpdates.length} Updates gefunden.`);
      await new Promise(resolve => setTimeout(resolve, 1200));
      setIsScanning(false);
    } catch (err: any) {
      if (progressInterval) clearInterval(progressInterval);
      setSyncProgress(0);
      setSyncPhase("Fehler bei der Synchronisierung");
      setSyncDetails(err.message || "Fehler beim E-Mail Scan.");
      triggerToast("error", err.message || "Fehler beim Scan.");
      await new Promise(resolve => setTimeout(resolve, 3000));
      setIsScanning(false);
    }
  };

  const handleAcceptEmailChange = async (update: EmailUpdate) => {
    setSyncingEmailId(update.emailId);
    try {
      const match = getCompanyMatch(update.company);
      if (update.classification === "Statuswechsel" && match) {
        const response = await fetch(`/api/applications/${match.id}?table_name=${encodeURIComponent(selectedTable)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: update.status })
        });
        if (!response.ok) throw new Error("Failed to update status");
        const updatedApp = await response.json();
        const updated = applications.map(app => app.id === match.id ? updatedApp : app);
        setApplications(updated);
      } else {
        const newApp = {
          company: update.company,
          role: update.role,
          status: update.status,
          date: update.date,
          location: update.location || "N/A",
          anstellungsart: update.anstellungsart || "N/A",
          emailId: update.emailId,
          source_file: selectedTable
        };
        const response = await fetch(`/api/applications?table_name=${encodeURIComponent(selectedTable)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newApp)
        });
        if (!response.ok) throw new Error("Failed to create application");
        const savedApp = await response.json();
        setApplications([savedApp, ...applications]);
      }
      update.synced = true;
      setEmailUpdates([...emailUpdates]);
      triggerToast("success", "Erfolgreich übernommen.");
    } catch (err: any) {
      triggerToast("error", "Fehler beim Übernehmen.");
    } finally {
      setSyncingEmailId(null);
    }
  };

  const handleRefuseEmailUpdate = (emailId: string) => {
    setEmailUpdates(prev => prev.map(up => up.emailId === emailId ? { ...up, dismissed: true } : up));
    if (user) {
      const dismissed = JSON.parse(localStorage.getItem(`dismissed_emails_${user.uid}`) || "[]");
      dismissed.push(emailId);
      localStorage.setItem(`dismissed_emails_${user.uid}`, JSON.stringify(dismissed));
    }
    triggerToast("success", "Vorschlag verworfen.");
  };

  const handleUndoRefuseEmailUpdate = (emailId: string) => {
    setEmailUpdates(prev => prev.map(up => up.emailId === emailId ? { ...up, dismissed: false } : up));
    if (user) {
      const dismissed = JSON.parse(localStorage.getItem(`dismissed_emails_${user.uid}`) || "[]");
      const filtered = dismissed.filter((id: string) => id !== emailId);
      localStorage.setItem(`dismissed_emails_${user.uid}`, JSON.stringify(filtered));
    }
    triggerToast("success", "Vorschlag wiederhergestellt.");
  };

  const handleAcceptAll = async (updatesToAccept: EmailUpdate[]) => {
    triggerConfirm({
      title: "Alle übernehmen",
      message: "Möchten Sie alle sichtbaren Einträge dieser Kategorie übernehmen?",
      confirmText: "Bestätigen",
      type: "info",
      onConfirm: async () => {
        for (const up of updatesToAccept) await handleAcceptEmailChange(up);
        triggerToast("success", "Alle übernommen.");
      }
    });
  };

  const handleRejectAll = (updatesToReject: EmailUpdate[]) => {
    triggerConfirm({
      title: "Alle verwerfen",
      message: "Möchten Sie alle sichtbaren Einträge dieser Kategorie verwerfen?",
      confirmText: "Verwerfen",
      type: "danger",
      onConfirm: () => {
        updatesToReject.forEach(up => handleRefuseEmailUpdate(up.emailId));
        triggerToast("success", "Alle verworfen.");
      }
    });
  };

  const handleImportSubmit = async () => {
    if (!pendingFile || !importFileName.trim()) return;
    const cleanName = importFileName.trim();
    setImportModalOpen(false);

    const formData = new FormData();
    formData.append("file", pendingFile);

    try {
      const response = await fetch(`/api/csv/upload?table_name=${encodeURIComponent(cleanName)}`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      triggerToast("success", `"${cleanName}" wurde erfolgreich importiert.`);

      let sanitized = cleanName.toLowerCase();
      if (sanitized.endsWith(".csv")) sanitized = sanitized.slice(0, -4);
      sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, "_");
      if (sanitized && sanitized.match(/^\d/)) sanitized = "_" + sanitized;
      if (!sanitized) sanitized = "job_applications";

      promotePendingTab();
      setSelectedTable(sanitized);
      setPendingFile(null);
      await loadTables();
      await loadApplications(sanitized);
    } catch (e) {
      triggerToast("error", "CSV Import fehlgeschlagen.");
      setPendingFile(null);
    }
  };

  const handleCsvDownload = async (tableNameToExport: string) => {
    try {
      const response = await fetch(`/api/csv/download?table_name=${encodeURIComponent(tableNameToExport)}`);
      if (!response.ok) {
        if (response.status === 400) {
          triggerToast("error", "Export fehlgeschlagen: Diese Tabelle enthält keine Daten.");
          return;
        }
        throw new Error("Download failed");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tableNameToExport}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      triggerToast("success", `CSV "${tableNameToExport}.csv" erfolgreich exportiert.`);
    } catch (e) {
      triggerToast("error", "CSV Export fehlgeschlagen.");
    }
  };

  const handleDeleteTable = () => {
    const isDefault = selectedTable === "job_applications";
    const activeListName = formatTableName(selectedTable);
    
    triggerConfirm({
      title: isDefault ? "Tabelle leeren" : "Tabelle löschen",
      message: isDefault
        ? `Möchten Sie wirklich alle Bewerbungen aus der Tabelle "${activeListName}" leeren? Diese Aktion kann nicht rückgängig gemacht werden.`
        : `Möchten Sie wirklich die gesamte Tabelle "${activeListName}" löschen? Dies entfernt sie dauerhaft aus der Datenbank.`,
      confirmText: isDefault ? "Tabelle leeren" : "Tabelle löschen",
      type: "danger",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/applications/tables/${encodeURIComponent(selectedTable)}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error();
          
          if (isDefault) {
            triggerToast("success", `Daten aus "${activeListName}" gelöscht.`);
            await loadApplications("job_applications");
          } else {
            triggerToast("success", `Tabelle "${activeListName}" gelöscht.`);
            const remainingTabs = [
              ...availableTables.filter((t) => t !== "job_applications" && t !== selectedTable),
              ...pendingTabs.map((p) => p.key),
            ];
            if (remainingTabs.length > 0) {
              setSelectedTable(remainingTabs[0]);
            } else {
              onRequestNewTab();
            }
          }
          await loadTables();
        } catch (e) {
          triggerToast("error", `Fehler beim ${isDefault ? "Leeren" : "Löschen"} der Tabelle.`);
        }
      }
    });
  };

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingManual(true);
    try {
      const newApp = {
        company: manualCompany,
        role: manualRole,
        status: manualStatus,
        date: manualDate,
        location: manualLocation,
        anstellungsart: manualAnstellungsart,
        source_file: selectedTable,
      };
      const response = await fetch(`/api/applications?table_name=${encodeURIComponent(selectedTable)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newApp),
      });
      if (!response.ok) throw new Error("Failed to save application");
      const savedApp = await response.json();
      setApplications([savedApp, ...applications]);
      setShowAddForm(false);
      triggerToast("success", "Manuell hinzugefügt.");
      // Promote from pending to real DB table after first entry
      promotePendingTab();
      await loadTables();
    } catch (err: any) {
      triggerToast("error", "Fehler beim Speichern.");
    } finally {
      setIsSavingManual(false);
    }
  };

  const getStatusColorClass = (status: JobApplication["status"]) => {
    switch (status) {
      case "Applied": return "bg-blue-950/50 text-blue-400 border-blue-900";
      case "Interview": return "bg-violet-950/50 text-violet-400 border-violet-900";
      case "Rejected": return "bg-red-950/50 text-red-400 border-red-900";
      case "Offer": return "bg-emerald-950/50 text-emerald-400 border-emerald-900";
      case "Received": return "bg-teal-950/50 text-teal-400 border-teal-900";
      case "Unknown":
      default: return "bg-slate-900 text-slate-400 border-slate-800";
    }
  };

  const startEditing = (id: string, field: string, initialValue?: string) => {
    setEditingCell({ id, field });
    setEditingValue(initialValue ?? "");
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const saveEditing = (id: string, field: string) => {
    const newValue = editingValue;
    setDraftChanges(prev => {
      const rowChanges = prev[id] || {};
      return {
        ...prev,
        [id]: {
          ...rowChanges,
          [field]: newValue
        }
      };
    });
    setEditingCell(null);
    setEditingValue("");
    triggerToast("success", "Änderung im Entwurf gespeichert.");
  };

  const handleUpdateStatusDraft = (rowId: string, newStatus: JobApplication["status"]) => {
    setDraftChanges(prev => {
      const rowChanges = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...rowChanges,
          status: newStatus
        }
      };
    });
    triggerToast("success", "Status-Entwurf geändert.");
  };

  const handleSaveDraftChanges = async () => {
    const rowIds = Object.keys(draftChanges);
    if (rowIds.length === 0) return;

    setIsSavingDrafts(true);
    try {
      triggerToast("success", "Änderungen werden in der Datenbank gespeichert...");
      for (const rowId of rowIds) {
        const updates = draftChanges[rowId];
        const response = await fetch(`/api/applications/${rowId}?table_name=${encodeURIComponent(selectedTable)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error(`Failed to update application ${rowId}`);
      }
      triggerToast("success", "Alle Änderungen erfolgreich gespeichert.");
      setDraftChanges({});
      await loadApplications(selectedTable);
    } catch (err: any) {
      console.error(err);
      triggerToast("error", `Fehler beim Speichern: ${err.message || err}`);
    } finally {
      setIsSavingDrafts(false);
    }
  };

  const handleDiscardDraftChanges = () => {
    triggerConfirm({
      title: "Änderungen verwerfen",
      message: "Möchten Sie alle ungespeicherten Entwurfsänderungen wirklich verwerfen?",
      confirmText: "Ja, verwerfen",
      type: "danger",
      onConfirm: () => {
        setDraftChanges({});
        triggerToast("success", "Entwurfsänderungen verworfen.");
      }
    });
  };

  const handleToggleRowSelect = (id: string) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = (filteredApps: JobApplication[]) => {
    const filteredIds = filteredApps.map(app => app.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedRowIds.has(id));

    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        filteredIds.forEach(id => next.delete(id));
      } else {
        filteredIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedRowIds.size === 0) return;

    triggerConfirm({
      title: "Ausgewählte löschen",
      message: `Möchten Sie die ${selectedRowIds.size} ausgewählten Bewerbungen wirklich löschen? Dies entfernt sie dauerhaft aus der Datenbank.`,
      confirmText: "Löschen",
      type: "danger",
      onConfirm: async () => {
        setIsFetchingApps(true);
        try {
          const idsToDelete = Array.from(selectedRowIds);
          const response = await fetch(`/api/applications/delete?table_name=${encodeURIComponent(selectedTable)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: idsToDelete })
          });
          if (!response.ok) throw new Error("Bulk delete failed");
          triggerToast("success", "Ausgewählte Bewerbungen gelöscht.");
          setSelectedRowIds(new Set());
          await loadApplications(selectedTable);
        } catch (err: any) {
          console.error(err);
          triggerToast("error", `Fehler beim Löschen: ${err.message || err}`);
        } finally {
          setIsFetchingApps(false);
        }
      }
    });
  };

  const parseDateForSort = (dateStr: any) => {
    const parsed = Date.parse(String(dateStr));
    return isNaN(parsed) ? 0 : parsed;
  };

  const applicationsWithDrafts = applications.map(app => {
    const drafts = draftChanges[app.id];
    if (drafts) {
      return { ...app, ...drafts };
    }
    return app;
  });



  const todayStr = getLocalDateString();
  const addedToday = applicationsWithDrafts.filter(app => app.date === todayStr).length;

  const metrics = {
    total: applicationsWithDrafts.length,
    interviewing: applicationsWithDrafts.filter(app => app.status === "Interview").length,
    offers: applicationsWithDrafts.filter(app => app.status === "Offer").length,
    rejected: applicationsWithDrafts.filter(app => app.status === "Rejected").length,
  };

  const filteredAndSortedApplications = [...applicationsWithDrafts].filter(app => {
    const matchesSearch = app.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" ? true : app.status === filterStatus;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortType === "date_desc") return parseDateForSort(b.date) - parseDateForSort(a.date);
    if (sortType === "date_asc") return parseDateForSort(a.date) - parseDateForSort(b.date);
    if (sortType === "company_asc") return a.company.localeCompare(b.company);
    if (sortType === "company_desc") return b.company.localeCompare(a.company);
    if (sortType === "status_asc") return a.status.localeCompare(b.status);
    return 0;
  });

  const toggleEmailExpansion = (emailId: string) => {
    setExpandedEmailIds(prev =>
      prev.includes(emailId) ? prev.filter(id => id !== emailId) : [...prev, emailId]
    );
  };

  const renderEmailUpdateRow = (update: EmailUpdate, isStatuswechsel: boolean) => {
    const isExpanded = expandedEmailIds.includes(update.emailId);
    const dupMatch = getCompanyMatch(update.company);

    const getEmailStatusBadge = (statusStr: string) => {
      switch (statusStr) {
        case "Applied": return "bg-blue-950/45 text-blue-400 border border-blue-900/40";
        case "Interview": return "bg-violet-950/45 text-violet-400 border border-violet-900/40";
        case "Rejected": return "bg-rose-950/45 text-rose-400 border border-rose-900/40";
        case "Offer": return "bg-emerald-950/45 text-emerald-400 border border-emerald-900/40";
        case "Received": return "bg-slate-900 text-slate-300 border border-slate-800";
        default: return "bg-slate-900 text-slate-400 border border-slate-850";
      }
    };

    return (
      <div key={update.emailId} className="border border-white/5 rounded-xl overflow-hidden bg-slate-900/40">
        <div
          onClick={() => toggleEmailExpansion(update.emailId)}
          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 cursor-pointer hover:bg-slate-800/45 gap-3 transition select-none"
        >
          <div className="flex items-center gap-3 text-sm flex-wrap">
            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
            <span className="font-bold text-slate-100">{update.company}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">{update.role}</span>
            <span className="text-slate-500">•</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getEmailStatusBadge(update.status)}`}>
              {update.status}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">{update.date}</span>
          </div>
          <div className="flex gap-2 items-center shrink-0">
            <a
              href={`https://mail.google.com/mail/u/0/#inbox/${update.emailId}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-950/30 hover:bg-blue-950/50 border border-blue-900/40 px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer"
            >
              <ExternalLink className="h-3 w-3" />
              E-Mail öffnen
            </a>

            {!update.synced && !update.dismissed ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRefuseEmailUpdate(update.emailId); }}
                  className="text-[10px] font-bold text-rose-450 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 px-2 py-1 rounded-md transition cursor-pointer"
                >
                  Verwerfen
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleAcceptEmailChange(update); }}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-350 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/30 px-2 py-1 rounded-md transition cursor-pointer"
                >
                  Übernehmen
                </button>
              </>
            ) : update.synced ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-1 rounded-md flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Übernommen
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleUndoRefuseEmailUpdate(update.emailId); }}
                title="Rückgängig machen"
                className="text-[10px] font-bold text-rose-450 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/30 border border-rose-900/30 px-2.5 py-1 rounded-md flex items-center gap-1 transition cursor-pointer"
              >
                <XCircle className="h-3 w-3" />
                Verworfen
              </button>
            )}
          </div>
        </div>
        {isExpanded && (
          <div className="p-4 border-t border-white/5 bg-slate-950/40 space-y-4">
            {dupMatch && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Bestehender Eintrag gefunden (Status: "{dupMatch.status}"). Klick auf "Übernehmen" setzt Status auf "{update.status}".
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-200">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold">Standort:</span>
                  <span className="text-slate-300">{update.location || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold">Anstellungsart:</span>
                  <span className="text-slate-300">{update.anstellungsart || "N/A"}</span>
                </div>
                <div className="text-slate-200">
                  <span className="font-semibold">Betreff:</span>{" "}
                  <span className="text-slate-300">{update.subject || "(Kein Betreff)"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-slate-200">
                  <span className="font-semibold">Zusammenfassung:</span>{" "}
                  <span className="text-slate-300 italic">"{update.summary || "Keine Zusammenfassung vorhanden"}"</span>
                </div>
                <div className="text-slate-200">
                  <span className="font-semibold">Empfohlene Aktion:</span>{" "}
                  <span className="text-blue-400 font-semibold">{update.suggestedAction || "N/A"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">E-Mail Text</span>
              <div className="bg-slate-950/70 border border-white/5 rounded-xl p-4 max-h-80 overflow-y-auto select-text cursor-text font-sans text-xs leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
                {update.body || update.snippet}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* 1. Header with single action menu */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white m-0">Bewerbungs-Tracker</h2>
          <p className="text-sm text-slate-400 mt-1 m-0">Synchronisieren Sie Ihr Postfach und verwalten Sie Ihre Bewerbungen.</p>
        </div>

        {/* Single action dropdown menu */}
        <div className="flex items-center gap-3">
          <button
            id="scan-button"
            onClick={handleScanInboxAndAnalyze}
            disabled={isScanning}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
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

          <div className="relative" ref={actionMenuRef}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  const baseName = file.name.replace(/\.[^/.]+$/, "");
                  // Warn if currently selected tab already has data
                  if (applications.length > 0) {
                    triggerConfirm({
                      title: "Tabelle überschreiben?",
                      message: `Die aktuelle Liste "${formatTableName(selectedTable)}" enthält bereits ${applications.length} Einträge. Eine neue CSV erstellt eine neue, separate Tabelle. Möchten Sie fortfahren?`,
                      confirmText: "Fortfahren",
                      type: "warning",
                      onConfirm: () => {
                        setPendingFile(file);
                        setImportFileName(baseName);
                        setImportModalOpen(true);
                      },
                    });
                  } else {
                    setPendingFile(file);
                    setImportFileName(baseName);
                    setImportModalOpen(true);
                  }
                  // Reset input so same file can be picked again
                  e.target.value = "";
                }
              }}
              className="hidden"
              accept=".csv"
            />

            <button
              onClick={() => setActionMenuOpen((v) => !v)}
              className="bg-slate-800 border border-white/10 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-lg text-xs transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <MoreVertical className="h-4 w-4 text-slate-400" />
              Aktionen
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${actionMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {actionMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1">

                {/* Umbenennen — always shown, disabled only for the default table */}
                {selectedTable !== "job_applications" && (
                  <>
                    <button
                      onClick={() => {
                        setActionMenuOpen(false);
                        setRenameValue(formatTableName(selectedTable));
                        setRenameModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer text-left"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      Liste umbenennen
                    </button>
                    <div className="mx-3 my-1 border-t border-white/5" />
                  </>
                )}

                {/* Import */}
                <button
                  onClick={() => { setActionMenuOpen(false); fileInputRef.current?.click(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer text-left"
                >
                  <Upload className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  CSV Importieren
                </button>

                {/* Export — only when there's data */}
                <button
                  onClick={() => {
                    setActionMenuOpen(false);
                    if (applications.length === 0) {
                      triggerToast("error", "Keine Daten vorhanden zum Exportieren.");
                      return;
                    }
                    setExportFileSelected(selectedTable);
                    setExportModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer text-left"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  CSV Exportieren
                </button>

                {/* Interview Reminder */}
                <button
                  onClick={() => {
                    setActionMenuOpen(false);
                    const interviewApps = applications.filter((app) => app.status === "Interview");
                    if (interviewApps.length === 0) {
                      triggerToast("error", "Sie müssen zuerst den Status einer Bewerbung auf 'Interview' setzen.");
                      return;
                    }
                    setReminderAppId(interviewApps[0].id);
                    setReminderDate(new Date().toISOString().split("T")[0]);
                    setReminderModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer text-left"
                >
                  <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  Termin hinzufügen
                </button>

                {/* Delete/Clear — hidden for default table; shown for custom tables and pending tabs */}
                {selectedTable !== "job_applications" && (
                  <>
                    <div className="mx-3 my-1 border-t border-white/5" />
                    <button
                      onClick={() => {
                        setActionMenuOpen(false);
                        if (isPendingTab) {
                          const remainingTabs = [
                            ...availableTables.filter((t) => t !== "job_applications"),
                            ...pendingTabs.filter((pt) => pt.key !== selectedTable).map((p) => p.key),
                          ];
                          setPendingTabs((prev) => prev.filter((pt) => pt.key !== selectedTable));
                          if (remainingTabs.length > 0) {
                            setSelectedTable(remainingTabs[0]);
                          } else {
                            onRequestNewTab();
                          }
                        } else {
                          handleDeleteTable();
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-950/30 transition cursor-pointer text-left"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      {isPendingTab ? "Liste entfernen" : "Tabelle löschen"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Loading Progress Bar for Gmail Sync */}
      {isScanning && (
        <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-slate-900/40 p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">{syncPhase}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{syncDetails}</p>
            </div>
          </div>
          <div className="w-full md:max-w-xs space-y-1.5 shrink-0">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-0.5">
              <span>Fortschritt</span>
              <span className="text-blue-400 font-bold">{Math.round(syncProgress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats Dashboard (Daily Goal + Overall Metrics) */}
      <StatsDashboard
        metrics={metrics}
        addedToday={addedToday}
        dailyGoal={dailyGoal}
        setDailyGoal={setDailyGoal}
      />

      {/* Active Interview Reminders */}
      {activeReminders.length > 0 && (
        <div className="professional-card p-5 border border-amber-500/20 bg-amber-500/5 rounded-xl space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Anstehende Interview-Termine ({activeReminders.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeReminders.map((rem) => {
              const today = new Date(todayStrForReminders);
              const interviewDate = new Date(rem.date);
              const diffTime = interviewDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              let badgeText = `In ${diffDays} Tagen`;
              if (diffDays === 0) badgeText = "Heute!";
              if (diffDays === 1) badgeText = "Morgen!";

              return (
                <div key={rem.id} className="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-xl p-3.5 flex items-center justify-between gap-3 group/item transition">
                  <div className="space-y-1.5 min-w-0">
                    <div className="text-xs font-bold text-slate-100 truncate">{rem.company}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <span>Termin:</span>
                      <span className="font-bold text-slate-200">{new Date(rem.date).toLocaleDateString("de-DE")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diffDays === 0 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                      {badgeText}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteReminder(rem.id)}
                      className="opacity-0 group-hover/item:opacity-100 focus:opacity-100 transition-opacity p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-400 border-none cursor-pointer bg-transparent"
                      title="Termin entfernen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Gmail Synced Email Cards */}
      {isInboxScanned && (
        <div className="space-y-4">
          <div className="pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider m-0 flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-400" /> Erkannte Bewerbungs-Mails ({emailUpdates.length})
            </h3>
            <span className="text-xs text-slate-300 font-mono bg-slate-900 border border-white/5 px-2 py-0.5 rounded">
              Gefiltert in dieser Sitzung
            </span>
          </div>
          {emailUpdates.length > 0 ? (
            <div className="space-y-4">
              {(() => {
                const neueBewerbungen = emailUpdates.filter(up => up.classification !== "Statuswechsel");
                const count = neueBewerbungen.length;
                return (
                  <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-900/10">
                    <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/40 px-4 py-3 border-b border-white/5 gap-2 select-none">
                      <button type="button" onClick={() => setIsNeueExpanded(!isNeueExpanded)} className="flex items-center gap-2 text-xs font-bold text-slate-100 bg-transparent border-none outline-none cursor-pointer">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                        <span>Neue Bewerbung ({count})</span>
                        {isNeueExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </button>
                      {count > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button" onClick={() => handleRejectAll(neueBewerbungen)} className="text-[10px] text-slate-300 bg-slate-900 hover:bg-slate-800 border border-white/5 font-bold px-2.5 py-1 rounded-md transition duration-150 cursor-pointer">Alle verwerfen</button>
                          <button type="button" onClick={() => handleAcceptAll(neueBewerbungen)} className="text-[10px] text-white bg-blue-600 hover:bg-blue-700 font-bold px-2.5 py-1 rounded-md transition duration-150 cursor-pointer">Alle übernehmen</button>
                        </div>
                      )}
                    </div>
                    {isNeueExpanded && (
                      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                        {count > 0 ? neueBewerbungen.map((update) => renderEmailUpdateRow(update, false)) : <p className="text-xs text-slate-500 italic text-center py-4">Keine Mails in dieser Kategorie.</p>}
                      </div>
                    )}
                  </div>
                );
              })()}
              {(() => {
                const statusAenderungen = emailUpdates.filter(up => up.classification === "Statuswechsel");
                const count = statusAenderungen.length;
                return (
                  <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-900/10">
                    <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/40 px-4 py-3 border-b border-white/5 gap-2 select-none">
                      <button type="button" onClick={() => setIsStatusExpanded(!isStatusExpanded)} className="flex items-center gap-2 text-xs font-bold text-slate-105 bg-transparent border-none outline-none cursor-pointer">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                        <span>Statusänderung ({count})</span>
                        {isStatusExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </button>
                      {count > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button" onClick={() => handleRejectAll(statusAenderungen)} className="text-[10px] text-slate-300 bg-slate-900 hover:bg-slate-800 border border-white/5 font-bold px-2.5 py-1 rounded-md transition duration-150 cursor-pointer">Alle verwerfen</button>
                          <button type="button" onClick={() => handleAcceptAll(statusAenderungen)} className="text-[10px] text-white bg-blue-600 hover:bg-blue-700 font-bold px-2.5 py-1 rounded-md transition duration-150 cursor-pointer">Alle übernehmen</button>
                        </div>
                      )}
                    </div>
                    {isStatusExpanded && (
                      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                        {count > 0 ? statusAenderungen.map((update) => renderEmailUpdateRow(update, true)) : <p className="text-xs text-slate-500 italic text-center py-4">Keine Mails in dieser Kategorie.</p>}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-10 rounded-xl border border-dashed border-white/5 text-slate-400 bg-slate-900/20">
              <Sparkles className="h-7 w-7 mx-auto mb-2.5 text-slate-500 animate-pulse" />
              <p className="text-xs font-semibold text-slate-200">Keine neuen Bewerbungs-Mails gefunden</p>
            </div>
          )}
        </div>
      )}

      {/* Grid table container */}
      <div id="grid-table-container" className="professional-card p-6">
        {/* Controls bar: search, filter, sort + action buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {selectedRowIds.size > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {selectedRowIds.size} Löschen
              </button>
            )}

            {Object.keys(draftChanges).length > 0 && (
              <div className="flex items-center gap-2 shrink-0 bg-slate-950/20 p-1 rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={handleDiscardDraftChanges}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-1.5 px-3 rounded-md text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  Verwerfen
                </button>
                <button
                  type="button"
                  disabled={isSavingDrafts}
                  onClick={handleSaveDraftChanges}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-1.5 px-3 rounded-md text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  {isSavingDrafts ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  Speichern
                </button>
              </div>
            )}



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
                className="bg-slate-800 border border-slate-700 py-1 px-2.5 rounded-lg text-xs text-slate-100 font-medium cursor-pointer focus:outline-none focus:border-blue-500"
              >
                <option value="All">Alle Status</option>
                <option value="Applied">Applied</option>
                <option value="Interview">Interview</option>
                <option value="Offer">Offers</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#64748B] dark:text-slate-400 font-medium">Sortieren:</span>
              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 py-1 px-2.5 rounded-lg text-xs text-slate-100 font-medium cursor-pointer focus:outline-none focus:border-blue-500"
              >
                <option value="date_desc">Neueste zuerst</option>
                <option value="date_asc">Älteste zuerst</option>
                <option value="company_asc">Unternehmen (A-Z)</option>
                <option value="company_desc">Unternehmen (Z-A)</option>
                <option value="status_asc">Status</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-slate-800 border border-white/10 hover:bg-slate-700 text-slate-200 font-semibold py-1.5 px-4 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
          >
            <Plus className="h-3.5 w-3.5 text-slate-400" />
            Eintrag hinzufügen
          </button>
        </div>

        {/* Pending tab empty state */}
        {isPendingTab && (
          <div className="py-14 flex flex-col items-center justify-center text-center gap-4 border border-dashed border-amber-900/30 rounded-xl bg-amber-950/10">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Plus className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">{pendingTabLabel}</p>
              <p className="text-xs text-slate-400 mt-1">
                Diese Liste ist noch leer. Füge Einträge hinzu oder importiere eine CSV-Datei.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-semibold py-2 px-4 rounded-lg text-xs transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Eintrag hinzufügen
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" /> CSV importieren
              </button>
            </div>
          </div>
        )}
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
                className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline bg-transparent border-none cursor-pointer"
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
                  <option value="Applied" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-slate-200">Applied</option>
                  <option value="Interview" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-slate-200">Interview</option>
                  <option value="Offer" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-slate-200">Offer</option>
                  <option value="Rejected" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-slate-200">Rejected</option>
                  <option value="Received" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-slate-200">Received</option>
                  <option value="Unknown" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-slate-200">Unknown</option>
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
                className="bg-[#2563EB] hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition border-none"
              >
                {isSavingManual ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "In Datenbank speichern"
                )}
              </button>
            </div>
          </motion.form>
        )}

        {/* Doppelklick-Hinweis */}
        {!isPendingTab && applications.length > 0 && (
          <div className="text-[11px] text-[#64748B] dark:text-slate-400 mb-3.5 flex items-center gap-1.5 bg-slate-50/50 dark:bg-slate-900/10 px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-800/80 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Tipp: Doppelklick auf eine Zelle (Unternehmen, Stelle, Datum, Standort, Anstellungsart), um sie direkt zu bearbeiten.</span>
          </div>
        )}

        {/* Job Table View */}
        <JobTable
          applications={applications}
          filteredAndSortedApplications={filteredAndSortedApplications}
          isFetchingApps={isFetchingApps}
          columnWidths={columnWidths}
          startResize={startResize}
          selectedRowIds={selectedRowIds}
          handleToggleSelectAll={handleToggleSelectAll}
          handleToggleRowSelect={handleToggleRowSelect}
          editingCell={editingCell}
          editingValue={editingValue}
          startEditing={startEditing}
          cancelEditing={cancelEditing}
          saveEditing={saveEditing}
          setEditingValue={setEditingValue}
          draftChanges={draftChanges}
          handleUpdateStatusDraft={handleUpdateStatusDraft}
          isSavingDrafts={isSavingDrafts}
          getStatusColorClass={getStatusColorClass}
        />
      </div>

      {/* Export Selection Modal */}
      <AnimatePresence>
        {exportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-white/5 rounded-xl max-w-md w-full overflow-hidden shadow-2xl p-6 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <Table className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-base font-bold text-slate-100 m-0">
                    CSV-Datei exportieren
                  </h3>
                  <p className="text-sm text-slate-300 m-0 leading-relaxed">
                    Wählen Sie aus, welche Tabelle Sie genau exportieren möchten:
                  </p>
                  <div className="pt-2">
                    <select
                      value={exportFileSelected}
                      onChange={(e) => setExportFileSelected(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-205 cursor-pointer focus:outline-none focus:border-blue-500"
                    >
                      {availableTables.map((tbl) => (
                        <option key={tbl} value={tbl}>
                          {formatTableName(tbl)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer border-none"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportModalOpen(false);
                    handleCsvDownload(exportFileSelected);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer text-white border-none flex items-center gap-1"
                >
                  Exportieren
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSV Import Naming Modal */}
      <AnimatePresence>
        {importModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-white/5 rounded-xl max-w-md w-full overflow-hidden shadow-2xl p-6 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-base font-bold text-slate-100 m-0">
                    {pendingFile ? "CSV importieren" : "Neue Liste erstellen"}
                  </h3>
                  <p className="text-sm text-slate-400 m-0 leading-relaxed">
                    Geben Sie der neuen Liste einen Namen:
                  </p>
                  <div className="pt-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Listenname</label>
                    <input
                      type="text"
                      value={importFileName}
                      onChange={(e) => setImportFileName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                      placeholder="z.B. Bewerbungen 2025"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setImportModalOpen(false); setPendingFile(null); }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer border-none"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={!importFileName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer text-white border-none"
                >
                  {pendingFile ? "Importieren" : "Erstellen"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Pending Tab Modal */}
      <AnimatePresence>
        {renameModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-white/5 rounded-xl max-w-sm w-full shadow-2xl p-6 text-left"
            >
              <h3 className="text-base font-bold text-slate-100 m-0 mb-4">Liste umbenennen</h3>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Neuer Name</label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRenameConfirm()}
                autoFocus
                className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                placeholder="z.B. Bewerbungen 2025"
              />
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRenameModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer border-none"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleRenameConfirm}
                  disabled={!renameValue.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer text-white border-none"
                >
                  Umbenennen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interview Reminder Modal */}
      <AnimatePresence>
        {reminderModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-white/5 rounded-xl max-w-sm w-full shadow-2xl p-6 text-left"
            >
              <h3 className="text-base font-bold text-slate-100 m-0 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                <span>Termin hinzufügen</span>
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Unternehmen</label>
                  <select
                    value={reminderAppId}
                    onChange={(e) => setReminderAppId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                  >
                    {applications.filter(app => app.status === "Interview").map(app => (
                      <option key={app.id} value={app.id} className="bg-slate-900 text-slate-200">
                        {app.company} ({app.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Datum</label>
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReminderModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer border-none"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSaveReminder}
                  disabled={!reminderAppId || !reminderDate}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer text-white border-none"
                >
                  Speichern
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
