import { useState } from "react";
import { User } from "firebase/auth";
import { JobApplication, EmailUpdate } from "../types";
import { searchGmailMessages } from "../services/gmailService";
import {
  isSimilarCompany,
  isSameCompany,
  isSameRole,
  isUnknownValue,
  isDuplicateApplication,
  isFuzzyDuplicate,
  getLocalDateString,
} from "../utils/matchingLogic";
import { useGlobalTask } from "../context/GlobalTaskContext";

export interface UseGmailSyncProps {
  user: User | null;
  token: string | null;
  googleSignIn: () => Promise<any>;
  selectedTable: string;
  applications: JobApplication[];
  setApplications: React.Dispatch<React.SetStateAction<JobApplication[]>>;
  triggerToast: (type: "success" | "error", message: string) => void;
  triggerConfirm: (options: {
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  }) => void;
  onInterviewOpenTrigger?: (appId: string) => void;
}

export const useGmailSync = ({
  user,
  token,
  googleSignIn,
  selectedTable,
  applications,
  setApplications,
  triggerToast,
  triggerConfirm,
  onInterviewOpenTrigger,
}: UseGmailSyncProps) => {
  const {
    isEmailSyncRunning: isScanning,
    emailSyncProgress: syncProgress,
    emailSyncPhase: syncPhase,
    emailSyncDetails: syncDetails,
    startEmailSync: startAITask,
    updateEmailSync: updateAITask,
    stopEmailSync: stopAITask,
    isInboxScanned,
    setIsInboxScanned,
    emailUpdates,
    setEmailUpdates,
  } = useGlobalTask();
  const [syncingEmailId, setSyncingEmailId] = useState<string | null>(null);
  
  // UI states for expanding elements
  const [isNeueExpandedState, setIsNeueExpandedState] = useState<boolean>(() => {
    const saved = localStorage.getItem("syncsheet_neue_expanded");
    return saved !== "false";
  });
  const [isStatusExpandedState, setIsStatusExpandedState] = useState<boolean>(() => {
    const saved = localStorage.getItem("syncsheet_status_expanded");
    return saved !== "false";
  });

  const setIsNeueExpanded = (valOrFn: boolean | ((prev: boolean) => boolean)) => {
    setIsNeueExpandedState((prev) => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      localStorage.setItem("syncsheet_neue_expanded", String(next));
      return next;
    });
  };

  const setIsStatusExpanded = (valOrFn: boolean | ((prev: boolean) => boolean)) => {
    setIsStatusExpandedState((prev) => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      localStorage.setItem("syncsheet_status_expanded", String(next));
      return next;
    });
  };

  const isNeueExpanded = isNeueExpandedState;
  const isStatusExpanded = isStatusExpandedState;

  const [expandedEmailIds, setExpandedEmailIds] = useState<string[]>([]);

  const gmailQuery =
    'Bewerbung OR Interview OR Absage OR Vertrag OR Stelle OR Softwareentwickler OR Webentwickler OR candidate OR "vielen Dank für Ihre Bewerbung"';

  const getCompanyMatch = (companyName: string, role?: string) => {
    if (!companyName || isUnknownValue(companyName)) return null;
    if (role && !isUnknownValue(role)) {
      const matchWithRole = applications.find(
        (app) => isSameCompany(app.company, companyName) && isSameRole(app.role, role)
      );
      if (matchWithRole) return matchWithRole;
    }
    return applications.find((app) => isSameCompany(app.company, companyName)) || null;
  };

  const handleScanInboxAndAnalyze = async () => {
    let currentToken = token;
    if (!currentToken) {
      startAITask("Google Authentifizierung...", "Bitte authentifizieren Sie sich über das Google Popup...");
      try {
        const authResult = await googleSignIn();
        if (authResult) {
          currentToken = authResult.accessToken;
          triggerToast("success", "Erfolgreich mit Google verbunden.");
        } else {
          stopAITask();
          return;
        }
      } catch (err: any) {
        console.error(err);
        triggerToast("error", err.message || "Authentifizierung fehlgeschlagen.");
        stopAITask();
        return;
      }
    }

    startAITask("Gmail-Postfach durchsuchen...", "Verbindung mit Gmail wird hergestellt...");
    let progressInterval: any;
    try {
      const messages = await searchGmailMessages(currentToken!, gmailQuery, 10);
      const totalEmails = messages.length;

      if (totalEmails === 0) {
        updateAITask(100, "Keine E-Mails gefunden.", "Es wurden keine neuen E-Mails in Ihrem Postfach gefunden.");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        stopAITask();
        setIsInboxScanned(true);
        setEmailUpdates([]);
        triggerToast("success", "Keine E-Mails gefunden.");
        return;
      }

      updateAITask(15, "E-Mails analysieren...", `Gefunden: ${totalEmails} E-Mails. Analysiere via Gemini...`);
      const numChunks = Math.ceil(totalEmails / 5);

      // Start progress simulation interval
      let currentProgress = 15;
      const estSeconds = Math.max(15, numChunks * 20); // ca 20s per chunk
      const intervalMs = 300;
      const totalSteps = (estSeconds * 1000) / intervalMs;
      const stepIncrement = (95 - 15) / totalSteps;

      progressInterval = setInterval(() => {
        currentProgress += stepIncrement + Math.random() * 0.05;
        if (currentProgress >= 95) {
          currentProgress = 95;
          updateAITask(95, "E-Mails analysieren...", "Antwort wird finalisiert. Gleich fertig...");
        } else {
          let phaseStr = "E-Mails analysieren...";
          let detailsStr = "";
          if (currentProgress < 40) {
            detailsStr = `Analysiere E-Mails (Block 1/${numChunks})...`;
          } else if (currentProgress < 70) {
            const currentBlock = Math.min(numChunks, 2);
            detailsStr = `Extrahiere Firmen und Bewerbungsstatus (Block ${currentBlock}/${numChunks})...`;
          } else {
            const currentBlock = Math.min(numChunks, numChunks);
            detailsStr = `Ergebnisse werden strukturiert (Block ${currentBlock}/${numChunks})...`;
          }
          updateAITask(currentProgress, phaseStr, detailsStr);
        }
      }, intervalMs);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes timeout

      let response: Response;
      try {
        response = await fetch("/api/analyze-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: messages }),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === "AbortError") {
          throw new Error("Zeitüberschreitung bei der E-Mail-Analyse (Limit: 10 Min.).");
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Fehler bei der E-Mail-Analyse");
      }

      const backendData = await response.json();
      const updates: EmailUpdate[] = backendData.results.map((result: any) => {
        const raw = messages.find((m) => m.id === result.emailId) || {
          subject: "(Kein Betreff)",
          snippet: "",
          body: "",
          date: getLocalDateString(),
        };
        return {
          ...result,
          subject: raw.subject,
          snippet: raw.snippet,
          body: raw.body || "",
          date: raw.date,
          synced: false,
        };
      });

      let dismissedList: string[] = [];
      if (user) {
        dismissedList = JSON.parse(localStorage.getItem(`dismissed_emails_${user.uid}`) || "[]");
      }

      const filteredUpdates = updates.filter((up) => {
        if (!up.isJobRelated) return false;
        if (applications.some((app) => app.emailId === up.emailId)) return false;
        if (dismissedList.includes(up.emailId)) return false;
        const duplicateApp = applications.find((app) => isDuplicateApplication(app, up));
        if (duplicateApp && up.classification !== "Statuswechsel") return false;
        if (
          duplicateApp &&
          duplicateApp.stage.toLowerCase() === up.stage.toLowerCase() &&
          duplicateApp.status.toLowerCase() === up.status.toLowerCase()
        ) {
          return false;
        }
        return true;
      });

      updateAITask(100, "Synchronisierung erfolgreich!", `Analyse abgeschlossen. ${filteredUpdates.length} relevante Updates geladen.`);

      setEmailUpdates(filteredUpdates);
      setIsInboxScanned(true);
      triggerToast("success", `${filteredUpdates.length} Updates gefunden.`);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      stopAITask();
    } catch (err: any) {
      if (progressInterval) clearInterval(progressInterval);
      updateAITask(0, "Fehler bei der Synchronisierung", err.message || "Fehler beim E-Mail Scan.");
      triggerToast("error", err.message || "Fehler beim Scan.");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      stopAITask();
    }
  };

  const handleAcceptEmailChange = async (update: EmailUpdate) => {
    setSyncingEmailId(update.emailId);
    try {
      const match = getCompanyMatch(update.company, update.role);
      if (update.classification === "Statuswechsel" && match) {
        const response = await fetch(
          `/api/applications/${match.id}?table_name=${encodeURIComponent(selectedTable)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage: update.stage, status: update.status }),
          }
        );
        if (!response.ok) throw new Error("Failed to update stage/status");
        const updatedApp = await response.json();
        const updated = applications.map((app) => (app.id === match.id ? updatedApp : app));
        setApplications(updated);
      } else {
        const newApp = {
          company: update.company,
          role: update.role,
          stage: update.stage,
          status: update.status,
          date: update.date,
          location: update.location || "N/A",
          anstellungsart: update.anstellungsart || "N/A",
          emailId: update.emailId,
          source_file: selectedTable,
        };
        const response = await fetch(`/api/applications?table_name=${encodeURIComponent(selectedTable)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newApp),
        });
        if (!response.ok) throw new Error("Failed to create application");
        const savedApp = await response.json();
        setApplications([savedApp, ...applications]);
        if (update.stage === "Interview" && update.status === "Open") {
          onInterviewOpenTrigger?.(savedApp.id);
        }
      }
      if (update.classification === "Statuswechsel" && match) {
        if (update.stage === "Interview" && update.status === "Open") {
          onInterviewOpenTrigger?.(match.id);
        }
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
    setEmailUpdates((prev) => prev.map((up) => (up.emailId === emailId ? { ...up, dismissed: true } : up)));
    if (user) {
      const dismissed = JSON.parse(localStorage.getItem(`dismissed_emails_${user.uid}`) || "[]");
      dismissed.push(emailId);
      localStorage.setItem(`dismissed_emails_${user.uid}`, JSON.stringify(dismissed));
    }
    triggerToast("success", "Vorschlag verworfen.");
  };

  const handleUndoRefuseEmailUpdate = (emailId: string) => {
    setEmailUpdates((prev) => prev.map((up) => (up.emailId === emailId ? { ...up, dismissed: false } : up)));
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
      },
    });
  };

  const handleRejectAll = (updatesToReject: EmailUpdate[]) => {
    triggerConfirm({
      title: "Alle verwerfen",
      message: "Möchten Sie alle sichtbaren Einträge dieser Kategorie verwerfen?",
      confirmText: "Verwerfen",
      type: "danger",
      onConfirm: () => {
        updatesToReject.forEach((up) => handleRefuseEmailUpdate(up.emailId));
        triggerToast("success", "Alle verworfen.");
      },
    });
  };

  const toggleEmailExpansion = (emailId: string) => {
    setExpandedEmailIds((prev) =>
      prev.includes(emailId) ? prev.filter((id) => id !== emailId) : [...prev, emailId]
    );
  };

  return {
    isScanning,
    syncProgress,
    syncPhase,
    syncDetails,
    isInboxScanned,
    emailUpdates,
    syncingEmailId,
    isNeueExpanded,
    setIsNeueExpanded,
    isStatusExpanded,
    setIsStatusExpanded,
    expandedEmailIds,
    toggleEmailExpansion,
    handleScanInboxAndAnalyze,
    handleAcceptEmailChange,
    handleRefuseEmailUpdate,
    handleUndoRefuseEmailUpdate,
    handleAcceptAll,
    handleRejectAll,
    getCompanyMatch,
  };
};
