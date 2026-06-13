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

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  metrics,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Applications */}
      <div className="professional-card p-5 flex flex-col justify-center">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Bewerbungen insgesamt
        </span>
        <span className="text-3xl font-bold text-slate-100 block mt-2 tracking-tight animate-fadeIn">
          {metrics.total}
        </span>
      </div>

      {/* Card 2: Active Interviews */}
      <div className="professional-card p-5 flex flex-col justify-center">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Aktive Interviews
        </span>
        <span className="text-3xl font-bold text-amber-500 dark:text-amber-400 block mt-2 tracking-tight animate-fadeIn">
          {metrics.interviewing}
        </span>
      </div>

      {/* Card 3: Offers Received */}
      <div className="professional-card p-5 flex flex-col justify-center">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Angebote erhalten
        </span>
        <span className="text-3xl font-bold text-emerald-400 block mt-2 tracking-tight animate-fadeIn">
          {metrics.offers}
        </span>
      </div>

      {/* Card 4: Rejections */}
      <div className="professional-card p-5 flex flex-col justify-center">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Absagen
        </span>
        <span className="text-3xl font-bold text-rose-500 dark:text-rose-455 block mt-2 tracking-tight animate-fadeIn">
          {metrics.rejected}
        </span>
      </div>
    </div>
  );
};
