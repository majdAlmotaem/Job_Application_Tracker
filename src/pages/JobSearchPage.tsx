import React, { useState, useEffect } from "react";
import { Sparkles, AlertCircle, CheckCircle2, FileText, Settings } from "lucide-react";
import Lottie from "lottie-react";
import catAnimation from "../assets/animations/Cat playing animation.json";
import { CVAutoFiller } from "../components/CVAutoFiller";
import { JobSearchForm } from "../components/JobSearchForm";
import { useJobSearch } from "../hooks/useJobSearch";
import { JobSearchResults } from "../components/JobSearchResults";

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
}

export const JobSearchPage: React.FC<JobSearchPageProps> = ({
  availableTables,
  triggerToast,
}) => {
  const [formValues, setFormValues] = useState<CVExtractionResult>({
    job_title: "",
    location: "",
    employment_type: "Vollzeit",
    keywords: [],
  });

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { searchResults, isSearching, searchError, executeJobSearch } = useJobSearch();

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

  const handleFormSubmit = (values: JobSearchCriteria) => {
    let dateLabel = "beliebige Veröffentlichung";
    if (values.date_posted === "24h") dateLabel = "letzte 24 Stunden";
    if (values.date_posted === "3days") dateLabel = "letzte 3 Tage";
    if (values.date_posted === "week") dateLabel = "letzte Woche";
    if (values.date_posted === "month") dateLabel = "letzter Monat";

    triggerToast(
      "success",
      `Jobsuche für "${values.job_title}" in "${values.location || "beliebiger Ort"}" (${dateLabel}) gestartet.`
    );
    executeJobSearch(values);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6">
      {/* Header Banner */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-8 lg:p-10 shadow-xl">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Dein persönlicher KI-Job-Agent
            </h1>
            <p className="text-slate-100 text-sm max-w-2xl leading-relaxed">
              Lade deinen Lebenslauf hoch und ich suche live im Netz nach den besten Stellen für dich.
            </p>
          </div>
          <div className="w-48 h-20 md:w-60 md:h-26 flex items-center justify-center shrink-0 overflow-hidden select-none -scale-x-100">
            <Lottie animationData={catAnimation} loop={true} className="w-full h-full object-contain" />
          </div>
        </div>
      </header>

      {/* Messages */}
      {message && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border text-xs font-semibold transition-all duration-300 ${message.type === "success"
            ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/40"
            : "bg-rose-950/40 text-rose-400 border-rose-900/40"
            }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-400" />
          )}
          <span className="leading-normal">{message.text}</span>
        </div>
      )}

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
    </div>
  );
};

export default JobSearchPage;
