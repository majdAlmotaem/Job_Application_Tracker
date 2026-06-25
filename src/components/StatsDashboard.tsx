import React from "react";

export interface DashboardMetrics {
  total: number;
  interviewing: number;
  offers: number;
  rejected: number;
}

interface StatsDashboardProps {
  metrics: DashboardMetrics;
}

import { BarChart3, Calendar, Award, Ban } from "lucide-react";

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  metrics,
}) => {
  return (
    <div className="contents">
      {/* Card 1: Total Applications */}
      <div className="professional-card p-5 flex flex-col justify-between h-full animate-fadeIn">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Bewerbungen insgesamt
          </span>
          <span className="text-3xl font-extrabold text-slate-100 block mt-2 tracking-tight">
            {metrics.total}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <BarChart3 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>In aktiver Tabelle</span>
        </div>
      </div>

      {/* Card 2: Active Interviews */}
      <div className="professional-card p-5 flex flex-col justify-between h-full animate-fadeIn">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Aktive Interviews
          </span>
          <span className="text-3xl font-extrabold text-amber-500 dark:text-amber-400 block mt-2 tracking-tight">
            {metrics.interviewing}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Interviews</span>
        </div>
      </div>

      {/* Card 3: Offers Received */}
      <div className="professional-card p-5 flex flex-col justify-between h-full animate-fadeIn">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Angebote erhalten
          </span>
          <span className="text-3xl font-extrabold text-emerald-400 block mt-2 tracking-tight">
            {metrics.offers}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Vertragsangebote</span>
        </div>
      </div>

      {/* Card 4: Rejections */}
      <div className="professional-card p-5 flex flex-col justify-between h-full animate-fadeIn">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Absagen
          </span>
          <span className="text-3xl font-extrabold text-rose-550 dark:text-rose-400 block mt-2 tracking-tight">
            {metrics.rejected}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Ban className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>Nicht berücksichtigte</span>
        </div>
      </div>
    </div>
  );
};
