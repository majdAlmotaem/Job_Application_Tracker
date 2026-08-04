import { useState, useMemo } from "react";
import { JobApplication, InterviewReminder } from "../types";
import { getLocalDateString } from "../utils/matchingLogic";
import { parseGermanDate } from "../utils/dateFormatter";

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
  const [reminderDate, setReminderDate] = useState(() => getLocalDateString());
  const [reminderTime, setReminderTime] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const [reminderAppId, setReminderAppId] = useState("");

  const todayStr = useMemo(() => getLocalDateString(), []);

  // Compute active reminders directly from applications (No background network loops!)
  const activeReminders: InterviewReminder[] = useMemo(() => {
    const todayNum = parseGermanDate(todayStr);
    return applications
      .filter((app) => app.stage === "Interview" && app.status === "Open" && app.interview_date && parseGermanDate(app.interview_date) >= todayNum)
      .map((app) => ({
        id: app.id,
        applicationId: app.id,
        company: app.company,
        date: app.interview_date!,
        time: app.interview_time,
        note: app.interview_note,
        tableName: selectedTable,
      }));
  }, [applications, selectedTable, todayStr]);

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
        body: JSON.stringify({
          interview_date: reminderDate,
          interview_time: reminderTime || null,
          interview_note: reminderNote || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to save to DB");
      const updatedApp = await response.json();
      setApplications((prev) => prev.map((app) => (app.id === reminderAppId ? updatedApp : app)));
      setReminderModalOpen(false);
      triggerToast("success", `Termin für ${linkedApp.company} gespeichert.`);
    } catch (err) {
      triggerToast("error", "Fehler beim Speichern in der Datenbank.");
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await fetch(`/api/applications/${id}?table_name=${encodeURIComponent(selectedTable)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_date: null,
          interview_time: null,
          interview_note: null,
        }),
      });
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, interview_date: undefined, interview_time: undefined, interview_note: undefined } : app))
      );
      triggerToast("success", "Terminerinnerung gelöscht.");
    } catch (err) {
      console.error("Failed to clear interview info in DB:", err);
      triggerToast("error", "Fehler beim Löschen des Termins.");
    }
  };

  const openReminderModal = (appId: string) => {
    const targetApp = applications.find((a) => a.id === appId);
    setReminderAppId(appId);
    setReminderDate(targetApp?.interview_date || getLocalDateString());
    setReminderTime(targetApp?.interview_time || "");
    setReminderNote(targetApp?.interview_note || "");
    setReminderModalOpen(true);
  };

  return {
    reminderModalOpen,
    setReminderModalOpen,
    reminderDate,
    setReminderDate,
    reminderTime,
    setReminderTime,
    reminderNote,
    setReminderNote,
    reminderAppId,
    setReminderAppId,
    activeReminders,
    handleSaveReminder,
    handleDeleteReminder,
    openReminderModal,
  };
};
