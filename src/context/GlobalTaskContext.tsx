import React, { createContext, useContext, useState, ReactNode } from "react";
import { EmailUpdate } from "../types";

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
