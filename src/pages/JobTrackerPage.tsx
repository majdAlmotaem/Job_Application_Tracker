import React, { useEffect, useState, useRef } from "react";
import { User } from "firebase/auth";
import {
  RefreshCw,
  Plus,
  ChevronDown,
  Sparkles,
  Upload
} from "lucide-react";
import { JobApplication } from "../types";
import { JobTable } from "../components/JobTable";
import { StatsDashboard } from "../components/StatsDashboard";

// Custom Hooks
import { useJobApplications } from "../hooks/useJobApplications";
import { useGmailSync } from "../hooks/useGmailSync";
import { useInterviewReminders } from "../hooks/useInterviewReminders";

// UI Components & Modals
import { TrackerHeader } from "../components/TrackerHeader";
import { FilterSortBar } from "../components/FilterSortBar";
import { RenameModal } from "../components/Modals/RenameModal";
import { ImportModal } from "../components/Modals/ImportModal";
import { ExportModal } from "../components/Modals/ExportModal";
import { ReminderModal } from "../components/Modals/ReminderModal";
import { ManualAddForm } from "../components/ManualAddForm";
import { ActiveRemindersList } from "../components/ActiveRemindersList";
import { EmailSyncResults } from "../components/EmailSyncResults";

import { getLocalDateString } from "../utils/matchingLogic";

interface PendingTab {
  key: string;
  label: string;
}

interface JobTrackerPageProps {
  user: User | null;
  token: string | null;
  googleSignIn: () => Promise<any>;
  triggerToast: (type: "success" | "error", message: string) => void;
  triggerConfirm: (options: {
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  }) => void;
  selectedTable: string;
  setSelectedTable: (table: string) => void;
  availableTables: string[];
  /** Tabs created in the UI that don't exist in the DB yet */
  pendingTabs: PendingTab[];
  setPendingTabs: React.Dispatch<React.SetStateAction<PendingTab[]>>;
  loadTables: () => Promise<void>;
  onRequestNewTab: () => void;
  dailyGoal: number;
  setDailyGoal: (goal: number) => void;
}

