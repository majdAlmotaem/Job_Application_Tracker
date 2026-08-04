import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { User } from "firebase/auth";
import {
  RefreshCw,
  Plus,
  Upload
} from "lucide-react";
import { JobApplication, ApplicationStage, ApplicationStatus } from "../types";
import { JobTable } from "../components/JobTable";
import { StatsDashboard } from "../components/StatsDashboard";
import { DailyGoalCard } from "../components/DailyGoalCard";

// Custom Hooks
import { useGmailSync } from "../hooks/useGmailSync";
import { useInterviewReminders } from "../hooks/useInterviewReminders";
import { useJobApplications } from "../hooks/useJobApplications";
import { useJobTableLogic } from "../hooks/useJobTableLogic";
import { useTableActions } from "../hooks/useTableActions";
import { useGlobalTask } from "../context/GlobalTaskContext";

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

export const JobTrackerPage: React.FC = () => {
  const {
    user,
    token,
    googleSignInWrapper: googleSignIn,
    triggerToast,
    triggerConfirm,
    selectedTable,
    setSelectedTable,
    availableTables,
    pendingTabs,
    setPendingTabs,
    loadTables,
    handleNewTab: onRequestNewTab,
    dailyGoal,
    setDailyGoal,
    applications,
    setApplications,
    promotePendingTab,
  } = useGlobalTask();

  const isPendingTab = pendingTabs.some((pt) => pt.key === selectedTable);
  const pendingTabLabel = pendingTabs.find((pt) => pt.key === selectedTable)?.label ?? selectedTable;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [exportFileSelected, setExportFileSelected] = useState<string>("job_applications");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const reminderProps = useInterviewReminders({
    selectedTable, applications, setApplications, triggerToast,
  });

  const openReminderModalRef = useRef(reminderProps.openReminderModal);
  useEffect(() => { openReminderModalRef.current = reminderProps.openReminderModal; });

  const handleInterviewOpenTrigger = useCallback((appId: string) => {
    openReminderModalRef.current(appId);
  }, []);

  const {
    isFetchingApps,
    draftChanges,
    isSavingDrafts,
    selectedRowIds,
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
  } = useJobApplications({
    selectedTable,
    isPendingTab,
    triggerToast,
    triggerConfirm,
    loadTables,
    promotePendingTab,
    applications,
    setApplications,
    onInterviewOpenTrigger: handleInterviewOpenTrigger,
  });

  const formatTableName = (name: string) => {
    const pending = pendingTabs.find((pt) => pt.key === name);
    if (pending) return pending.label;
    if (name === "job_applications") return "Standard-Tabelle";
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const {
    handleRenameConfirm,
    handleImportSubmit,
    handleCsvDownload,
    handleDeleteTable,
  } = useTableActions({
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
  });

  const {
    searchTerm, setSearchTerm,
    filterStage, setFilterStage,
    filterStatus, setFilterStatus,
    sortType, setSortType,
    editingCell, editingValue, setEditingValue,
    startEditing, cancelEditing, saveEditing,
    columnWidths, startResize,
    filteredAndSortedApplications,
    paginatedApplications,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    totalPages, totalFilteredCount,
  } = useJobTableLogic({
    applications,
    draftChanges,
    updateDraftField,
    triggerToast,
  });

  const gmailSyncProps = useGmailSync({
    user, token, googleSignIn, selectedTable, applications, setApplications, triggerToast, triggerConfirm,
    onInterviewOpenTrigger: handleInterviewOpenTrigger,
  });

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

  const applicationsWithDrafts = useMemo(
    () => applications.map((app) => ({ ...app, ...(draftChanges[app.id] || {}) })),
    [applications, draftChanges]
  );

  const todayStr = useMemo(() => getLocalDateString(), []);
  const addedToday = useMemo(
    () => applicationsWithDrafts.filter((app) => (app.date || "").startsWith(todayStr)).length,
    [applicationsWithDrafts, todayStr]
  );

  const metrics = useMemo(() => ({
    total: applicationsWithDrafts.length,
    interviewing: applicationsWithDrafts.filter((app) => app.stage === "Interview" && app.status === "Open").length,
    hadInterview: applicationsWithDrafts.filter((app) => app.stage === "Interview" || app.stage === "Offer" || !!app.interview_date).length,
    offers: applicationsWithDrafts.filter((app) => app.stage === "Offer" && app.status === "Open").length,
    rejected: applicationsWithDrafts.filter((app) => app.status === "Rejected").length,
  }), [applicationsWithDrafts]);

  const getStageBadgeClass = (stage: ApplicationStage) => {
    switch (stage) {
      case "Applied": return "bg-blue-950/50 text-blue-400 border-blue-900";
      case "Interview": return "bg-violet-950/50 text-violet-400 border-violet-900";
      case "Offer": return "bg-emerald-950/50 text-emerald-400 border-emerald-900";
      default: return "bg-slate-900 text-slate-400 border-slate-800";
    }
  };

  const getStatusColorClass = (status: ApplicationStatus) => {
    switch (status) {
      case "Open": return "bg-sky-950/50 text-sky-400 border-sky-900";
      case "Rejected": return "bg-red-950/50 text-red-400 border-red-900";
      case "Accepted": return "bg-emerald-950/50 text-emerald-400 border-emerald-900";
      case "Withdrawn": return "bg-amber-950/50 text-amber-400 border-amber-900";
      default: return "bg-slate-900 text-slate-400 border-slate-800";
    }
  };

  return (
    <div className="space-y-8">
      <TrackerHeader
        isScanning={gmailSyncProps.isScanning}
        handleScanInboxAndAnalyze={gmailSyncProps.handleScanInboxAndAnalyze}
        fileInputRef={fileInputRef}
        onFileSelect={(file) => {
          if (applications.length > 0) {
            triggerConfirm({
              title: "Tabelle überschreiben?",
              message: `Die aktuelle Liste "${formatTableName(selectedTable)}" enthält bereits ${applications.length} Einträge. Eine neue CSV erstellt eine neue, separate Tabelle. Möchten Sie fortfahren?`,
              confirmText: "Fortfahren",
              type: "warning",
              onConfirm: () => {
                setPendingFile(file);
                setImportModalOpen(true);
              },
            });
          } else {
            setPendingFile(file);
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
        onOpenRename={() => setRenameModalOpen(true)}
        onOpenExport={() => {
          if (applications.length === 0) {
            triggerToast("error", "Keine Daten vorhanden zum Exportieren.");
            return;
          }
          setExportFileSelected(selectedTable);
          setExportModalOpen(true);
        }}
        onOpenReminder={() => {
          const interviewApps = applications.filter((app) => app.stage === "Interview" && app.status === "Open");
          if (interviewApps.length === 0) {
            triggerToast("error", "Sie müssen zuerst die Stufe einer Bewerbung auf 'Interview' setzen (mit Status 'Open').");
            return;
          }
          reminderProps.openReminderModal(interviewApps[0].id);
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-stretch">
        <DailyGoalCard addedToday={addedToday} dailyGoal={dailyGoal} setDailyGoal={setDailyGoal} />
        <StatsDashboard metrics={metrics} />
      </div>

      <ActiveRemindersList
        activeReminders={reminderProps.activeReminders}
        todayStrForReminders={getLocalDateString()}
        handleDeleteReminder={reminderProps.handleDeleteReminder}
        onEditReminder={(rem) => {
          reminderProps.setReminderAppId(rem.applicationId);
          reminderProps.setReminderDate(rem.date);
          reminderProps.setReminderTime(rem.time || "");
          reminderProps.setReminderNote(rem.note || "");
          reminderProps.setReminderModalOpen(true);
        }}
      />

      <EmailSyncResults {...gmailSyncProps} />

      {gmailSyncProps.isScanning && (
        <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-slate-900/40 p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">{gmailSyncProps.syncPhase}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{gmailSyncProps.syncDetails}</p>
            </div>
          </div>
          <div className="w-full md:max-w-xs space-y-1.5 shrink-0">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-0.5">
              <span>Fortschritt</span>
              <span className="text-blue-400 font-bold">{Math.round(gmailSyncProps.syncProgress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                style={{ width: `${gmailSyncProps.syncProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div id="grid-table-container" className="professional-card p-6">
        {!selectedTable ? (
          <div className="py-14 flex flex-col items-center justify-center text-center gap-4 border border-dashed border-slate-700/30 rounded-xl bg-slate-900/10">
            <div className="h-12 w-12 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/30">
              <Plus className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">Keine aktive Liste</p>
              <p className="text-xs text-slate-400 mt-1">
                Erstellen Sie eine neue Liste oder importieren Sie eine CSV-Datei, um mit dem Tracker zu beginnen.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onRequestNewTab}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-750 text-white font-semibold py-2 px-4 rounded-lg text-xs transition cursor-pointer border-none"
              >
                <Plus className="h-3.5 w-3.5" /> Neue Liste erstellen
              </button>
            </div>
          </div>
        ) : (
          <>
            <FilterSortBar
              selectedRowIds={selectedRowIds}
              handleBulkDelete={handleBulkDelete}
              draftChanges={draftChanges}
              handleDiscardDraftChanges={handleDiscardDraftChanges}
              isSavingDrafts={isSavingDrafts}
              handleSaveDraftChanges={handleSaveDraftChanges}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterStage={filterStage}
              setFilterStage={setFilterStage}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              sortType={sortType}
              setSortType={setSortType}
              showAddForm={showAddForm}
              setShowAddForm={setShowAddForm}
              onRefresh={() => loadApplications(selectedTable)}
              isFetchingApps={isFetchingApps}
              showHinweis={!isPendingTab && applications.length > 0}
            />

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
                  <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-semibold py-2 px-4 rounded-lg text-xs transition cursor-pointer">
                    <Plus className="h-3.5 w-3.5" /> Eintrag hinzufügen
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition cursor-pointer border-none">
                    <Upload className="h-3.5 w-3.5" /> CSV importieren
                  </button>
                </div>
              </div>
            )}

            <ManualAddForm
              showAddForm={showAddForm}
              onClose={() => setShowAddForm(false)}
              isSavingManual={isSavingManual}
              onSubmit={async (data) => {
                const result = await addManualApplication(data);
                if (result) setShowAddForm(false);
                return result;
              }}
            />

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
              handleUpdateStageDraft={handleUpdateStageDraft}
              handleUpdateStatusDraft={handleUpdateStatusDraft}
              isSavingDrafts={isSavingDrafts}
              getStageBadgeClass={getStageBadgeClass}
              getStatusColorClass={getStatusColorClass}
              paginatedApplications={paginatedApplications}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              totalPages={totalPages}
              totalFilteredCount={totalFilteredCount}
            />
          </>
        )}
      </div>

      <RenameModal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        initialName={formatTableName(selectedTable)}
        onConfirm={(newName) => {
          handleRenameConfirm(newName).then((success) => {
            if (success) setRenameModalOpen(false);
          });
        }}
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setPendingFile(null);
        }}
        initialFile={pendingFile}
        onConfirm={(file, fileName) => {
          handleImportSubmit(file, fileName).then((success) => {
            if (success) {
              setImportModalOpen(false);
              setPendingFile(null);
            }
          });
        }}
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
        isOpen={reminderProps.reminderModalOpen}
        onClose={() => reminderProps.setReminderModalOpen(false)}
        applications={applications}
        reminderAppId={reminderProps.reminderAppId}
        setReminderAppId={reminderProps.setReminderAppId}
        reminderDate={reminderProps.reminderDate}
        setReminderDate={reminderProps.setReminderDate}
        reminderTime={reminderProps.reminderTime}
        setReminderTime={reminderProps.setReminderTime}
        reminderNote={reminderProps.reminderNote}
        setReminderNote={reminderProps.setReminderNote}
        onConfirm={reminderProps.handleSaveReminder}
      />
    </div>
  );
};
