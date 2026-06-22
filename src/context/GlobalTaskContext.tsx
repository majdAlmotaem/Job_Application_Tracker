import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import { EmailUpdate, JobSearchResultItem, JobSearchCriteria, JobApplication } from "../types";
import { initAuth, googleSignIn, googleSignOut } from "../services/googleAuth";
import { useSavedSearches, SavedSearch } from "../hooks/useSavedSearches";

interface PendingTab {
  key: string;
  label: string;
}

interface ConfirmModalOptions {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: "danger" | "warning" | "info";
  onConfirm: () => void;
}

interface GlobalTaskContextType {
  // Email Sync States
  isEmailSyncRunning: boolean;
  emailSyncProgress: number;
  emailSyncPhase: string;
  emailSyncDetails: string;
  startEmailSync: (initialPhase?: string, initialDetails?: string) => void;
  updateEmailSync: (progress: number, phase: string, details: string) => void;
  stopEmailSync: () => void;

  // Job Search States
  isJobSearchRunning: boolean;
  jobSearchProgress: number;
  jobSearchPhase: string;
  jobSearchDetails: string;
  startJobSearch: (initialPhase?: string, initialDetails?: string) => void;
  updateJobSearch: (progress: number, phase: string, details: string) => void;
  stopJobSearch: () => void;
  
  jobSearchResults: JobSearchResultItem[];
  setJobSearchResults: React.Dispatch<React.SetStateAction<JobSearchResultItem[]>>;
  jobSearchError: string | null;
  setJobSearchError: (error: string | null) => void;
  startBackgroundJobSearch: (
    criteria: JobSearchCriteria,
    activeSearchId: number | null,
    saveSearchToActiveTab?: (criteria: any, results: any[]) => Promise<any>
  ) => Promise<void>;

  // Hoisted Gmail Sync States
  isInboxScanned: boolean;
  setIsInboxScanned: (scanned: boolean) => void;
  emailUpdates: EmailUpdate[];
  setEmailUpdates: React.Dispatch<React.SetStateAction<EmailUpdate[]>>;

  // Google Authentication
  user: User | null;
  token: string | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
  googleSignInWrapper: () => Promise<any>;

  // Table Configuration & Tabs
  selectedTable: string;
  setSelectedTable: React.Dispatch<React.SetStateAction<string>>;
  availableTables: string[];
  setAvailableTables: React.Dispatch<React.SetStateAction<string[]>>;
  pendingTabs: PendingTab[];
  setPendingTabs: React.Dispatch<React.SetStateAction<PendingTab[]>>;
  loadTables: () => Promise<void>;
  handleNewTab: () => void;
  promotePendingTab: () => void;
  isPendingTab: boolean;

  // Daily Goal
  dailyGoal: number;
  setDailyGoal: React.Dispatch<React.SetStateAction<number>>;

  // Modals & Notifications
  confirmModal: ConfirmModalOptions;
  setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalOptions>>;
  triggerConfirm: (options: {
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  }) => void;
  notification: { type: "success" | "error"; message: string } | null;
  triggerToast: (type: "success" | "error", message: string) => void;

  // Saved Searches
  savedTabs: SavedSearch[];
  activeSearchId: number | null;
  setActiveSearchId: (id: number | null) => void;
  loadSavedSearches: () => Promise<any>;
  createNewSearchTab: (name?: string) => Promise<any>;
  saveSearchToActiveTab: (criteria: any, results: any[]) => Promise<any>;
  deleteSearchTab: (id: number) => Promise<void>;
  renameSearchTab: (id: number, newName: string) => Promise<any>;

  // Hoisted Core Applications List
  applications: JobApplication[];
  setApplications: React.Dispatch<React.SetStateAction<JobApplication[]>>;
}

const GlobalTaskContext = createContext<GlobalTaskContextType | undefined>(undefined);