export const JobTrackerPage: React.FC<JobTrackerPageProps> = ({
  user,
  token,
  googleSignIn,
  triggerToast,
  triggerConfirm,
  selectedTable,
  setSelectedTable,
  availableTables,
  pendingTabs,
  setPendingTabs,
  loadTables,
  onRequestNewTab,
  dailyGoal,
  setDailyGoal,
}) => {
  const isPendingTab = pendingTabs.some((pt) => pt.key === selectedTable);
  const pendingTabLabel = pendingTabs.find((pt) => pt.key === selectedTable)?.label ?? selectedTable;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  // Rename modal states
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // CSV Import/Export modal states
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFileSelected, setExportFileSelected] = useState<string>("job_applications");
  
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Manual Add Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualCompany, setManualCompany] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualLocation, setManualLocation] = useState("Düsseldorf, Germany");
  const [manualAnstellungsart, setManualAnstellungsart] = useState("Festanstellung");
  const [manualStatus, setManualStatus] = useState<JobApplication["status"]>("Applied");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Controls states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [sortType, setSortType] = useState<string>("date_desc");

  // Double click cell editing states
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

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

  const promotePendingTab = () => {
    if (isPendingTab) {
      setPendingTabs((prev) => prev.filter((pt) => pt.key !== selectedTable));
    }
  };

  // Custom Hooks integration
  const {
    applications,
    isFetchingApps,
    draftChanges,
    isSavingDrafts,
    selectedRowIds,
    isSavingManual,
    loadApplications,
    handleUpdateStatusDraft,
    updateDraftField,
    handleSaveDraftChanges,
    handleDiscardDraftChanges,
    handleToggleRowSelect,
    handleToggleSelectAll,
    handleBulkDelete,
    addManualApplication,
    setApplications,
  } = useJobApplications({
    selectedTable,
    isPendingTab,
    triggerToast,
    triggerConfirm,
    loadTables,
    promotePendingTab,
  });

  const {
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
  } = useGmailSync({
    user,
    token,
    googleSignIn,
    selectedTable,
    applications,
    setApplications,
    triggerToast,
    triggerConfirm,
  });

  const {
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
  } = useInterviewReminders({
    selectedTable,
    applications,
    setApplications,
    triggerToast,
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

  // Close action menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatTableName = (name: string) => {
    const pending = pendingTabs.find((pt) => pt.key === name);
    if (pending) return pending.label;
    if (name === "job_applications") return "Standard-Tabelle";
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Rename confirm handler
  const handleRenameConfirm = async () => {
    const newLabel = renameValue.trim();
    if (!newLabel) return;
    let newKey = newLabel.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (newKey.match(/^\d/)) newKey = "_" + newKey;
    if (!newKey) return;

    if (isPendingTab) {
      if (availableTables.includes(newKey) || pendingTabs.some((pt) => pt.key === newKey && pt.key !== selectedTable)) {
        triggerToast("error", "Dieser Name ist bereits vergeben.");
        return;
      }
      setPendingTabs((prev) =>
        prev.map((pt) => (pt.key === selectedTable ? { key: newKey, label: newLabel } : pt))
      );
      setSelectedTable(newKey);
      setRenameModalOpen(false);
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
          return;
        }
        const data = await response.json();
        setSelectedTable(data.new_name);
        setRenameModalOpen(false);
        await loadTables();
        triggerToast("success", `Liste in "${newLabel}" umbenannt.`);
      } catch {
        triggerToast("error", "Umbenennen fehlgeschlagen.");
      }
    }
  };

  // CSV Import handler
  const handleImportSubmit = async () => {
    if (!pendingFile || !importFileName.trim()) return;
    const cleanName = importFileName.trim();
    setImportModalOpen(false);

    const formData = new FormData();
    formData.append("file", pendingFile);

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
      setPendingFile(null);
      await loadTables();
      await loadApplications(sanitized);
    } catch (e) {
      triggerToast("error", "CSV Import fehlgeschlagen.");
      setPendingFile(null);
    }
  };

  // CSV Download handler
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

  // Table deletion handler
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

  // Manual addition submission
  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await addManualApplication({
      company: manualCompany,
      role: manualRole,
      status: manualStatus,
      date: manualDate,
      location: manualLocation,
      anstellungsart: manualAnstellungsart,
    });
    if (success) {
      setShowAddForm(false);
      setManualCompany("");
      setManualRole("");
      setManualLocation("Düsseldorf, Germany");
      setManualAnstellungsart("Festanstellung");
      setManualStatus("Applied");
      setManualDate(new Date().toISOString().split("T")[0]);
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
    updateDraftField(id, field, editingValue);
    setEditingCell(null);
    setEditingValue("");
    triggerToast("success", "Änderung im Entwurf gespeichert.");
  };

  const parseDateForSort = (dateStr: any) => {
    const parsed = Date.parse(String(dateStr));
    return isNaN(parsed) ? 0 : parsed;
  };

  const applicationsWithDrafts = applications.map((app) => {
    const drafts = draftChanges[app.id];
    if (drafts) {
      return { ...app, ...drafts };
    }
    return app;
  });

  const todayStr = getLocalDateString();
  const addedToday = applicationsWithDrafts.filter((app) => app.date === todayStr).length;

  const metrics = {
    total: applicationsWithDrafts.length,
    interviewing: applicationsWithDrafts.filter((app) => app.status === "Interview").length,
    offers: applicationsWithDrafts.filter((app) => app.status === "Offer").length,
    rejected: applicationsWithDrafts.filter((app) => app.status === "Rejected").length,
  };

  const filteredAndSortedApplications = [...applicationsWithDrafts]
    .filter((app) => {
      const matchesSearch = app.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "All" ? true : app.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortType === "date_desc") return parseDateForSort(b.date) - parseDateForSort(a.date);
      if (sortType === "date_asc") return parseDateForSort(a.date) - parseDateForSort(b.date);
      if (sortType === "company_asc") return a.company.localeCompare(b.company);
      if (sortType === "company_desc") return b.company.localeCompare(a.company);
      if (sortType === "status_asc") return a.status.localeCompare(b.status);
      return 0;
    });

  const todayStrForReminders = getLocalDateString();

  return (
    <div className="space-y-8">
      {/* 1. Header with single action menu */}
      <TrackerHeader
        isScanning={isScanning}
        handleScanInboxAndAnalyze={handleScanInboxAndAnalyze}
        fileInputRef={fileInputRef}
        onFileSelect={(file) => {
          const baseName = file.name.replace(/\.[^/.]+$/, "");
          if (applications.length > 0) {
            triggerConfirm({
              title: "Tabelle überschreiben?",
              message: `Die aktuelle Liste "${formatTableName(selectedTable)}" enthält bereits ${applications.length} Einträge. Eine neue CSV erstellt eine neue, separate Tabelle. Möchten Sie fortfahren?`,
              confirmText: "Fortfahren",
              type: "warning",
              onConfirm: () => {
                setPendingFile(file);
                setImportFileName(baseName);
                setImportModalOpen(true);
              },
            });
          } else {
            setPendingFile(file);
            setImportFileName(baseName);
            setImportModalOpen(true);
          }
        }}
        actionMenuOpen={actionMenuOpen}
        setActionMenuOpen={setActionMenuOpen}
        actionMenuRef={actionMenuRef}
        selectedTable={selectedTable}
        applications={applications}
        formatTableName={formatTableName}
        isPendingTab={isPendingTab}
        availableTables={availableTables}
        pendingTabs={pendingTabs}
        setPendingTabs={setPendingTabs}
        setSelectedTable={setSelectedTable}
        onRequestNewTab={onRequestNewTab}
        handleDeleteTable={handleDeleteTable}
        onOpenRename={() => {
          setRenameValue(formatTableName(selectedTable));
          setRenameModalOpen(true);
        }}
        onOpenExport={() => {
          if (applications.length === 0) {
            triggerToast("error", "Keine Daten vorhanden zum Exportieren.");
            return;
          }
          setExportFileSelected(selectedTable);
          setExportModalOpen(true);
        }}
        onOpenReminder={() => {
          const interviewApps = applications.filter((app) => app.status === "Interview");
          if (interviewApps.length === 0) {
            triggerToast("error", "Sie müssen zuerst den Status einer Bewerbung auf 'Interview' setzen.");
            return;
          }
          openReminderModal(interviewApps[0].id);
        }}
      />

      {/* Loading Progress Bar for Gmail Sync */}
      {isScanning && (
        <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-slate-900/40 p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">{syncPhase}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{syncDetails}</p>
            </div>
          </div>
          <div className="w-full md:max-w-xs space-y-1.5 shrink-0">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-0.5">
              <span>Fortschritt</span>
              <span className="text-blue-400 font-bold">{Math.round(syncProgress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats Dashboard (Daily Goal + Overall Metrics) */}
      <StatsDashboard
        metrics={metrics}
        addedToday={addedToday}
        dailyGoal={dailyGoal}
        setDailyGoal={setDailyGoal}
      />

      {/* Active Interview Reminders */}
      <ActiveRemindersList
        activeReminders={activeReminders}
        todayStrForReminders={todayStrForReminders}
        handleDeleteReminder={handleDeleteReminder}
      />

      {/* Gmail Synced Email Cards */}
      <EmailSyncResults
        isInboxScanned={isInboxScanned}
        emailUpdates={emailUpdates}
        isNeueExpanded={isNeueExpanded}
        setIsNeueExpanded={setIsNeueExpanded}
        isStatusExpanded={isStatusExpanded}
        setIsStatusExpanded={setIsStatusExpanded}
        expandedEmailIds={expandedEmailIds}
        toggleEmailExpansion={toggleEmailExpansion}
        syncingEmailId={syncingEmailId}
        handleRefuseEmailUpdate={handleRefuseEmailUpdate}
        handleUndoRefuseEmailUpdate={handleUndoRefuseEmailUpdate}
        handleAcceptEmailChange={handleAcceptEmailChange}
        handleAcceptAll={handleAcceptAll}
        handleRejectAll={handleRejectAll}
        getCompanyMatch={getCompanyMatch}
      />

      {/* Grid table container */}
      <div id="grid-table-container" className="professional-card p-6">
        <FilterSortBar
          selectedRowIds={selectedRowIds}
          handleBulkDelete={handleBulkDelete}
          draftChanges={draftChanges}
          handleDiscardDraftChanges={handleDiscardDraftChanges}
          isSavingDrafts={isSavingDrafts}
          handleSaveDraftChanges={handleSaveDraftChanges}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          sortType={sortType}
          setSortType={setSortType}
          showAddForm={showAddForm}
          setShowAddForm={setShowAddForm}
        />

        {/* Pending tab empty state */}
        {isPendingTab && applications.length === 0 && (
          <div className="py-14 flex flex-col items-center justify-center text-center gap-4 border border-dashed border-amber-900/30 rounded-xl bg-amber-950/10">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Plus className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">{pendingTabLabel}</p>
              <p className="text-xs text-slate-400 mt-1">
                Diese Liste ist noch leer. Füge Einträge hinzu oder importiere eine CSV-Datei.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-semibold py-2 px-4 rounded-lg text-xs transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Eintrag hinzufügen
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" /> CSV importieren
              </button>
            </div>
          </div>
        )}

        <ManualAddForm
          showAddForm={showAddForm}
          setShowAddForm={setShowAddForm}
          manualCompany={manualCompany}
          setManualCompany={setManualCompany}
          manualRole={manualRole}
          setManualRole={setManualRole}
          manualLocation={manualLocation}
          setManualLocation={setManualLocation}
          manualAnstellungsart={manualAnstellungsart}
          setManualAnstellungsart={setManualAnstellungsart}
          manualStatus={manualStatus}
          setManualStatus={setManualStatus}
          manualDate={manualDate}
          setManualDate={setManualDate}
          isSavingManual={isSavingManual}
          handleManualAddSubmit={handleManualAddSubmit}
        />

        {/* Doppelklick-Hinweis */}
        {!isPendingTab && applications.length > 0 && (
          <div className="text-[11px] text-[#64748B] dark:text-slate-400 mb-3.5 flex items-center gap-1.5 bg-slate-50/50 dark:bg-slate-900/10 px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-800/80 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Tipp: Doppelklick auf eine Zelle (Unternehmen, Stelle, Datum, Standort, Anstellungsart), um sie direkt zu bearbeiten.</span>
          </div>
        )}

        {/* Job Table View */}
        <JobTable
          applications={applications}
          filteredAndSortedApplications={filteredAndSortedApplications}
          isFetchingApps={isFetchingApps}
          columnWidths={columnWidths}
          startResize={startResize}
          selectedRowIds={selectedRowIds}
          handleToggleSelectAll={handleToggleSelectAll}
          handleToggleRowSelect={handleToggleRowSelect}
          editingCell={editingCell}
          editingValue={editingValue}
          startEditing={startEditing}
          cancelEditing={cancelEditing}
          saveEditing={saveEditing}
          setEditingValue={setEditingValue}
          draftChanges={draftChanges}
          handleUpdateStatusDraft={handleUpdateStatusDraft}
          isSavingDrafts={isSavingDrafts}
          getStatusColorClass={getStatusColorClass}
        />
      </div>

      <RenameModal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        onConfirm={handleRenameConfirm}
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setPendingFile(null);
        }}
        pendingFile={pendingFile}
        importFileName={importFileName}
        setImportFileName={setImportFileName}
        onConfirm={handleImportSubmit}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        exportFileSelected={exportFileSelected}
        setExportFileSelected={setExportFileSelected}
        availableTables={availableTables}
        formatTableName={formatTableName}
        onConfirm={(table) => {
          setExportModalOpen(false);
          handleCsvDownload(table);
        }}
      />

      <ReminderModal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        applications={applications}
        reminderAppId={reminderAppId}
        setReminderAppId={setReminderAppId}
        reminderDate={reminderDate}
        setReminderDate={setReminderDate}
        onConfirm={handleSaveReminder}
      />
    </div>
  );
};
