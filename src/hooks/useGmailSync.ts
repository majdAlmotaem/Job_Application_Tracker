import { useState } from "react";
import { User } from "firebase/auth";
import { JobApplication, EmailUpdate } from "../types";
import { searchGmailMessages } from "../services/gmailService";
import { isSimilarCompany, isFuzzyDuplicate } from "../utils/matchingLogic";

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
}: UseGmailSyncProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncPhase, setSyncPhase] = useState("Gmail-Postfach durchsuchen...");
  const [syncDetails, setSyncDetails] = useState("Hole E-Mails aus Ihrem Gmail-Postfach...");
  const [isInboxScanned, setIsInboxScanned] = useState<boolean>(false);
  const [emailUpdates, setEmailUpdates] = useState<EmailUpdate[]>([]);
  const [syncingEmailId, setSyncingEmailId] = useState<string | null>(null);
  
  // UI states for expanding elements
  const [isNeueExpanded, setIsNeueExpanded] = useState<boolean>(true);
  const [isStatusExpanded, setIsStatusExpanded] = useState<boolean>(true);
  const [expandedEmailIds, setExpandedEmailIds] = useState<string[]>([]);

  const gmailQuery =
    'Bewerbung OR Interview OR Absage OR Vertrag OR Stelle OR Softwareentwickler OR Webentwickler OR candidate OR "vielen Dank für Ihre Bewerbung"';

  const getCompanyMatch = (companyName: string) => {
    if (!companyName) return null;
    return applications.find((app) => isSimilarCompany(app.company, companyName));
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
        await new Promise((resolve) => setTimeout(resolve, 1500));
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
        currentProgress += stepIncrement + Math.random() * 0.05;
        if (currentProgress >= 95) {
          currentProgress = 95;
          setSyncDetails("Antwort wird finalisiert. Gleich fertig...");
        } else {
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
        const raw = messages.find((m) => m.id === result.emailId) || {
          subject: "(Kein Betreff)",
          snippet: "",
          body: "",
          date: new Date().toLocaleDateString(),
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
        const fuzzyDuplicate = applications.find((app) => isFuzzyDuplicate(app, up));
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
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setIsScanning(false);
    } catch (err: any) {
      if (progressInterval) clearInterval(progressInterval);
      setSyncProgress(0);
      setSyncPhase("Fehler bei der Synchronisierung");
      setSyncDetails(err.message || "Fehler beim E-Mail Scan.");
      triggerToast("error", err.message || "Fehler beim Scan.");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      setIsScanning(false);
    }
  };

  const handleAcceptEmailChange = async (update: EmailUpdate) => {
    setSyncingEmailId(update.emailId);
    try {
      const match = getCompanyMatch(update.company);
      if (update.classification === "Statuswechsel" && match) {
        const response = await fetch(
          `/api/applications/${match.id}?table_name=${encodeURIComponent(selectedTable)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: update.status }),
          }
        );
        if (!response.ok) throw new Error("Failed to update status");
        const updatedApp = await response.json();
        const updated = applications.map((app) => (app.id === match.id ? updatedApp : app));
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
