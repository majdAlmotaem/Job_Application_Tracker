import React, { createContext, useContext, useState, ReactNode } from "react";
import { EmailUpdate, JobSearchResultItem, JobSearchCriteria } from "../types";

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
