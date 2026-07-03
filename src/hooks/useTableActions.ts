import { JobApplication } from '../types';

interface UseTableActionsProps {
  selectedTable: string;
  setSelectedTable: (table: string) => void;
  availableTables: string[];
  pendingTabs: { key: string; label: string }[];
  setPendingTabs: React.Dispatch<React.SetStateAction<{ key: string; label: string }[]>>;
  isPendingTab: boolean;
  triggerToast: (type: "success" | "error" | "info" | "warning", message: string) => void;
  triggerConfirm: (options: any) => void;
  loadTables: () => Promise<void>;
  loadApplications: (tableName: string) => Promise<void>;
  promotePendingTab: () => void;
  onRequestNewTab: () => void;
  formatTableName: (name: string) => string;
}

export function useTableActions({
  selectedTable,
  setSelectedTable,
  availableTables,
  pendingTabs,
  setPendingTabs,
  isPendingTab,
  triggerToast,
  triggerConfirm,
  loadTables,
  loadApplications,
  promotePendingTab,
  onRequestNewTab,
  formatTableName,
}: UseTableActionsProps) {
  
  const handleRenameConfirm = async (newLabel: string) => {
    if (!newLabel) return false;
    let newKey = newLabel.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (newKey.match(/^\d/)) newKey = "_" + newKey;
    if (!newKey) return false;

    if (isPendingTab) {
      if (availableTables.includes(newKey) || pendingTabs.some((pt) => pt.key === newKey && pt.key !== selectedTable)) {
        triggerToast("error", "Dieser Name ist bereits vergeben.");
        return false;
      }
      setPendingTabs((prev) =>
        prev.map((pt) => (pt.key === selectedTable ? { key: newKey, label: newLabel } : pt))
      );
      setSelectedTable(newKey);
      return true;
    } else {
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
          return false;
        }
        const data = await response.json();
        setSelectedTable(data.new_name);
        await loadTables();
        triggerToast("success", `Liste in "${newLabel}" umbenannt.`);
        return true;
      } catch {
        triggerToast("error", "Umbenennen fehlgeschlagen.");
        return false;
      }
    }
  };

  const handleImportSubmit = async (file: File | null, importFileName: string) => {
    if (!file || !importFileName) return false;
    const cleanName = importFileName;

    const formData = new FormData();
    formData.append("file", file);

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
      await loadTables();
      await loadApplications(sanitized);
      return true;
    } catch (e) {
      triggerToast("error", "CSV Import fehlgeschlagen.");
      return false;
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

  return {
    handleRenameConfirm,
    handleImportSubmit,
    handleCsvDownload,
    handleDeleteTable,
  };
}
