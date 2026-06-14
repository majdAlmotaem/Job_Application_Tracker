import React from "react";
import { Search, ExternalLink } from "lucide-react";
import { SavedSearch } from "../hooks/useSavedSearches";

interface LastSearchResultsCardProps {
  savedTabs: SavedSearch[];
  className?: string;
  gridVariant?: boolean;
}

export const LastSearchResultsCard: React.FC<LastSearchResultsCardProps> = ({
  savedTabs = [],
  className = "",
  gridVariant = false,
}) => {
  // Find the latest tab that has search results, or default to the last tab
  const activeTabWithResults = [...savedTabs]
    .reverse()
    .find((tab) => tab.results && tab.results.length > 0);

  const latestSearch = activeTabWithResults || (savedTabs.length > 0 ? savedTabs[savedTabs.length - 1] : null);
  const results = latestSearch ? latestSearch.results : [];

  return (
    <div className={`professional-card p-6 border border-purple-500/20 bg-purple-500/5 rounded-2xl flex flex-col hover:scale-[1.01] transition duration-300 overflow-hidden h-[280px] w-full ${className}`}>
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
          <Search className="w-4 h-4 text-purple-500 shrink-0" />
          <span>Letzte Suchergebnisse</span>
        </div>
        {latestSearch && (
          <span className="text-[10px] text-slate-500 font-mono font-bold truncate max-w-[120px]" title={latestSearch.tab_name}>
            {latestSearch.tab_name.toUpperCase()}
          </span>
        )}
      </div>

      {results.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-2 select-none">
          <Search className="w-8 h-8 text-slate-500/20 mb-1" />
          <p className="text-slate-400 text-xs font-bold">Keine Suchergebnisse</p>
          <p className="text-slate-555 text-[10px] text-slate-500 leading-relaxed max-w-[220px]">
            Führen Sie eine Jobsuche im Suchbereich durch, um die neuesten Angebote hier zu sehen.
          </p>
        </div>
      ) : (
        <div className={
          gridVariant
            ? "flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1 content-start custom-scrollbar"
            : "flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar"
        }>
          {results.map((job, idx) => {
            return (
              <a
                key={idx}
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-950/40 border border-white/5 hover:border-purple-500/20 rounded-xl p-3 flex items-center justify-between gap-3 group/item transition no-underline block text-left"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-100 truncate group-hover/item:text-purple-400 transition">
                    {job.job_title}
                  </div>
                  <div className="text-[10px] text-slate-450 flex items-center gap-1 text-slate-400">
                    <span className="font-bold truncate max-w-[120px]">{job.company}</span>
                    <span>&bull;</span>
                    <span className="truncate">{job.location}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {job.match_score !== undefined && (
                    <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 font-mono">
                      {job.match_score}/10
                    </span>
                  )}
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover/item:text-purple-450 transition" />
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
