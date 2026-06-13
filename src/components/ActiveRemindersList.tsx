import React from "react";
import { Clock, Trash2 } from "lucide-react";
import { InterviewReminder } from "../types";

interface ActiveRemindersListProps {
  activeReminders: InterviewReminder[];
  todayStrForReminders: string;
  handleDeleteReminder: (id: string) => void;
  variant?: "tracker" | "landing";
}

export const ActiveRemindersList: React.FC<ActiveRemindersListProps> = ({
  activeReminders,
  todayStrForReminders,
  handleDeleteReminder,
  variant = "tracker",
}) => {
  const isLanding = variant === "landing";

  if (activeReminders.length === 0) {
    if (isLanding) {
      return (
        <div className="professional-card p-6 border border-amber-500/20 bg-amber-500/5 rounded-2xl flex flex-col hover:scale-[1.01] transition duration-300 overflow-hidden h-[280px] w-full">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-4 shrink-0">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Anstehende Termine (0)</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-2 select-none">
            <Clock className="w-8 h-8 text-slate-650/30 mb-1" />
            <p className="text-slate-400 text-xs font-bold">Keine anstehenden Termine</p>
            <p className="text-slate-500 text-[10px] leading-relaxed max-w-[220px]">
              Tragen Sie im Tracker Bewerbungen mit dem Status "Interview" und einem Datum ein.
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  const wrapperClass = isLanding
    ? "professional-card p-6 border border-amber-500/20 bg-amber-500/5 rounded-2xl flex flex-col hover:scale-[1.01] transition duration-300 overflow-hidden h-[280px] w-full"
    : "professional-card p-5 border border-amber-500/20 bg-amber-500/5 rounded-xl space-y-3.5";

  const listContainerClass = isLanding
    ? "flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3";

  return (
    <div className={wrapperClass}>
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            {isLanding ? "Anstehende Termine" : "Anstehende Interview-Termine"} ({activeReminders.length})
          </span>
        </div>
        {isLanding && (
          <span className="text-[10px] text-slate-500 font-mono font-bold">
            {activeReminders.length} AKTIV
          </span>
        )}
      </div>

      <div className={listContainerClass}>
        {activeReminders.map((rem) => {
          const today = new Date(todayStrForReminders);
          const interviewDate = new Date(rem.date);
          const diffTime = interviewDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          let badgeText = `In ${diffDays} Tagen`;
          if (diffDays === 0) badgeText = "Heute!";
          if (diffDays === 1) badgeText = "Morgen!";

          return (
            <div
              key={rem.id}
              className="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-xl p-3.5 flex items-center justify-between gap-3 group/item transition"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="text-xs font-bold text-slate-100 truncate">{rem.company}</div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                  <span>Termin:</span>
                  <span className="font-bold text-slate-200">
                    {new Date(rem.date).toLocaleDateString("de-DE")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    diffDays === 0
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {badgeText}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteReminder(rem.id)}
                  className="opacity-0 group-hover/item:opacity-100 focus:opacity-100 transition-opacity p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-450 border-none cursor-pointer bg-transparent"
                  title="Termin entfernen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
