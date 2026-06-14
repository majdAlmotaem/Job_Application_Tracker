import React from "react";
import {
  Sparkles,
  RefreshCw,
  MoreVertical,
  ChevronDown,
  FileSpreadsheet,
  Upload,
  Download,
  Clock,
  Trash2
} from "lucide-react";
import { JobApplication } from "../types";

interface TrackerHeaderProps {
  isScanning: boolean;
  handleScanInboxAndAnalyze: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (file: File) => void;
  actionMenuOpen: boolean;
  setActionMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  actionMenuRef: React.RefObject<HTMLDivElement | null>;
  selectedTable: string;
  applications: JobApplication[];
  formatTableName: (name: string) => string;
  isPendingTab: boolean;
  availableTables: string[];
  pendingTabs: { key: string; label: string }[];
  setPendingTabs: React.Dispatch<React.SetStateAction<{ key: string; label: string }[]>>;
  setSelectedTable: (table: string) => void;
  onRequestNewTab: () => void;
  handleDeleteTable: () => void;
  onOpenRename: () => void;
  onOpenExport: () => void;
  onOpenReminder: () => void;
}

export const TrackerHeader: React.FC<TrackerHeaderProps> = ({
  isScanning,
  handleScanInboxAndAnalyze,
  fileInputRef,
  onFileSelect,
  actionMenuOpen,
  setActionMenuOpen,
  actionMenuRef,
  selectedTable,
  applications,
  formatTableName,
  isPendingTab,
  availableTables,
  pendingTabs,
  setPendingTabs,
  setSelectedTable,
  onRequestNewTab,
  handleDeleteTable,
  onOpenRename,
  onOpenExport,
  onOpenReminder,
}) => {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white m-0">{formatTableName(selectedTable)}</h2>
        <p className="text-sm text-slate-400 mt-1 m-0">Synchronisieren Sie Ihr Postfach und verwalten Sie Ihre Bewerbungen.</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          id="scan-button"
          onClick={handleScanInboxAndAnalyze}
          disabled={isScanning}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          {isScanning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> Analysiere...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Gmail synchronisieren
            </>
          )}
        </button>

        <div className="relative" ref={actionMenuRef}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onFileSelect(e.target.files[0]);
                e.target.value = "";
              }
            }}
            className="hidden"
            accept=".csv"
          />

          <button
            onClick={() => setActionMenuOpen((v) => !v)}
            className="bg-slate-800 border border-white/10 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-lg text-xs transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <MoreVertical className="h-4 w-4 text-slate-400" />
            Aktionen
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${actionMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {actionMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
              {selectedTable !== "job_applications" && (
                <>
                  <button
                    onClick={() => {
                      setActionMenuOpen(false);
                      onOpenRename();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer text-left"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    Liste umbenennen
                  </button>
                  <div className="mx-3 my-1 border-t border-white/5" />
                </>
              )}

              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer text-left"
              >
                <Upload className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                CSV Importieren
              </button>

              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  onOpenExport();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer text-left"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                CSV Exportieren
              </button>

              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  onOpenReminder();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer text-left"
              >
                <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                Termin hinzufügen
              </button>

              {selectedTable !== "job_applications" && (
                <>
                  <div className="mx-3 my-1 border-t border-white/5" />
                  <button
                    onClick={() => {
                      setActionMenuOpen(false);
                      if (isPendingTab) {
                        const remainingTabs = [
                          ...availableTables.filter((t) => t !== "job_applications"),
                          ...pendingTabs.filter((pt) => pt.key !== selectedTable).map((p) => p.key),
                        ];
                        setPendingTabs((prev) => prev.filter((pt) => pt.key !== selectedTable));
                        if (remainingTabs.length > 0) {
                          setSelectedTable(remainingTabs[0]);
                        } else {
                          onRequestNewTab();
                        }
                      } else {
                        handleDeleteTable();
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-950/30 transition cursor-pointer text-left"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    {isPendingTab ? "Liste entfernen" : "Tabelle löschen"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
