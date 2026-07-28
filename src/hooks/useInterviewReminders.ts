import { useState, useEffect } from "react";
import { JobApplication, InterviewReminder } from "../types";
import { getLocalDateString } from "../utils/matchingLogic";

export interface UseInterviewRemindersProps {
  selectedTable: string;
  applications: JobApplication[];
  setApplications: React.Dispatch<React.SetStateAction<JobApplication[]>>;
  triggerToast: (type: "success" | "error", message: string) => void;
}

export const useInterviewReminders = ({
  selectedTable,
  applications,
  setApplications,
  triggerToast,
}: UseInterviewRemindersProps) => {
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reminderAppId, setReminderAppId] = useState("");
  
  const [reminders, setReminders] = useState<InterviewReminder[]>(() => {
    const saved = localStorage.getItem("syncsheet_interview_reminders");
    return saved ? JSON.parse(saved) : [];
  });

  const todayStrForReminders = getLocalDateString();
  const activeReminders = reminders.filter((rem) => {
    if (rem.tableName !== selectedTable) return false;
    if (rem.date < todayStrForReminders) return false;
    const linkedApp = applications.find((app) => app.id === rem.applicationId);
    if (!linkedApp || linkedApp.stage !== "Interview") return false;
    return true;
  });

  useEffect(() => {
    const todayStr = getLocalDateString();

    // 1. Get all interview reminders from the loaded applications in the DB
    const dbReminders = applications
      .filter((app) => app.stage === "Interview" && app.interview_date && app.interview_date >= todayStr)
      .map((app) => ({
        id: `db-${app.id}`,
        applicationId: app.id,
        company: app.company,
        date: app.interview_date!,
        tableName: selectedTable,
      }));

    // 2. Start with reminders from other tables
    const otherTablesReminders = reminders.filter((r) => r.tableName !== selectedTable && r.date >= todayStr);

    // 3. For the current table, merge dbReminders and activeReminders from localStorage
    const currentTableActiveLocal = reminders.filter((r) => r.tableName === selectedTable && r.date >= todayStr);

    const mergedCurrentTableReminders: InterviewReminder[] = [...dbReminders];
    currentTableActiveLocal.forEach((localRem) => {
      const linkedApp = applications.find((app) => app.id === localRem.applicationId);
      if (linkedApp && linkedApp.stage === "Interview") {
        const alreadyInMerged = mergedCurrentTableReminders.some((r) => r.applicationId === localRem.applicationId);
        if (!alreadyInMerged) {
          mergedCurrentTableReminders.push(localRem);
          // Async save to database
          fetch(`/api/applications/${localRem.applicationId}?table_name=${encodeURIComponent(selectedTable)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ interview_date: localRem.date }),
          }).catch(console.error);
        }
      }
    });

    const prunedAll = [...otherTablesReminders, ...mergedCurrentTableReminders];

    // Prevent infinite loop by checking if values are actually different
    const stringify = (arr: any[]) =>
      JSON.stringify(arr.map((r) => ({ id: r.applicationId, date: r.date, table: r.tableName })).sort((a, b) => a.id.localeCompare(b.id)));
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
    const linkedApp = applications.find((app) => app.id === reminderAppId);
    if (!linkedApp) return;

    try {
      const response = await fetch(`/api/applications/${reminderAppId}?table_name=${encodeURIComponent(selectedTable)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interview_date: reminderDate }),
      });
      if (!response.ok) throw new Error("Failed to save to DB");
      const updatedApp = await response.json();
      setApplications((prev) => prev.map((app) => (app.id === reminderAppId ? updatedApp : app)));

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
    const rem = reminders.find((r) => r.id === id);
    if (rem) {
      try {
        await fetch(`/api/applications/${rem.applicationId}?table_name=${encodeURIComponent(selectedTable)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interview_date: null }),
        });
        setApplications((prev) =>
          prev.map((app) => (app.id === rem.applicationId ? { ...app, interview_date: undefined } : app))
        );
      } catch (err) {
        console.error("Failed to clear interview_date in DB:", err);
      }
    }
    const updated = reminders.filter((r) => r.id !== id);
    setReminders(updated);
    localStorage.setItem("syncsheet_interview_reminders", JSON.stringify(updated));
    triggerToast("success", "Terminerinnerung gelöscht.");
  };

  const openReminderModal = (appId: string) => {
    setReminderAppId(appId);
    setReminderDate(new Date().toISOString().split("T")[0]);
    setReminderModalOpen(true);
  };

  return {
    reminders,
    reminderModalOpen,
    setReminderModalOpen,
    reminderDate,
    setReminderDate,
    reminderAppId,
    setReminderAppId,
    activeReminders,
    handleSaveReminder,
    handleDeleteReminder,
    openReminderModal,
  };
};
