import React, { useState, useEffect } from "react";
import { Sparkles, AlertCircle, CheckCircle2, FileText, Settings } from "lucide-react";
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

export const JobSearchPage: React.FC = () => {
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

  const handleExtractionSuccess = (data: CVExtractionResult) => {
    setFormValues(data);
    setMessage({
      type: "success",
      text: "Daten erfolgreich aus dem Lebenslauf extrahiert und ins Formular eingefügt!",
    });
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

    setMessage({
      type: "success",
      text: `Jobsuche für "${values.job_title}" in "${values.location || "beliebiger Ort"}" (${dateLabel}) gestartet.`,
    });
    executeJobSearch(values);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6">
      {/* Header Banner */}
      <header className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-r from-purple-900/20 via-slate-900/30 to-blue-950/15 p-8 lg:p-10 shadow-2xl">
        <div className="absolute right-0 top-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-500/10 border border-purple-500/15 text-purple-400">
            <Sparkles className="h-3.5 w-3.5" /> KI-gestützte Job-Suche
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Finden Sie Ihre nächste Herausforderung.
          </h1>
          <p className="text-slate-355 text-sm max-w-2xl leading-relaxed">
            Nutzen Sie die schnelle KI-Analyse, um Ihren Lebenslauf hochzuladen und Suchkriterien sofort auszufüllen – oder tragen Sie Ihre Angaben manuell ein, um direkt zu starten.
          </p>
        </div>
      </header>

      {/* Messages */}
      {message && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border text-xs font-semibold transition-all duration-300 ${
            message.type === "success"
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
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Option A: CV Upload */}
        <div className="flex-1 min-w-[280px]">
          <div className="h-full flex flex-col justify-between bg-slate-900/20 border border-slate-800/60 rounded-2xl p-6 shadow-xl relative">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center text-purple-400">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Option A: Lebenslauf-Upload
                </h3>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Laden Sie Ihren aktuellen Lebenslauf hoch. Die Gemini-API liest Ihre PDF-Daten aus und trägt Position, Ort und Skills automatisch ein.
              </p>
            </div>
            <div className="mt-6">
              <CVAutoFiller
                onExtractionSuccess={handleExtractionSuccess}
                onExtractionError={handleExtractionError}
              />
            </div>
          </div>
        </div>

        {/* Divider with ODER badge */}
        <div className="flex flex-row lg:flex-col items-center justify-center gap-4 py-2 lg:py-0 shrink-0">
          <div className="h-[1px] lg:h-full w-full lg:w-[1px] bg-slate-800/80 flex-1" />
          <div className="bg-slate-950 border border-slate-850 text-slate-400 text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1.5 rounded-full shadow-lg">
            ODER
          </div>
          <div className="h-[1px] lg:h-full w-full lg:w-[1px] bg-slate-800/80 flex-1" />
        </div>

        {/* Option B: Manual input */}
        <div className="flex-[2] min-w-[320px]">
          <div className="h-full bg-slate-900/20 border border-slate-800/60 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-6">
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
            />
          </div>
        </div>
      </div>

      <JobSearchResults results={searchResults} isSearching={isSearching} />
    </div>
  );
};

export default JobSearchPage;