export const GlobalTaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Email Sync States
  const [isEmailSyncRunning, setIsEmailSyncRunning] = useState(false);
  const [emailSyncProgress, setEmailSyncProgress] = useState(0);
  const [emailSyncPhase, setEmailSyncPhase] = useState("");
  const [emailSyncDetails, setEmailSyncDetails] = useState("");

  // Job Search States
  const [isJobSearchRunning, setIsJobSearchRunning] = useState(false);
  const [jobSearchProgress, setJobSearchProgress] = useState(0);
  const [jobSearchPhase, setJobSearchPhase] = useState("");
  const [jobSearchDetails, setJobSearchDetails] = useState("");
  
  const [jobSearchResults, setJobSearchResults] = useState<JobSearchResultItem[]>([]);
  const [jobSearchError, setJobSearchError] = useState<string | null>(null);

  // Hoisted Gmail Sync States
  const [isInboxScanned, setIsInboxScanned] = useState<boolean>(false);
  const [emailUpdates, setEmailUpdates] = useState<EmailUpdate[]>([]);

  // Auth States
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Table Configuration & Tabs
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [pendingTabs, setPendingTabs] = useState<PendingTab[]>([]);
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem("syncsheet_daily_goal");
    return saved ? parseInt(saved, 10) : 5;
  });

  // Hoisted Applications State
  const [applications, setApplications] = useState<JobApplication[]>([]);

  // Toast & Notifications
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalOptions>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Bestätigen",
    cancelText: "Abbrechen",
    type: "info",
    onConfirm: () => { },
  });

  const triggerToast = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
  }, []);

  const triggerConfirm = useCallback((options: {
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
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        options.onConfirm();
      },
    });
  }, []);

  // Saved Searches Custom Hook
  const {
    savedTabs,
    activeSearchId,
    setActiveSearchId,
    loadTabs: loadSavedSearches,
    createNewTab: createNewSearchTab,
    saveSearchToActiveTab,
    deleteTab: deleteSearchTab,
    renameTab: renameSearchTab,
  } = useSavedSearches(triggerToast);

  // Sync dailyGoal to localstorage
  useEffect(() => {
    localStorage.setItem("syncsheet_daily_goal", dailyGoal.toString());
  }, [dailyGoal]);

  // Load available tables from API
  const loadTables = async () => {
    try {
      const response = await fetch("/api/applications/tables");
      if (!response.ok) throw new Error("Failed to load tables");
      const tables: string[] = await response.json();
      
      const customTables = tables.filter((t) => t !== "job_applications");
      setAvailableTables(tables);
      
      setSelectedTable((prev) => {
        if (customTables.length > 0) {
          if (prev && prev !== "job_applications" && tables.includes(prev)) {
            return prev;
          }
          return customTables[0];
        }
        return "";
      });
    } catch (err) {
      console.error("Error loading tables:", err);
      setAvailableTables([]);
      setSelectedTable("");
    }
  };

  useEffect(() => {
    loadTables();
    loadSavedSearches();
    
    // Auth init
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Dismiss notification toast after 5s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Remove pending tab whose key now appears in availableTables
  useEffect(() => {
    setPendingTabs((prev) => prev.filter((pt) => !availableTables.includes(pt.key)));
  }, [availableTables]);

  const handleNewTab = () => {
    const base = "neue_liste";
    const taken = [...availableTables, ...pendingTabs.map((p) => p.key)];
    let key = base;
    let label = "Neue Liste";
    let i = 2;
    while (taken.includes(key)) {
      key = `${base}_${i}`;
      label = `Neue Liste ${i}`;
      i++;
    }
    setPendingTabs((prev) => [...prev, { key, label }]);
    setSelectedTable(key);
  };

  const isPendingTab = pendingTabs.some((pt) => pt.key === selectedTable);
  const promotePendingTab = () => {
    if (isPendingTab) {
      setPendingTabs((prev) => prev.filter((pt) => pt.key !== selectedTable));
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const authResult = await googleSignIn();
      if (authResult) {
        setToken(authResult.accessToken);
        setUser(authResult.user);
        triggerToast("success", "Erfolgreich mit Google verbunden.");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("error", err.message || "Authentifizierung fehlgeschlagen.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await googleSignOut();
      setToken(null);
      setUser(null);
      triggerToast("success", "Verbindung zu Google getrennt.");
    } catch (err: any) {
      console.error(err);
      triggerToast("error", err.message || "Fehler beim Abmelden.");
    }
  };

  const googleSignInWrapper = async () => {
    try {
      const authResult = await googleSignIn();
      if (authResult) {
        setToken(authResult.accessToken);
        setUser(authResult.user);
        return authResult;
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("error", err.message || "Authentifizierung fehlgeschlagen.");
    }
    return null;
  };

  const startEmailSync = (initialPhase = "Task gestartet...", initialDetails = "Bitte warten...") => {
    setIsEmailSyncRunning(true);
    setEmailSyncProgress(0);
    setEmailSyncPhase(initialPhase);
    setEmailSyncDetails(initialDetails);
  };

  const updateEmailSync = (progress: number, phase: string, details: string) => {
    setEmailSyncProgress(progress);
    setEmailSyncPhase(phase);
    setEmailSyncDetails(details);
  };

  const stopEmailSync = () => {
    setIsEmailSyncRunning(false);
  };

  const startJobSearch = (initialPhase = "Task gestartet...", initialDetails = "Bitte warten...") => {
    setIsJobSearchRunning(true);
    setJobSearchProgress(0);
    setJobSearchPhase(initialPhase);
    setJobSearchDetails(initialDetails);
  };

  const updateJobSearch = (progress: number, phase: string, details: string) => {
    setJobSearchProgress(progress);
    setJobSearchPhase(phase);
    setJobSearchDetails(details);
  };

  const stopJobSearch = () => {
    setIsJobSearchRunning(false);
  };

  const startBackgroundJobSearch = async (
    criteria: JobSearchCriteria,
    activeSearchId: number | null,
    saveSearchToActiveTab?: (criteria: any, results: any[]) => Promise<any>
  ) => {
    if (isJobSearchRunning) return;

    setJobSearchError(null);
    setJobSearchResults([]);
    startJobSearch("Suchanfrage wird formatiert...", "Kriterien werden analysiert");

    let currentProgress = 5;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 8) + 2;
      if (currentProgress >= 95) {
        currentProgress = 95;
        updateJobSearch(95, "Stellenanzeigen werden extrahiert...", "Die passendsten Angebote werden ausgewählt");
      } else {
        let phaseStr = "Job-Suche läuft...";
        let detailsStr = "";
        if (currentProgress > 75) {
          phaseStr = "Stellenanzeigen werden extrahiert...";
          detailsStr = "Die passendsten Angebote werden ausgewählt";
        } else if (currentProgress > 50) {
          phaseStr = "Live-Websuche läuft...";
          detailsStr = "Google-Suchergebnisse werden analysiert";
        } else if (currentProgress > 25) {
          phaseStr = "Suchkriterien werden verarbeitet...";
          detailsStr = "Gemini initiiert die Google-Suche";
        } else {
          phaseStr = "Suchanfrage wird formatiert...";
          detailsStr = "Kriterien werden analysiert";
        }
        updateJobSearch(currentProgress, phaseStr, detailsStr);
      }
    }, 500);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes timeout

    try {
      const response = await fetch("/api/jobs/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(criteria),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Die Jobsuche ist fehlgeschlagen.");
      }

      const data = await response.json();
      const results = data.results || [];
      setJobSearchResults(results);

      if (activeSearchId !== null && saveSearchToActiveTab) {
        await saveSearchToActiveTab(criteria, results);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      clearInterval(interval);
      console.error("Fehler bei der Jobsuche im Hintergrund:", err);
      if (err.name === "AbortError") {
        setJobSearchError("Zeitüberschreitung bei der Jobsuche (Limit: 10 Min.).");
      } else {
        setJobSearchError(err.message || "Ein unerwarteter Fehler ist aufgetreten.");
      }
    } finally {
      stopJobSearch();
    }
  };

  return (
    <GlobalTaskContext.Provider
      value={{
        isEmailSyncRunning,
        emailSyncProgress,
        emailSyncPhase,
        emailSyncDetails,
        startEmailSync,
        updateEmailSync,
        stopEmailSync,
        isJobSearchRunning,
        jobSearchProgress,
        jobSearchPhase,
        jobSearchDetails,
        startJobSearch,
        updateJobSearch,
        stopJobSearch,
        jobSearchResults,
        setJobSearchResults,
        jobSearchError,
        setJobSearchError,
        startBackgroundJobSearch,
        isInboxScanned,
        setIsInboxScanned,
        emailUpdates,
        setEmailUpdates,
        user,
        token,
        needsAuth,
        isLoggingIn,
        handleLogin,
        handleLogout,
        googleSignInWrapper,
        selectedTable,
        setSelectedTable,
        availableTables,
        setAvailableTables,
        pendingTabs,
        setPendingTabs,
        loadTables,
        handleNewTab,
        promotePendingTab,
        isPendingTab,
        dailyGoal,
        setDailyGoal,
        confirmModal,
        setConfirmModal,
        triggerConfirm,
        notification,
        triggerToast,
        savedTabs,
        activeSearchId,
        setActiveSearchId,
        loadSavedSearches,
        createNewSearchTab,
        saveSearchToActiveTab,
        deleteSearchTab,
        renameSearchTab,
        applications,
        setApplications,
      }}
    >
      {children}
    </GlobalTaskContext.Provider>
  );
};

export const useGlobalTask = () => {
  const context = useContext(GlobalTaskContext);
  if (!context) {
    throw new Error("useGlobalTask must be used within a GlobalTaskProvider");
  }
  return context;
};
