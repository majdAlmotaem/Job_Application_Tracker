import React, { useState, useEffect } from "react";
import { Clock, Check, Target, Edit2 } from "lucide-react";

interface DailyGoalCardProps {
  addedToday: number;
  dailyGoal: number;
  setDailyGoal: (goal: number) => void;
  className?: string;
}

export const DailyGoalCard: React.FC<DailyGoalCardProps> = ({
  addedToday,
  dailyGoal,
  setDailyGoal,
  className = "",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [goalInput, setGoalInput] = useState(dailyGoal.toString());

  // Keep goalInput in sync with dailyGoal changes
  useEffect(() => {
    setGoalInput(dailyGoal.toString());
  }, [dailyGoal]);

  const handleSaveGoal = () => {
    const parsed = parseInt(goalInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setDailyGoal(parsed);
      setIsEditing(false);
    } else {
      setGoalInput(dailyGoal.toString());
      setIsEditing(false);
    }
  };

  // SVG circular progress settings
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = dailyGoal > 0 ? Math.min(addedToday / dailyGoal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);
  const isGoalReached = dailyGoal > 0 && addedToday >= dailyGoal;

  return (
    <div className={`professional-card p-5 flex flex-col justify-between group relative overflow-hidden ${className}`}>
      {/* Glow effect when goal reached */}
      {isGoalReached && (
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
      )}
      
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Bewerbungsziel heute
          </span>
          
          {isEditing ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <input
                type="number"
                value={goalInput}
                min="1"
                autoFocus
                onChange={(e) => setGoalInput(e.target.value)}
                onBlur={handleSaveGoal}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveGoal();
                  if (e.key === "Escape") {
                    setGoalInput(dailyGoal.toString());
                    setIsEditing(false);
                  }
                }}
                className="w-20 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1 text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
              />
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSaveGoal(); }}
                className="p-1 hover:bg-slate-800 rounded text-emerald-400 border-none cursor-pointer bg-transparent"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-3xl font-extrabold text-slate-100 block tracking-tight animate-fadeIn">
                {addedToday}
                <span className="text-sm font-semibold text-slate-500 ml-1">/ {dailyGoal}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setGoalInput(dailyGoal.toString());
                  setIsEditing(true);
                }}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white border-none cursor-pointer bg-transparent animate-fadeIn"
                title="Tagesziel bearbeiten"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* SVG Progress Circle */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-14 h-14 transform -rotate-90">
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <circle
              cx="28"
              cy="28"
              r={radius}
              className="stroke-slate-800/80"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="28"
              cy="28"
              r={radius}
              className="transition-all duration-500 ease-out"
              stroke="url(#progressGradient)"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                filter: isGoalReached ? "drop-shadow(0px 0px 3px rgba(139, 92, 246, 0.4))" : "none"
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Target className={`w-4 h-4 ${isGoalReached ? "text-emerald-400" : "text-slate-500"}`} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
        {isGoalReached ? (
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            🎉 Ziel erreicht! Super!
          </span>
        ) : (
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400 font-bold shrink-0" />
            Heute hinzugefügt
          </span>
        )}
      </div>
    </div>
  );
};
