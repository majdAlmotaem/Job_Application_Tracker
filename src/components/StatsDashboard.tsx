import React from "react";
import { Clock, Sparkles } from "lucide-react";

interface DashboardMetrics {
  total: number;
  interviewing: number;
  offers: number;
  rejected: number;
}

interface StatsDashboardProps {
  metrics: DashboardMetrics;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total Applications */}
      <div className="professional-card p-5 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Verarbeitete Bewerbungen
          </span>
          <span className="text-3xl font-bold text-slate-100 block mt-2">
            {metrics.total}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mt-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          Datenbank aktiv
        </div>
      </div>

      {/* Active Interviews */}
      <div className="professional-card p-5 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Aktive Interviews
          </span>
          <span className="text-3xl font-bold text-amber-500 dark:text-amber-400 block mt-2">
            {metrics.interviewing}
          </span>
        </div>
        <div className="text-xs text-slate-400 mt-3 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-amber-400" /> Kalendervorbereitung nötig
        </div>
      </div>

      {/* Offers Received */}
      <div className="professional-card p-5 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Angebote erhalten
          </span>
          <span className="text-3xl font-bold text-emerald-400 dark:text-emerald-455 block mt-2">
            {metrics.offers}
          </span>
        </div>
        <div className="text-xs text-emerald-400 mt-3 flex items-center gap-1.5 font-semibold bg-emerald-950/30 px-2 py-0.5 rounded-full w-max">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Herzlichen Glückwunsch!
        </div>
      </div>

      {/* Rejections */}
      <div className="professional-card p-5 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Absagen
          </span>
          <span className="text-3xl font-bold text-rose-500 dark:text-rose-455 block mt-2">
            {metrics.rejected}
          </span>
        </div>
        <div className="text-xs text-slate-400 mt-3 flex items-center gap-1">
          Statistik-Übersicht
        </div>
      </div>
    </div>
  );
};
