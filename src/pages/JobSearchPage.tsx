import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileText,
  Settings,
  MoreVertical,
  ChevronDown,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { CVAutoFiller } from "../components/CVAutoFiller";
import { JobSearchForm } from "../components/JobSearchForm";
import { useJobSearch } from "../hooks/useJobSearch";
import { JobSearchResults } from "../components/JobSearchResults";
import { SavedSearch } from "../hooks/useSavedSearches";
import { RenameModal } from "../components/Modals/RenameModal";

import { useGlobalTask } from "../context/GlobalTaskContext";

interface CVExtractionResult {
  job_title: string;
  location: string;
  employment_type: string;
  keywords: string[];
}

interface JobSearchCriteria extends CVExtractionResult {
  date_posted: string;
}

export const JobSearchPage: React.FC = () => {
  const {
    availableTables,
    triggerToast,
    triggerConfirm,
    savedTabs,
    activeSearchId,
    setActiveSearchId,
    createNewSearchTab: createNewTab,
    deleteSearchTab: deleteTab,
    renameSearchTab: renameTab,
    saveSearchToActiveTab,
  } = useGlobalTask();
  const [formValues, setFormValues] = useState<CVExtractionResult>({
    job_title: "",
    location: "",
    employment_type: "Vollzeit",
    keywords: [],
  });

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const {
    searchResults,
    setSearchResults,
    isSearching,
    searchError,
    executeJobSearch,
    syncProgress,
    syncPhase,
    syncDetails,
  } = useJobSearch();

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const [isFormCollapsed, setIsFormCollapsed] = useState(() => {
    const saved = localStorage.getItem("syncsheet_jobsearch_collapsed");
    return saved ? saved === "true" : false;
  });
  
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const activeTab = savedTabs.find((t) => t.id === activeSearchId);

  // Sync active tab state with local formValues and searchResults
  useEffect(() => {
    if (activeTab && !isSearching) {
      setFormValues({
        job_title: activeTab.criteria.job_title || "",
        location: activeTab.criteria.location || "",
        employment_type: activeTab.criteria.employment_type || "Vollzeit",
        keywords: activeTab.criteria.keywords || [],
      });
      setSearchResults(activeTab.results || []);
    }
  }, [activeSearchId, activeTab, isSearching, setSearchResults]);

  // Collapse form automatically if the active tab has saved results
  useEffect(() => {
    if (activeTab) {
      const saved = localStorage.getItem(`syncsheet_jobsearch_collapsed_${activeSearchId}`);
      if (saved !== null) {
        setIsFormCollapsed(saved === "true");
      } else {
        const autoCollapse = !!(activeTab.results && activeTab.results.length > 0);
        setIsFormCollapsed(autoCollapse);
      }
    }
  }, [activeSearchId, activeTab]);

  useEffect(() => {
    if (searchError) {
      setMessage({
        type: "error",
        text: searchError,
      });
    }
  }, [searchError]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Close actions dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleExtractionSuccess = (data: CVExtractionResult) => {
    setFormValues(data);
    triggerToast(
      "success",
      "Daten erfolgreich aus dem Lebenslauf extrahiert und ins Formular eingefügt!"
    );
  };

  const handleExtractionError = (error: string) => {
    setMessage({
      type: "error",
      text: error,
    });
  };

  const handleFormSubmit = async (values: JobSearchCriteria) => {
    await executeJobSearch(values, activeSearchId, saveSearchToActiveTab);
  };

  const handleJobSaved = async (jobUrl: string) => {
    if (!activeTab) return;
    const updatedResults = searchResults.map((job) => {
      if (job.url === jobUrl) {
        return { ...job, is_saved: true };
      }
      return job;
    });
    setSearchResults(updatedResults);
    await saveSearchToActiveTab(activeTab.criteria, updatedResults);
  };

  const handleJobUnsaved = async (jobUrl: string) => {
    if (!activeTab) return;
    const updatedResults = searchResults.map((job) => {
      if (job.url === jobUrl) {
        const updated = { ...job };
        delete updated.is_saved;
        return updated;
      }
      return job;
    });
    setSearchResults(updatedResults);
    await saveSearchToActiveTab(activeTab.criteria, updatedResults);
  };

  const handleRenameConfirm = async (newName: string) => {
    if (activeTab && newName) {
      await renameTab(activeTab.id, newName);
      setRenameModalOpen(false);
    }
  };

  const handleDeleteSearchClick = () => {
    if (!activeTab) return;
    triggerConfirm({
      title: "Suche löschen",
      message: `Möchten Sie die Suche "${activeTab.tab_name}" wirklich dauerhaft aus der Datenbank löschen?`,
      confirmText: "Löschen",
      type: "danger",
      onConfirm: async () => {
        await deleteTab(activeTab.id);
      },
    });
  };

  return (
    <div className="space-y-8">

      {/* Messages */}
      {message && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border text-xs font-semibold transition-all duration-300 ${
            message.type === "success"
              ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/40"
              : "bg-rose-950/40 text-rose-400 border-rose-900/40"
          }`}
        >
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-400" />
          <span className="leading-normal">{message.text}</span>
        </div>
      )}

      {/* Search Header Bar (Prominent Search Title & Actions) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white m-0">
            {activeTab ? activeTab.tab_name : "Job-Suche"}
          </h2>
          <p className="text-xs text-slate-400 mt-1 m-0">
            Persistente KI-Suche mit gespeicherten Ergebnissen und Kriterien.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab && (
            <div className="relative animate-fadeIn" ref={actionMenuRef}>
              <button
                onClick={() => setActionMenuOpen((v) => !v)}
                className="bg-slate-800 border border-white/10 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-lg text-xs transition flex items-center gap-2 cursor-pointer shadow-sm border-none"
              >
                <MoreVertical className="h-4 w-4 text-slate-400" />
                Aktionen
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                    actionMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {actionMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
                  <button
                    onClick={() => {
                      setActionMenuOpen(false);
                      setRenameModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer text-left border-none bg-transparent"
                  >
                    <Settings className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    Suche umbenennen
                  </button>

                  {savedTabs.length > 1 && (
                    <>
                      <div className="mx-3 my-1 border-t border-white/5" />
                      <button
                        onClick={() => {
                          setActionMenuOpen(false);
                          handleDeleteSearchClick();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-rose-450 hover:bg-rose-950/30 transition cursor-pointer text-left border-none bg-transparent"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                        Suche löschen
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Choice Layout Container */}
      <div className="professional-card p-6 lg:p-8 space-y-6 shadow-xl">
        <button
          onClick={() => {
            const nextVal = !isFormCollapsed;
            setIsFormCollapsed(nextVal);
            localStorage.setItem("syncsheet_jobsearch_collapsed", String(nextVal));
            if (activeSearchId !== null) {
              localStorage.setItem(`syncsheet_jobsearch_collapsed_${activeSearchId}`, String(nextVal));
            }
          }}
          className="w-full flex items-center justify-between text-left focus:outline-none bg-transparent border-none p-0 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-405 shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider m-0">Suchkriterien & Lebenslauf-Upload</h3>
              <p className="text-[11px] text-slate-400 m-0 mt-0.5">CV hochladen oder Kriterien manuell eingeben</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isFormCollapsed ? "rotate-180" : ""}`} />
        </button>

        {!isFormCollapsed && (
          <div className="space-y-6 pt-4 border-t border-white/5 animate-fadeIn">
            {/* Option A: CV Upload (Subtle Blue AI Panel) */}
            <div className="bg-blue-950/10 border border-blue-500/15 p-5 rounded-2xl transition-all duration-300 hover:border-blue-500/35 hover:bg-blue-950/15 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 bg-blue-500/10 border border-blue-500/25 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    Option A: Lebenslauf-Upload (KI)
                  </h3>
                  <p className="text-slate-350 text-[11px] leading-tight">
                    Lade deinen Lebenslauf hoch, um alle Kriterien automatisch zu extrahieren.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <CVAutoFiller
                  onExtractionSuccess={handleExtractionSuccess}
                  onExtractionError={handleExtractionError}
                  isCompact
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-[1px] w-full bg-white/5" />

            {/* Option B: Manual input Panel (Subtle Slate Panel) */}
            <div className="bg-slate-950/35 border border-white/5 p-5 rounded-2xl space-y-6 transition-all duration-300 hover:border-slate-800/80">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                  <Settings className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-slate-250 uppercase tracking-wider">
                    Option B: Kriterien manuell bearbeiten
                  </h3>
                  <p className="text-slate-400 text-[11px] leading-tight">
                    Passe deine Berufsbezeichnung, deinen Wunschort und andere Filter an.
                  </p>
                </div>
              </div>
              <JobSearchForm
                initialValues={formValues}
                onSubmit={handleFormSubmit}
                isSearching={isSearching}
              />
            </div>
          </div>
        )}
      </div>



      {/* Loading Progress Bar for Job Search */}
      {isSearching && (
        <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-slate-900/40 p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-100">{syncPhase}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{syncDetails}</p>
            </div>
          </div>
          <div className="w-full md:max-w-xs space-y-1.5 shrink-0">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-0.5">
              <span>Fortschritt</span>
              <span className="text-blue-400 font-bold">{Math.round(syncProgress || 0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                style={{ width: `${syncProgress || 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {!isSearching && searchResults.length > 0 && (
        <JobSearchResults
          results={searchResults}
          isSearching={isSearching}
          availableTables={availableTables}
          triggerToast={triggerToast}
          onJobSaved={handleJobSaved}
          onJobUnsaved={handleJobUnsaved}
        />
      )}

      {/* Rename Modal for Search Tabs */}
      <RenameModal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        initialName={activeTab?.tab_name || ""}
        onConfirm={handleRenameConfirm}
      />
    </div>
  );
};

export default JobSearchPage;
