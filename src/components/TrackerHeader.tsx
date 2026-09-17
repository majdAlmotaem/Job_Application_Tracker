import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  RefreshCw,
  MoreVertical,
  ChevronDown,
  FileSpreadsheet,
  Upload,
  Download,
  Clock,
  Trash2,
  Check,
  Settings,
  AlertTriangle,
  Bot
} from "lucide-react";
import { JobApplication } from "../types";
import { useLLM } from "../context/LLMContext";

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
  const navigate = useNavigate();
  const { providers, activeProvider, setActiveProvider } = useLLM();
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
      }
    };
    if (modelMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [modelMenuOpen]);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white m-0">{formatTableName(selectedTable)}</h2>
        <p className="text-sm text-slate-400 mt-1 m-0">Synchronisieren Sie Ihr Postfach und verwalten Sie Ihre Bewerbungen.</p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
        {/* Quick Model Selector / Hint */}
        <div className="relative" ref={modelMenuRef}>
          <button
            type="button"
            onClick={() => setModelMenuOpen((prev) => !prev)}
            title="Aktives KI-Modell für Analyse wählen"
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border shadow-sm ${
              activeProvider
                ? "bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-white/10 hover:border-blue-500/30"
                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
            }`}
          >
            {activeProvider ? (
              <>
                <span className="text-sm">
                  {activeProvider.provider_type === "ollama" ? "🦙" : activeProvider.provider_type === "gemini" ? "✨" : "🤖"}
                </span>
                <span className="max-w-[120px] truncate">{activeProvider.name}</span>
                <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${modelMenuOpen ? "rotate-180" : ""}`} />
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-300">Modell wählen</span>
                <ChevronDown className={`h-3 w-3 text-amber-400 transition-transform ${modelMenuOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>

          {modelMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1 animate-fadeIn">
              <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Aktives KI-Modell</span>
                <span className="text-[10px] text-slate-500">{providers.length} verfügbar</span>
              </div>

              {providers.length === 0 ? (
                <div className="p-3 text-center space-y-2">
                  <p className="text-[11px] text-slate-400">Kein Modell eingerichtet.</p>
                  <button
                    onClick={() => {
                      setModelMenuOpen(false);
                      navigate("/settings?tab=models");
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] transition cursor-pointer border-none"
                  >
                    In Einstellungen anlegen
                  </button>
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto py-1">
                  {providers.map((p) => {
                    const isSelected = activeProvider?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setActiveProvider(p);
                          setModelMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800/80 transition cursor-pointer border-none bg-transparent ${
                          isSelected ? "text-blue-400 font-bold bg-blue-500/5" : "text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-sm shrink-0">
                            {p.provider_type === "ollama" ? "🦙" : p.provider_type === "gemini" ? "✨" : "🤖"}
                          </span>
                          <div className="truncate">
                            <div className="text-xs truncate">{p.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">{p.model_name}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-blue-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-white/5 pt-1 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setModelMenuOpen(false);
                    navigate("/settings?tab=models");
                  }}
                  className="w-full px-3 py-2 text-[11px] text-slate-400 hover:text-white hover:bg-slate-800/50 flex items-center gap-2 transition cursor-pointer border-none bg-transparent text-left"
                >
                  <Settings className="h-3 w-3" />
                  <span>Modelle in Einstellungen verwalten</span>
                </button>
              </div>
            </div>
          )}
        </div>

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
