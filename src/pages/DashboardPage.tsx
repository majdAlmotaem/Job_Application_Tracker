import React from "react";
import { LayoutDashboard } from "lucide-react";
import { ActivityRings } from "../components/ActivityRings";
import { JobApplication } from "../types";
import { getLocalDateString } from "../utils/matchingLogic";
import { formatInputDate } from "../utils/dateFormatter";
import { useInterviewReminders } from "../hooks/useInterviewReminders";
import { ActiveRemindersList } from "../components/ActiveRemindersList";
import { LastSearchResultsCard } from "../components/LastSearchResultsCard";
import { SavedSearch } from "../hooks/useSavedSearches";

import { useGlobalTask } from "../context/GlobalTaskContext";

export const DashboardPage: React.FC = () => {
  const {
    applications = [],
    dailyGoal = 5,
    selectedTable = "job_applications",
    setApplications = () => {},
    triggerToast = () => {},
    savedTabs = [],
  } = useGlobalTask();

  const todayStr = getLocalDateString();
  
  // 1. Calculate Daily Goal Progress (added today)
  const addedToday = applications.filter((app) => formatInputDate(app.date) === todayStr).length;

  // 2. Calculate Interviews progress
  const totalInterviews = applications.filter((app) => app.status === "Interview").length;
  const interviewsWithReminder = applications.filter(
    (app) => app.status === "Interview" && app.interview_date && app.interview_date >= todayStr
  ).length;

  // 3. Calculate Offers and Total Apps
  const offers = applications.filter((app) => app.status === "Offer").length;
  const totalApps = applications.length;

  // Load interview reminders
  const { activeReminders, handleDeleteReminder } = useInterviewReminders({
    selectedTable,
    applications,
    setApplications,
    triggerToast,
  });

  return (
    <div className="space-y-8 w-full">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white m-0">
            Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1 m-0">
            Ihre Bewerbungsaktivitäten, Suchergebnisse und kommenden Termine auf einen Blick.
          </p>
        </div>

        {/* Active List Badge */}
        <div className="flex items-center gap-2 text-[11px] font-semibold px-3.5 py-1.5 bg-slate-900/40 border border-white/5 rounded-full shadow-inner select-none backdrop-blur-sm self-start sm:self-center">
          {selectedTable && selectedTable !== "job_applications" ? (
            <>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-455 font-medium text-slate-450 text-xs">Aktive Liste:</span>
              <span className="text-slate-100 font-bold">
                {selectedTable.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-slate-500/50 shrink-0"></span>
              <span className="text-slate-500 font-medium italic">Keine aktive Liste / Wähle eine Liste aus</span>
            </>
          )}
        </div>
      </div>

      {/* Row 1: Activity Rings (Left side, directly on page background) and Anstehende Termine Card (Right side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Column: Activity Rings */}
        <div className="flex flex-col items-center justify-center relative overflow-visible w-full py-2 select-none">
          <ActivityRings
            addedToday={addedToday}
            dailyGoal={dailyGoal}
            totalInterviews={totalInterviews}
            interviewsWithReminder={interviewsWithReminder}
            offers={offers}
            totalApps={totalApps}
          />
        </div>

        {/* Right Column: Anstehende Termine Card */}
        <ActiveRemindersList
          activeReminders={activeReminders}
          todayStrForReminders={todayStr}
          handleDeleteReminder={handleDeleteReminder}
          variant="landing"
        />
      </div>

      {/* Row 2: Letzte Suchergebnisse Card (Full Width) */}
      <div className="w-full">
        <LastSearchResultsCard
          savedTabs={savedTabs}
          className="h-[280px] w-full"
          gridVariant={true}
        />
      </div>
    </div>
  );
};
