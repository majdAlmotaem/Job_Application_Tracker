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
} from "lucide-react";
import { CVAutoFiller } from "../components/CVAutoFiller";
import { JobSearchForm } from "../components/JobSearchForm";
import { useJobSearch } from "../hooks/useJobSearch";
import { JobSearchResults } from "../components/JobSearchResults";
import { SavedSearch } from "../hooks/useSavedSearches";
import { RenameModal } from "../components/Modals/RenameModal";

interface CVExtractionResult {
  job_title: string;
  location: string;
  employment_type: string;
  keywords: string[];
}

interface JobSearchCriteria extends CVExtractionResult {
  date_posted: string;
}

interface JobSearchPageProps {
  availableTables: string[];
  triggerToast: (type: "success" | "error", message: string) => void;
  triggerConfirm: (options: {
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  }) => void;
  savedTabs: SavedSearch[];
  activeSearchId: number | null;
  setActiveSearchId: (id: number | null) => void;
  createNewTab: (name?: string) => Promise<any>;
  deleteTab: (id: number) => Promise<void>;
  renameTab: (id: number, newName: string) => Promise<any>;
  saveSearchToActiveTab: (criteria: any, results: any[]) => Promise<any>;
}

export const JobSearchPage: React.FC<JobSearchPageProps> = ({
  availableTables,
  triggerToast,
  triggerConfirm,
  savedTabs,
  activeSearchId,
  setActiveSearchId,
  createNewTab,
  deleteTab,
  renameTab,
  saveSearchToActiveTab,
}) => {
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
  } = useJobSearch();

  // Dropdown & Modal States
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const activeTab = savedTabs.find((t) => t.id === activeSearchId);

  // Sync active tab state with local formValues and searchResults
  useEffect(() => {
    if (activeTab) {
      setFormValues({
        job_title: activeTab.criteria.job_title || "",
        location: activeTab.criteria.location || "",
        employment_type: activeTab.criteria.employment_type || "Vollzeit",
        keywords: activeTab.criteria.keywords || [],
      });
      setSearchResults(activeTab.results || []);
    }
  }, [activeSearchId, activeTab, setSearchResults]);

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
    const results = await executeJobSearch(values);
    if (results && activeSearchId !== null) {
      await saveSearchToActiveTab(values, results);
    }
  };

  const handleRenameConfirm = async () => {
    if (activeTab && renameValue.trim()) {
      await renameTab(activeTab.id, renameValue.trim());
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
                      setRenameValue(activeTab.tab_name);
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
      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-8 lg:p-10 shadow-xl space-y-8">
        {/* Option A: CV Upload */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between bg-slate-900/10 p-4 border border-slate-800/40 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Option A: Lebenslauf-Upload
              </h3>
              <p className="text-slate-200 text-[11px] leading-tight">
                Lade deinen Lebenslauf hoch, um die Suchkriterien unten automatisch auszufüllen.
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
        <div className="h-[1px] w-full bg-slate-800/80" />

        {/* Option B: Manual input */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Option B: Suchkriterien befüllen
            </h3>
          </div>
          <JobSearchForm
            initialValues={formValues}
            onSubmit={handleFormSubmit}
            isSearching={isSearching}
          />
        </div>
      </div>

      <JobSearchResults
        results={searchResults}
        isSearching={isSearching}
        availableTables={availableTables}
        triggerToast={triggerToast}
      />

      {/* Rename Modal for Search Tabs */}
      <RenameModal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        onConfirm={handleRenameConfirm}
      />
    </div>
  );
};

export default JobSearchPage;
