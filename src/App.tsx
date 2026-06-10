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
  ChevronLeft,
  ChevronRight,
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
  getSpreadsheetTitle,
  deleteJobApplicationRows
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

  if (clean1 === clean2) return true;
  if (clean1.length >= 2 && clean2.length >= 2 && (clean1.includes(clean2) || clean2.includes(clean1))) return true;

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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string>("");
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");
  const [customSpreadsheetId, setCustomSpreadsheetId] = useState<string>("");
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [showBindInput, setShowBindInput] = useState(false);
  const [isInboxScanned, setIsInboxScanned] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isNeueExpanded, setIsNeueExpanded] = useState<boolean>(true);
  const [isStatusExpanded, setIsStatusExpanded] = useState<boolean>(true);
  const [expandedEmailIds, setExpandedEmailIds] = useState<string[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isFetchingApps, setIsFetchingApps] = useState(false);
  const [gmailQuery, setGmailQuery] = useState<string>(
    'Bewerbung OR Interview OR Absage OR Vertrag OR Stelle OR Softwareentwickler OR Webentwickler OR candidate OR "vielen Dank für Ihre Bewerbung"'
  );
  const [emailUpdates, setEmailUpdates] = useState<EmailUpdate[]>([]);
  const [isScanning, setIsScanning] = useState(false);
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
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Bestätigen",
    cancelText: "Abbrechen",
    type: "info",
    onConfirm: () => { },
  });
  const [syncingEmailId, setSyncingEmailId] = useState<string | null>(null);
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [draftChanges, setDraftChanges] = useState<Record<string, Partial<JobApplication>>>({});
  const [isSavingDrafts, setIsSavingDrafts] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
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
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
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

  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("darkMode", "true");
  }, []);

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
      }
    }
  }, [token, spreadsheetId]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const triggerToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  const triggerConfirm = (options: {
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      cancelText: options.cancelText || "Abbrechen",
      type: options.type || "info",
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        options.onConfirm();
      },
    });
  };

  const toggleEmailExpansion = (emailId: string) => {
    setExpandedEmailIds(prev =>
      prev.includes(emailId) ? prev.filter(id => id !== emailId) : [...prev, emailId]
    );
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
      setEmailUpdates([]);
      setSpreadsheetId("");
      setCustomSpreadsheetId("");
      triggerToast("success", "Abgemeldet.");
    } catch (err: any) {
      console.error(err);
      triggerToast("error", "Abmeldung fehlgeschlagen");
    }
  };

  const handleCreateSheet = async () => {
    if (!token || !user) return;
    setIsCreatingSheet(true);
    try {
      const newSheetId = await createJobTrackerSpreadsheet(token, "Bewerbungen Tracker");
      setSpreadsheetId(newSheetId);
      setSpreadsheetTitle("Bewerbungen Tracker");
      setCustomSpreadsheetId(newSheetId);
      localStorage.setItem(`spreadsheet_${user.uid}`, newSheetId);
      triggerToast("success", "Google Tabelle erfolgreich erstellt!");
    } catch (err: any) {
      triggerToast("error", "Fehler beim Erstellen der Tabelle.");
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

  const getCompanyMatch = (companyName: string) => {
    if (!companyName) return null;
    return applications.find(app => isSimilarCompany(app.company, companyName));
  };

  const handleScanInboxAndAnalyze = async () => {
    if (!token) return;
    setIsScanning(true);
    try {
      triggerToast("success", "Emails werden geladen...");
      const messages = await searchGmailMessages(token, gmailQuery, 15);

      const response = await fetch("/api/analyze-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: messages }),
      });

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

      setEmailUpdates(filteredUpdates);
      setIsInboxScanned(true);
      triggerToast("success", `${filteredUpdates.length} Updates gefunden.`);
    } catch (err: any) {
      triggerToast("error", "Fehler beim Scan.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAcceptEmailChange = async (update: EmailUpdate) => {
    setSyncingEmailId(update.emailId);
    try {
      const match = getCompanyMatch(update.company);
      if (update.classification === "Statuswechsel" && match) {
        if (token && spreadsheetId) await updateJobApplicationRow(token, spreadsheetId, match.id, { status: update.status });
        const updated = applications.map(app => app.id === match.id ? { ...app, status: update.status } : app);
        setApplications(updated);
        localStorage.setItem("offline_applications", JSON.stringify(updated));
      } else {
        const newApp: JobApplication = {
          id: String(Date.now()),
          company: update.company,
          role: update.role,
          status: update.status,
          date: update.date,
          location: update.location || "N/A",
          anstellungsart: update.anstellungsart || "N/A",
        };
        if (token && spreadsheetId) await addJobApplication(token, spreadsheetId, newApp);
        const updated = [newApp, ...applications];
        setApplications(updated);
        localStorage.setItem("offline_applications", JSON.stringify(updated));
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

  const handleCsvFileParse = async (text: string) => {
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      const parsedApps: JobApplication[] = lines.slice(1).map((line, i) => {
        const cols = line.split(/[;,]/);
        return {
          id: String(i + 1),
          company: cols[0] || "Unknown",
          role: cols[1] || "Position",
          status: "Applied",
          date: new Date().toLocaleDateString(),
        };
      });
      setApplications(parsedApps);
      localStorage.setItem("offline_applications", JSON.stringify(parsedApps));
      triggerToast("success", "CSV importiert.");
    } catch (e) {
      triggerToast("error", "Import fehlgeschlagen.");
    }
  };

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingManual(true);
    try {
      const newApp: JobApplication = {
        id: String(Date.now()),
        company: manualCompany,
        role: manualRole,
        status: manualStatus,
        date: manualDate,
        location: manualLocation,
        anstellungsart: manualAnstellungsart,
      };
      if (token && spreadsheetId) await addJobApplication(token, spreadsheetId, newApp);
      const updated = [newApp, ...applications];
      setApplications(updated);
      localStorage.setItem("offline_applications", JSON.stringify(updated));
      setShowAddForm(false);
      triggerToast("success", "Manuell hinzugefügt.");
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
      if (token && spreadsheetId) {
        triggerToast("success", "Änderungen werden in Google Sheets gespeichert...");
        for (const rowId of rowIds) {
          const updates = draftChanges[rowId];
          await updateJobApplicationRow(token, spreadsheetId, rowId, updates);
        }
        triggerToast("success", "Alle Änderungen erfolgreich in Google Sheets gespeichert.");
        setDraftChanges({});
        await loadApplications();
      } else {
        const updated = applications.map(app => {
          if (draftChanges[app.id]) {
            return { ...app, ...draftChanges[app.id] };
          }
          return app;
        });
        setApplications(updated);
        localStorage.setItem("offline_applications", JSON.stringify(updated));
        setDraftChanges({});
        triggerToast("success", "Alle Änderungen offline gespeichert.");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("error", `Fehler beim Speichern der Änderungen: ${err.message || err}`);
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
      message: `Möchten Sie die ${selectedRowIds.size} ausgewählten Bewerbungen wirklich löschen? Dies entfernt sie dauerhaft aus der Datenbank${spreadsheetId ? " und der Google Tabelle" : ""}.`,
      confirmText: "Löschen",
      type: "danger",
      onConfirm: async () => {
        setIsFetchingApps(true);
        try {
          const idsToDelete = Array.from(selectedRowIds);
          if (token && spreadsheetId) {
            await deleteJobApplicationRows(token, spreadsheetId, idsToDelete);
            triggerToast("success", "Ausgewählte Bewerbungen gelöscht.");
            await loadApplications();
          } else {
            const updated = applications.filter(app => !selectedRowIds.has(app.id));
            setApplications(updated);
            localStorage.setItem("offline_applications", JSON.stringify(updated));
            triggerToast("success", "Ausgewählte Bewerbungen lokal gelöscht.");
          }
          setSelectedRowIds(new Set());
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

  const filteredAndSortedApplications = [...applicationsWithDrafts].filter(app => {
    const matchesSearch = app.company.toLowerCase().includes(searchTerm.toLowerCase());
    return filterStatus === "All" ? matchesSearch : app.status === filterStatus && matchesSearch;
  }).sort((a, b) => {
    if (sortType === "date_desc") return parseDateForSort(b.date) - parseDateForSort(a.date);
    if (sortType === "date_asc") return parseDateForSort(a.date) - parseDateForSort(b.date);
    if (sortType === "company_asc") return a.company.localeCompare(b.company);
    if (sortType === "company_desc") return b.company.localeCompare(a.company);
    if (sortType === "status_asc") return a.status.localeCompare(b.status);
    return 0;
  });

  const metrics = {
    total: applicationsWithDrafts.length,
    interviewing: applicationsWithDrafts.filter(app => app.status === "Interview").length,
    offers: applicationsWithDrafts.filter(app => app.status === "Offer").length,
    rejected: applicationsWithDrafts.filter(app => app.status === "Rejected").length,
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

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-white/5 p-8 rounded-2xl max-w-sm w-full text-center">
          <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/20">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">SyncSheet</h2>
          <p className="text-slate-400 text-sm mb-8">Bewerbungstracker für Gmail</p>
          <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition">Google Anmelden</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex font-sans">


      <aside className={`w-full ${isSidebarCollapsed ? "lg:w-20" : "lg:w-72"} bg-slate-900/30 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-white/5 p-4 lg:p-6 flex flex-col shrink-0 transition-all duration-300`}>
        <div className="flex items-center justify-between mb-8">
          <div
            onClick={() => { if (isSidebarCollapsed) setIsSidebarCollapsed(false); }}
            className={`flex items-center gap-2.5 ${isSidebarCollapsed ? "cursor-pointer" : "cursor-default"}`}
            title={isSidebarCollapsed ? "Seitenleiste öffnen" : undefined}
          >
            <div className="h-8 w-8 bg-[#2563EB] dark:bg-blue-600 rounded-lg flex items-center justify-center text-white font-black shadow-sm">
              <Mail className="h-4.5 w-4.5" />
            </div>
            {!isSidebarCollapsed && (
              <div>
                <h1 className="text-base font-bold text-[#1E293B] dark:text-slate-100 tracking-tight leading-none">SyncSheet</h1>
                <span className="text-[10px] text-slate-300 font-mono leading-none">Bewerbungs-Tracker</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex items-center justify-center h-6 w-6 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <nav className="space-y-1 mb-8">
          <div
            onClick={() => { if (isSidebarCollapsed) setIsSidebarCollapsed(false); }}
            className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-lg text-sm font-medium bg-blue-500/10 border border-blue-500/15 text-blue-400 cursor-pointer`}
            title={isSidebarCollapsed ? "Verwaltung öffnen" : undefined}
          >
            <Table className="h-4 w-4 shrink-0" />
            {!isSidebarCollapsed && <span>Verwaltung</span>}
          </div>
        </nav>
        {isSidebarCollapsed ? (
          <div className="mt-2 pt-5 border-t border-white/5 flex flex-col items-center gap-4">
            <div
              onClick={() => {
                setIsSidebarCollapsed(false);
                if (spreadsheetId) {
                  setShowBindInput(true);
                }
              }}
              className="relative group cursor-pointer"
              title={spreadsheetId ? `Verbunden mit: ${spreadsheetTitle}. Klicken zum Verknüpfen/Wechseln.` : "Tabelle verknüpfen"}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${spreadsheetId ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-amber-500/10 border-amber-500/25 text-amber-400"}`}>
                <FileSpreadsheet className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 pt-5 border-t border-[#E2E8F0] dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tabelle</span>
              {spreadsheetId ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Verbunden</span> : <span className="text-[10px] font-bold text-amber-400">Unverknüpft</span>}
            </div>
            {spreadsheetId ? (
              <div className="space-y-3 bg-slate-950/40 backdrop-blur-md rounded-xl p-3.5 border border-white/5">
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 truncate"><FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" /><span>{spreadsheetTitle || "Google Tabelle"}</span></div>
                <div className="text-[9px] font-mono select-all bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-1.5 rounded truncate text-slate-300">ID: {spreadsheetId}</div>
                <button type="button" onClick={() => setShowBindInput(!showBindInput)} className="w-full text-center py-1.5 text-[11px] font-semibold border border-white/5 bg-slate-900 hover:bg-slate-850 text-slate-200 rounded-md transition duration-150 cursor-pointer flex items-center justify-center gap-1"><Link2 className="h-3.5 w-3.5 text-blue-400" /> Tabelle wechseln</button>
                {showBindInput && (
                  <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-800 space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-300 uppercase block">Sheets-ID oder URL</label>
                    <div className="flex gap-1.5">
                      <input type="text" placeholder="Neue ID oder URL" value={customSpreadsheetId} onChange={(e) => setCustomSpreadsheetId(e.target.value)} className="flex-grow bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-mono text-[#1E293B] dark:text-slate-205 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500 min-w-0" />
                      <button type="button" onClick={handleBindCustomSheet} className="bg-[#2563EB] dark:bg-blue-600 text-white hover:bg-blue-700 font-semibold px-2.5 py-1 rounded-lg text-xs flex items-center cursor-pointer shrink-0">Links</button>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => triggerConfirm({
                    title: "Verbindung trennen",
                    message: "Möchten Sie die Verbindung zur aktuellen Google-Tabelle wirklich trennen?",
                    confirmText: "Ja, trennen",
                    type: "danger",
                    onConfirm: () => {
                      setSpreadsheetId("");
                      setCustomSpreadsheetId("");
                      localStorage.removeItem(`spreadsheet_${user?.uid}`);
                      setApplications([]);
                      setEmailUpdates([]);
                      setIsInboxScanned(false);
                      triggerToast("success", "Getrennt.");
                    }
                  })}
                  className="w-full text-center py-1.5 text-[11px] font-medium border border-white/5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-md transition duration-150 cursor-pointer"
                >
                  Verbindung trennen
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-300 leading-relaxed">Verknüpfen Sie eine Tabelle, um Gmail-Daten zu protokollieren.</div>
                <div className="space-y-2">
                  <button onClick={handleCreateSheet} disabled={isCreatingSheet} className="w-full justify-center flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg text-xs shadow-sm transition duration-150 disabled:opacity-50 cursor-pointer">{isCreatingSheet ? <RefreshCw className="h-3 w-3 animate-spin text-white" /> : <><Plus className="h-3.5 w-3.5" /> Neue Tabelle erstellen</>}</button>
                  <button type="button" onClick={() => setShowBindInput(!showBindInput)} className="w-full justify-center flex items-center gap-1.5 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 text-[#1E293B] font-medium py-2 px-3 rounded-lg text-xs shadow-sm transition duration-150 cursor-pointer"><Link2 className="h-3.5 w-3.5 text-slate-300" /> Bestehende Tabelle verknüpfen</button>
                </div>
              </div>
            )}
          </div>
        )}
        {!isSidebarCollapsed && (
          <div className="mt-5 pt-5 border-t border-[#E2E8F0] dark:border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Importieren / Excel / CSV</span>
            <div onDragOver={(e) => e.preventDefault()} onDrop={async (e) => { e.preventDefault(); if (e.dataTransfer.files) handleCsvFileParse(await e.dataTransfer.files[0].text()); }} className="relative border-2 border-dashed border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 text-center cursor-pointer transition">
              <input type="file" onChange={async (e) => { if (e.target.files) handleCsvFileParse(await e.target.files[0].text()); }} className="absolute inset-0 opacity-0 cursor-pointer" />
              <FileSpreadsheet className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
              <span className="text-xs font-semibold text-[#1E293B] dark:text-slate-200 block">CSV ablegen</span>
            </div>
            {applications.length > 0 && (
              <button onClick={() => triggerConfirm({ title: "Daten entfernen", message: "Alle Daten löschen?", confirmText: "Löschen", type: "danger", onConfirm: () => { setApplications([]); localStorage.removeItem("offline_applications"); } })} className="w-full text-center py-2 text-[11px] font-semibold border border-white/5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-md transition cursor-pointer flex items-center justify-center gap-1.5"><Trash2 className="h-4 w-4 text-slate-400" /> CSV / Daten entfernen</button>
            )}
          </div>
        )}
        {isSidebarCollapsed ? (
          <div className="mt-auto pt-6 border-t border-white/5 flex flex-col items-center gap-4">
            <button
              onClick={() => triggerConfirm({
                title: "Abmelden",
                message: "Möchten Sie sich wirklich abmelden?",
                confirmText: "Abmelden",
                type: "warning",
                onConfirm: handleSignOut
              })}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Abmelden"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        ) : (
          <div className="mt-auto pt-6 border-t border-[#E2E8F0] dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-355 uppercase tracking-wider">Benutzer</div>
            <div className="font-bold text-sm text-[#1E293B] dark:text-slate-105 mt-1 truncate">{user?.displayName || "User"}</div>
            <div className="text-[11px] text-slate-300 font-mono truncate">{user?.email}</div>
            <button
              id="sign-out-button"
              onClick={() => triggerConfirm({
                title: "Abmelden",
                message: "Möchten Sie sich wirklich abmelden?",
                confirmText: "Abmelden",
                type: "warning",
                onConfirm: handleSignOut
              })}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 border border-[#E2E8F0] dark:border-slate-800 rounded-lg text-xs font-medium text-[#64748B] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition duration-150 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> Log Out
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white m-0">Übersicht & Automation</h2>
            <p className="text-sm text-slate-400 mt-1 m-0">Automatische Synchronisation aus Gmail in die Google-Tabelle.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button onClick={() => setShowAddForm(!showAddForm)} className="bg-slate-800 border border-white/5 hover:bg-slate-700 text-white font-medium py-1.5 px-4 rounded-lg text-sm shadow-sm transition flex items-center gap-1.5 cursor-pointer"><Plus className="h-4 w-4" /> Eintrag hinzufügen</button>
            <button id="scan-button" onClick={handleScanInboxAndAnalyze} disabled={isScanning || !spreadsheetId} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-4 rounded-lg text-sm shadow-sm transition flex items-center gap-1.5 cursor-pointer">{isScanning ? <><RefreshCw className="h-4 w-4 animate-spin" /> Analysiere...</> : <><Sparkles className="h-4 w-4" /> Gmail synchronisieren</>}</button>
          </div>
        </header>

        {/* Dashboard Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="professional-card p-5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Verarbeitete Bewerbungen</span>
              <span className="text-3xl font-bold text-slate-100 block mt-2">{applications.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Tabelle synchron
            </div>
          </div>

          <div className="professional-card p-5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Aktive Interviews</span>
              <span className="text-3xl font-bold text-amber-500 dark:text-amber-400 block mt-2">{metrics.interviewing}</span>
            </div>
            <div className="text-xs text-slate-400 mt-3 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Kalendervorbereitung nötig
            </div>
          </div>

          <div className="professional-card p-5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Angebote erhalten</span>
              <span className="text-3xl font-bold text-emerald-400 dark:text-emerald-450 block mt-2">{metrics.offers}</span>
            </div>
            <div className="text-xs text-emerald-400 mt-3 flex items-center gap-1.5 font-semibold bg-emerald-950/30 px-2 py-0.5 rounded-full w-max">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Herzlichen Glückwunsch!
            </div>
          </div>

          <div className="professional-card p-5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Absagen</span>
              <span className="text-3xl font-bold text-rose-500 dark:text-rose-450 block mt-2">{metrics.rejected}</span>
            </div>
            <div className="text-xs text-slate-400 mt-3 flex items-center gap-1">
              Statistik-Übersicht
            </div>
          </div>
        </div>

        {isInboxScanned && (
          <div className="space-y-4">
            <div className="pb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider m-0 flex items-center gap-2"><Mail className="h-4 w-4 text-blue-400" /> Erkannte Bewerbungs-Mails ({emailUpdates.length})</h3>
              <span className="text-xs text-slate-300 font-mono bg-slate-900 border border-white/5 px-2 py-0.5 rounded">Gefiltert in dieser Sitzung</span>
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
                          {count > 0 ? neueBewerbungen.map((update, idx) => renderEmailUpdateRow(update, false)) : <p className="text-xs text-slate-500 italic text-center py-4">Keine Mails in dieser Kategorie.</p>}
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
                        <button type="button" onClick={() => setIsStatusExpanded(!isStatusExpanded)} className="flex items-center gap-2 text-xs font-bold text-slate-100 bg-transparent border-none outline-none cursor-pointer">
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
        {/* Global Trackings list datatable grid */}
        <div id="grid-table-container" className="professional-card p-6">

          {/* Header title controller and Search bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-[#E2E8F0] dark:border-slate-800 gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#1E293B] dark:text-slate-100 uppercase tracking-wider m-0 flex items-center gap-2">
                <Table className="h-4.5 w-4.5 text-[#2563EB] dark:text-blue-400" /> Aktuelle Bewerbungsdatenbank
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 m-0">
                Doppelklick zum Bearbeiten von Zellen. Klicken Sie auf "Speichern", um alle Änderungen zu übernehmen.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {selectedRowIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0 animate-in fade-in zoom-in-95 duration-150"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {selectedRowIds.size} Löschen
                </button>
              )}

              {Object.keys(draftChanges).length > 0 && (
                <div className="flex items-center gap-2 shrink-0 bg-slate-950/20 p-1 rounded-lg border border-white/5 animate-in fade-in zoom-in-95 duration-150">
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
                  className="bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 py-1 px-2.5 rounded-lg text-xs text-[#1E293B] dark:text-slate-200 font-medium cursor-pointer focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
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
                    <option value="Received">Received</option>
                    <option value="Unknown">Unknown</option>
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
                <table className="w-full text-left border-collapse text-xs table-fixed">
                  <thead>
                    <tr className="professional-table-header border-b border-[#E2E8F0] dark:border-slate-800/80">
                      <th style={{ width: columnWidths.select }} className="p-3 text-center bg-slate-50/20 dark:bg-slate-900/10">
                        <input
                          type="checkbox"
                          checked={filteredAndSortedApplications.length > 0 && filteredAndSortedApplications.every(app => selectedRowIds.has(app.id))}
                          onChange={() => handleToggleSelectAll(filteredAndSortedApplications)}
                          className="rounded border-[#E2E8F0] dark:border-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                        />
                      </th>
                      <th style={{ width: columnWidths.id }} className="p-3 text-center bg-slate-50/20 dark:bg-slate-900/10">Zeile</th>
                      <th style={{ width: columnWidths.company, position: 'relative' }} className="p-3 select-none">
                        <span className="truncate block pr-2">Unternehmen</span>
                        <div
                          onMouseDown={(e) => startResize(e, 'company')}
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-10"
                          style={{ touchAction: 'none' }}
                        />
                      </th>
                      <th style={{ width: columnWidths.role, position: 'relative' }} className="p-3 select-none">
                        <span className="truncate block pr-2">Stelle / Rolle</span>
                        <div
                          onMouseDown={(e) => startResize(e, 'role')}
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-10"
                          style={{ touchAction: 'none' }}
                        />
                      </th>
                      <th style={{ width: columnWidths.status, position: 'relative' }} className="p-3 select-none">
                        <span className="truncate block pr-2">Status</span>
                        <div
                          onMouseDown={(e) => startResize(e, 'status')}
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-10"
                          style={{ touchAction: 'none' }}
                        />
                      </th>
                      <th style={{ width: columnWidths.date, position: 'relative' }} className="p-3 select-none">
                        <span className="truncate block pr-2">Bewerbungsdatum</span>
                        <div
                          onMouseDown={(e) => startResize(e, 'date')}
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-10"
                          style={{ touchAction: 'none' }}
                        />
                      </th>
                      <th style={{ width: columnWidths.location, position: 'relative' }} className="p-3 select-none">
                        <span className="truncate block pr-2">Standort</span>
                        <div
                          onMouseDown={(e) => startResize(e, 'location')}
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-10"
                          style={{ touchAction: 'none' }}
                        />
                      </th>
                      <th style={{ width: columnWidths.anstellungsart, position: 'relative' }} className="p-3 select-none">
                        <span className="truncate block pr-2">Anstellungsart</span>
                        <div
                          onMouseDown={(e) => startResize(e, 'anstellungsart')}
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-10"
                          style={{ touchAction: 'none' }}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60">
                    {filteredAndSortedApplications.map((app) => {
                      const isSelected = selectedRowIds.has(app.id);
                      const hasDraft = !!draftChanges[app.id];
                      return (
                        <tr
                          key={app.id}
                          className={`${isSelected ? "bg-blue-500/5 dark:bg-blue-600/5" : "bg-white dark:bg-[#111827]"} transition-colors`}
                        >
                          <td style={{ width: columnWidths.select }} className="p-3.5 text-center border-r border-[#E2E8F0] dark:border-slate-800">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRowSelect(app.id)}
                              className="rounded border-[#E2E8F0] dark:border-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                            />
                          </td>
                          <td style={{ width: columnWidths.id }} className="p-3.5 text-center font-mono text-[10px] text-[#64748B] dark:text-slate-400 font-bold bg-[#F8FAFC]/50 dark:bg-slate-900/40 border-r border-[#E2E8F0] dark:border-slate-800 relative">
                            {app.id}
                            {hasDraft && (
                              <span className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-amber-500" title="Ungespeicherte Änderungen"></span>
                            )}
                          </td>
                          <td
                            style={{ width: columnWidths.company }}
                            className="p-3.5 font-bold text-[#1E293B] dark:text-slate-100 cursor-default truncate overflow-hidden whitespace-nowrap"
                            onDoubleClick={() => startEditing(app.id, "company", draftChanges[app.id]?.company ?? app.company)}
                          >
                            {editingCell?.id === app.id && editingCell.field === "company" ? (
                              <input
                                autoFocus
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => saveEditing(app.id, "company")}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEditing(app.id, "company");
                                  if (e.key === "Escape") cancelEditing();
                                }}
                                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md text-xs"
                              />
                            ) : (
                              draftChanges[app.id]?.company ?? app.company
                            )}
                          </td>
                          <td
                            style={{ width: columnWidths.role }}
                            className="p-3.5 font-medium text-[#64748B] dark:text-slate-350 cursor-default truncate overflow-hidden whitespace-nowrap"
                            onDoubleClick={() => startEditing(app.id, "role", draftChanges[app.id]?.role ?? app.role)}
                          >
                            {editingCell?.id === app.id && editingCell.field === "role" ? (
                              <input
                                autoFocus
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => saveEditing(app.id, "role")}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEditing(app.id, "role");
                                  if (e.key === "Escape") cancelEditing();
                                }}
                                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md text-xs"
                              />
                            ) : (
                              draftChanges[app.id]?.role ?? app.role
                            )}
                          </td>
                          <td style={{ width: columnWidths.status }} className="p-3.5 overflow-visible">
                            {isSavingDrafts && draftChanges[app.id] ? (
                              <div className="flex items-center gap-1 font-semibold text-slate-400 py-1">
                                <RefreshCw className="h-3 w-3 animate-spin text-slate-450" /> Speichere...
                              </div>
                            ) : (
                              <div className="relative inline-block w-full text-[#1E293B] dark:text-slate-200">
                                <select
                                  id={`status-select-${app.id}`}
                                  value={draftChanges[app.id]?.status ?? app.status ?? "Applied"}
                                  onChange={(e) => handleUpdateStatusDraft(app.id, e.target.value as JobApplication["status"])}
                                  className={`w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md text-xs font-semibold focus:outline-none cursor-pointer text-slate-800 dark:text-slate-200 ${getStatusColorClass(draftChanges[app.id]?.status ?? app.status)}`}
                                >
                                  <option value="Applied" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Applied</option>
                                  <option value="Interview" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Interview</option>
                                  <option value="Offer" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Offer</option>
                                  <option value="Rejected" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Rejected</option>
                                  <option value="Received" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Received</option>
                                  <option value="Unknown" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Unknown</option>
                                </select>
                              </div>
                            )}
                          </td>
                          <td
                            style={{ width: columnWidths.date }}
                            className="p-3.5 text-[#64748B] dark:text-slate-350 font-medium cursor-default truncate overflow-hidden whitespace-nowrap"
                            onDoubleClick={() => startEditing(app.id, "date", draftChanges[app.id]?.date ?? app.date ?? "")}
                          >
                            {editingCell?.id === app.id && editingCell.field === "date" ? (
                              <input
                                autoFocus
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => saveEditing(app.id, "date")}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEditing(app.id, "date");
                                  if (e.key === "Escape") cancelEditing();
                                }}
                                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md text-xs"
                              />
                            ) : (
                              draftChanges[app.id]?.date ?? app.date
                            )}
                          </td>
                          <td
                            style={{ width: columnWidths.location }}
                            className="p-3.5 text-[#64748B] dark:text-slate-350 font-medium cursor-default truncate overflow-hidden whitespace-nowrap"
                            onDoubleClick={() => startEditing(app.id, "location", draftChanges[app.id]?.location ?? app.location ?? "")}
                          >
                            {editingCell?.id === app.id && editingCell.field === "location" ? (
                              <input
                                autoFocus
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => saveEditing(app.id, "location")}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEditing(app.id, "location");
                                  if (e.key === "Escape") cancelEditing();
                                }}
                                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md text-xs"
                              />
                            ) : (
                              draftChanges[app.id]?.location ?? app.location ?? "N/A"
                            )}
                          </td>
                          <td
                            style={{ width: columnWidths.anstellungsart }}
                            className="p-3.5 text-[#64748B] dark:text-slate-350 font-medium cursor-default truncate overflow-hidden whitespace-nowrap"
                            onDoubleClick={() => startEditing(app.id, "anstellungsart", draftChanges[app.id]?.anstellungsart ?? app.anstellungsart ?? "")}
                          >
                            {editingCell?.id === app.id && editingCell.field === "anstellungsart" ? (
                              <input
                                autoFocus
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => saveEditing(app.id, "anstellungsart")}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEditing(app.id, "anstellungsart");
                                  if (e.key === "Escape") cancelEditing();
                                }}
                                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md text-xs"
                              />
                            ) : (
                              draftChanges[app.id]?.anstellungsart ?? app.anstellungsart ?? "N/A"
                            )}
                          </td>
                        </tr>
                      );
                    })}
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

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-white/5 rounded-xl max-w-md w-full overflow-hidden shadow-2xl p-6 text-left"
            >
              <div className="flex items-start gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${confirmModal.type === "danger"
                    ? "bg-rose-500/10 text-rose-400"
                    : confirmModal.type === "warning"
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}>
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-base font-bold text-slate-100 m-0">
                    {confirmModal.title}
                  </h3>
                  <p className="text-sm text-slate-300 m-0 leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                >
                  {confirmModal.cancelText}
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer text-white ${confirmModal.type === "danger"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : confirmModal.type === "warning"
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
