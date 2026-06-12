import React from "react";
import { Briefcase, MapPin, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { JobSearchResultItem } from "../hooks/useJobSearch";

interface JobSearchResultsProps {
  results: JobSearchResultItem[];
  isSearching: boolean;
}

export const JobSearchResults: React.FC<JobSearchResultsProps> = ({ results, isSearching }) => {
  if (isSearching) {
    return (
      <div className="space-y-6 mt-8">
        <div className="flex items-center justify-center gap-3 p-6 bg-slate-900/40 border border-slate-800/60 rounded-2xl shadow-xl">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          <span className="text-slate-300 text-sm font-semibold">
            Durchsuche das Web nach passenden Stellen...
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-900/20 border border-slate-800/60 rounded-2xl p-6 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2.5 w-2/3">
                  <div className="h-4 bg-slate-800/60 rounded-full w-full" />
                  <div className="h-3.5 bg-slate-850/60 rounded-full w-5/6" />
                </div>
                <div className="h-9 w-9 bg-slate-800/60 rounded-xl" />
              </div>
              <div className="h-3 bg-slate-800/60 rounded-full w-1/3" />
              <div className="h-12 bg-slate-850/40 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-400" />
        <h2 className="text-xl font-bold text-white tracking-tight">Gefundene Stellenanzeigen</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map((job, idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between bg-slate-900/20 border border-slate-800/60 hover:border-purple-500/30 hover:bg-purple-950/5 transition-all duration-300 rounded-2xl p-6 shadow-xl group relative overflow-hidden"
          >
            {/* Subtle glow on hover */}
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all duration-300" />
            
            <div className="space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <span className="inline-block text-[10px] font-bold tracking-wider uppercase text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/15">
                    {job.company}
                  </span>
                  <h3 className="text-base font-bold text-slate-100 leading-snug group-hover:text-purple-350 transition-colors">
                    {job.job_title}
                  </h3>
                </div>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 bg-slate-900 hover:bg-purple-900/20 border border-slate-800/80 hover:border-purple-500/40 rounded-xl flex items-center justify-center text-slate-400 hover:text-purple-300 transition-all duration-300 shrink-0"
                  title="Stellenanzeige öffnen"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-purple-400/80" />
                  <span>{job.company}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-purple-400/80" />
                  <span>{job.location || "Siehe Anzeige"}</span>
                </div>
              </div>

              {job.match_reason && (
                <div className="p-3.5 bg-purple-950/20 border border-purple-900/20 rounded-xl">
                  <p className="text-xs text-purple-300 leading-relaxed">
                    <span className="font-semibold text-purple-200">Passung:</span> {job.match_reason}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
