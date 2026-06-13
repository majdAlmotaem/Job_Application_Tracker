import React, { useState } from "react";
import { Briefcase, MapPin, ExternalLink, Loader2, Sparkles, Check } from "lucide-react";
import { JobSearchResultItem } from "../hooks/useJobSearch";
import { SaveJobModal } from "./Modals/SaveJobModal";

interface JobSearchResultsProps {
  results: JobSearchResultItem[];
  isSearching: boolean;
  availableTables: string[];
  triggerToast: (type: "success" | "error", message: string) => void;
  onJobSaved: (jobUrl: string) => void;
  onJobUnsaved: (jobUrl: string) => void;
}

export const JobSearchResults: React.FC<JobSearchResultsProps> = ({
  results,
  isSearching,
  availableTables,
  triggerToast,
  onJobSaved,
  onJobUnsaved,
}) => {
  const [interactionState, setInteractionState] = useState<Record<string, "clicked" | "applied" | "saved">>({});
  const [savedTableNames, setSavedTableNames] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJobForSave, setSelectedJobForSave] = useState<JobSearchResultItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleUndoSave = (jobUrl: string) => {
    setInteractionState((prev) => {
      const next = { ...prev };
      delete next[jobUrl];
      return next;
    });
    setSavedTableNames((prev) => {
      const next = { ...prev };
      delete next[jobUrl];
      return next;
    });
    onJobUnsaved(jobUrl);
    triggerToast("success", "Bewerbungs-Status zurückgesetzt.");
  };

  const handleSaveToDatabase = async (tableName: string) => {
    if (!selectedJobForSave) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/applications?table_name=${encodeURIComponent(tableName)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company: selectedJobForSave.company,
          role: selectedJobForSave.job_title,
          location: selectedJobForSave.location || "N/A",
          status: "Applied",
          date: new Date().toISOString().split("T")[0],
          anstellungsart: "N/A",
          source_file: tableName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Fehler beim Speichern des Jobs.");
      }

      // Update interaction state on success
      setSavedTableNames((prev) => ({
        ...prev,
        [selectedJobForSave.url]: tableName,
      }));
      setInteractionState((prev) => ({
        ...prev,
        [selectedJobForSave.url]: "saved",
      }));

      // Secretly notify parent to flag is_saved: true in saved searches results
      onJobSaved(selectedJobForSave.url);

      triggerToast("success", `Job erfolgreich in "${tableName}" gespeichert!`);
    } catch (err: any) {
      console.error(err);
      triggerToast("error", err.message || "Verbindung zum Server fehlgeschlagen.");
    } finally {
      setIsSaving(false);
      setIsModalOpen(false);
    }
  };

  if (isSearching || results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-blue-400" />
        <h2 className="text-xl font-bold text-white tracking-tight">Gefundene Stellenanzeigen</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map((job, idx) => {
          const state = interactionState[job.url] || (job.is_saved ? "saved" : undefined);

          // Calculate Match Score circular progress properties
          const matchScore = job.match_score || 0;
          const percent = matchScore <= 10 ? matchScore * 10 : matchScore;
          const radius = 15;
          const circumference = 94.24; // 2 * PI * 15
          const strokeDashoffset = circumference - (percent / 100) * circumference;

          let strokeColor = "stroke-emerald-500";
          let textColor = "text-emerald-400";
          if (percent < 50) {
            strokeColor = "stroke-rose-500";
            textColor = "text-rose-400";
          } else if (percent < 80) {
            strokeColor = "stroke-amber-500";
            textColor = "text-amber-400";
          }

          return (
            <div
              key={idx}
              className="flex flex-col justify-between bg-slate-900/20 border border-slate-800 hover:border-blue-500/20 hover:bg-slate-900/40 transition-all duration-300 rounded-2xl p-6 shadow-xl group relative overflow-hidden"
            >
              {/* Subtle glow on hover - pointer-events-none prevents blocking click events on the link button */}
              <div className="absolute -right-10 -top-10 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-300 pointer-events-none" />

              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-100 leading-snug">
                        {job.job_title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      {job.match_score !== undefined && (
                        <div className="flex items-center" title={`Passgenauigkeit: ${matchScore}/10`}>
                          <div className="relative flex items-center justify-center h-9 w-9 shrink-0">
                            <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
                              {/* Background circle */}
                              <circle
                                cx="18"
                                cy="18"
                                r={radius}
                                className="stroke-slate-800"
                                strokeWidth="3"
                                fill="transparent"
                              />
                              {/* Foreground progress circle */}
                              <circle
                                cx="18"
                                cy="18"
                                r={radius}
                                className={`${strokeColor} transition-all duration-500 ease-out`}
                                strokeWidth="3"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className={`absolute text-[9px] font-extrabold ${textColor}`}>
                              {percent}%
                            </span>
                          </div>
                        </div>
                      )}

                      {state === "saved" && (
                        <span className="inline-block text-[10px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/15 animate-fadeIn">
                          Beworben
                        </span>
                      )}
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 w-9 bg-slate-900 hover:bg-blue-900/20 border border-slate-800/80 hover:border-blue-500/40 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-300 transition-all duration-300"
                        title="Stellenanzeige öffnen"
                        onClick={() => {
                          if (!state) {
                            setInteractionState((prev) => ({
                              ...prev,
                              [job.url]: "clicked",
                            }));
                          }
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-blue-400/80" />
                      <span>{job.company}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-400/80" />
                      <span>{job.location || "Siehe Anzeige"}</span>
                    </div>
                  </div>

                  {job.match_reason && (
                    <div className="p-3.5 bg-blue-950/30 border border-blue-900/30 rounded-xl">
                      <p className="text-xs text-blue-300 leading-relaxed">
                        <span className="font-semibold text-blue-200">Passung:</span> {job.match_reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Interaction Section */}
                {state && (
                  <div className="pt-4 border-t border-slate-800/60 mt-4">
                    {state === "clicked" && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                        <span className="text-sm text-slate-200 font-medium">Hast du dich beworben?</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setInteractionState((prev) => ({
                                ...prev,
                                [job.url]: "applied",
                              }));
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer border-none flex items-center gap-1"
                          >
                            Ja
                          </button>
                          <button
                            onClick={() => {
                              setInteractionState((prev) => {
                                const next = { ...prev };
                                delete next[job.url];
                                return next;
                              });
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer border-none"
                          >
                            Nein
                          </button>
                        </div>
                      </div>
                    )}

                    {state === "applied" && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                        <span className="text-sm text-emerald-400 font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Beworben!
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedJobForSave(job);
                              setIsModalOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition cursor-pointer border-none flex items-center gap-1.5"
                          >
                            In Liste eintragen
                          </button>
                          <button
                            onClick={() => {
                              setInteractionState((prev) => ({
                                ...prev,
                                [job.url]: "saved",
                              }));
                              onJobSaved(job.url);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-1.5 rounded-lg text-xs transition cursor-pointer border-none"
                          >
                            Schon eingetragen
                          </button>
                        </div>
                      </div>
                    )}

                    {state === "saved" && (
                      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-400 text-xs font-semibold animate-fadeIn">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 bg-emerald-500/10 rounded-full flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                          <span>
                            Beworben! Eingetragen in{" "}
                            <span className="underline decoration-emerald-500/30">
                              {savedTableNames[job.url] === "job_applications"
                                ? "Standardliste (job_applications)"
                                : (savedTableNames[job.url] || "Bewerbungs-Tracker")}
                            </span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUndoSave(job.url)}
                          className="bg-transparent hover:underline text-[10px] text-slate-400 hover:text-rose-450 font-semibold cursor-pointer border-none p-0 flex items-center gap-1 transition shrink-0"
                          title="Status zurücksetzen"
                        >
                          Zurücknehmen
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SaveJobModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        availableTables={availableTables}
        onConfirm={handleSaveToDatabase}
      />
    </div>
  );
};
