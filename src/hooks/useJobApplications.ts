import { useState, useEffect } from "react";
import { JobApplication, ApplicationStage, ApplicationStatus } from "../types";

export interface UseJobApplicationsProps {
  selectedTable: string;
  isPendingTab: boolean;
  triggerToast: (type: "success" | "error", message: string) => void;
  triggerConfirm: (options: {
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  }) => void;
  loadTables: () => Promise<void>;
  promotePendingTab: () => void;
  applications: JobApplication[];
  setApplications: React.Dispatch<React.SetStateAction<JobApplication[]>>;
  onInterviewOpenTrigger?: (appId: string) => void;
}

export const useJobApplications = ({
  selectedTable,
  isPendingTab,
  triggerToast,
  triggerConfirm,
  loadTables,
  promotePendingTab,
  applications,
  setApplications,
  onInterviewOpenTrigger,
}: UseJobApplicationsProps) => {
  const [isFetchingApps, setIsFetchingApps] = useState(false);
  const [draftChanges, setDraftChanges] = useState<Record<string, Partial<JobApplication>>>({});
  const [isSavingDrafts, setIsSavingDrafts] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isSavingManual, setIsSavingManual] = useState(false);

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

  useEffect(() => {
    if (!selectedTable) {
      setApplications([]);
      return;
    }
    if (isPendingTab) {
      setApplications([]);
    } else {
      loadApplications(selectedTable);
    }
  }, [selectedTable, isPendingTab]);

  const handleUpdateStageDraft = (rowId: string, newStage: ApplicationStage) => {
    setDraftChanges((prev) => {
      const rowChanges = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...rowChanges,
          stage: newStage,
        },
      };
    });
    triggerToast("success", "Stufe-Entwurf geändert.");

    // Trigger Requirement 4: Auto-open appointment modal if stage === "Interview" and status === "Open"
    const currentApp = applications.find((a) => a.id === rowId);
    const effectiveStatus = draftChanges[rowId]?.status ?? currentApp?.status ?? "Open";
    if (newStage === "Interview" && effectiveStatus === "Open") {
      onInterviewOpenTrigger?.(rowId);
    }
  };

  const handleUpdateStatusDraft = (rowId: string, newStatus: ApplicationStatus) => {
    setDraftChanges((prev) => {
      const rowChanges = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...rowChanges,
          status: newStatus,
        },
      };
    });
    triggerToast("success", "Status-Entwurf geändert.");

    // Trigger Requirement 4: Auto-open appointment modal if status === "Open" and stage === "Interview"
    const currentApp = applications.find((a) => a.id === rowId);
    const effectiveStage = draftChanges[rowId]?.stage ?? currentApp?.stage ?? "Applied";
    if (newStatus === "Open" && effectiveStage === "Interview") {
      onInterviewOpenTrigger?.(rowId);
    }
  };

  const updateDraftField = (id: string, field: string, value: string) => {
    setDraftChanges((prev) => {
      const rowChanges = prev[id] || {};
      return {
        ...prev,
        [id]: {
          ...rowChanges,
          [field]: value,
        },
      };
    });
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
          body: JSON.stringify(updates),
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
      },
    });
  };

  const handleToggleRowSelect = (id: string) => {
    setSelectedRowIds((prev) => {
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
    const filteredIds = filteredApps.map((app) => app.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedRowIds.has(id));

    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
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
            body: JSON.stringify({ ids: idsToDelete }),
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
      },
    });
  };

  const addManualApplication = async (app: {
    company: string;
    role: string;
    stage: ApplicationStage;
    status: ApplicationStatus;
    date: string;
    location: string;
    anstellungsart: string;
  }) => {
    setIsSavingManual(true);
    try {
      const newApp = {
        ...app,
        source_file: selectedTable,
      };
      const response = await fetch(`/api/applications?table_name=${encodeURIComponent(selectedTable)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newApp),
      });
      if (!response.ok) throw new Error("Failed to save application");
      const savedApp = await response.json();
      setApplications((prev) => [savedApp, ...prev]);
      triggerToast("success", "Manuell hinzugefügt.");
      promotePendingTab();
      await loadTables();

      // Trigger Requirement 4: Auto open reminder modal if new app has stage === "Interview" & status === "Open"
      if (app.stage === "Interview" && app.status === "Open") {
        onInterviewOpenTrigger?.(savedApp.id);
      }

      return true;
    } catch (err: any) {
      triggerToast("error", "Fehler beim Speichern.");
      return false;
    } finally {
      setIsSavingManual(false);
    }
  };

  return {
    applications,
    setApplications,
    isFetchingApps,
    setIsFetchingApps,
    draftChanges,
    setDraftChanges,
    isSavingDrafts,
    selectedRowIds,
    setSelectedRowIds,
    isSavingManual,
    loadApplications,
    handleUpdateStageDraft,
    handleUpdateStatusDraft,
    updateDraftField,
    handleSaveDraftChanges,
    handleDiscardDraftChanges,
    handleToggleRowSelect,
    handleToggleSelectAll,
    handleBulkDelete,
    addManualApplication,
  };
};
