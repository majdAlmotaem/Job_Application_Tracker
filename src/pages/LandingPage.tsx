import React from "react";
import { Link } from "react-router-dom";
import { Table, Search, User, Sparkles } from "lucide-react";
import Lottie from "lottie-react";
import catAnimation from "../assets/animations/Cat playing animation.json";
import { ActivityRings } from "../components/ActivityRings";
import { JobApplication } from "../types";
import { getLocalDateString } from "../utils/matchingLogic";
import { useInterviewReminders } from "../hooks/useInterviewReminders";
import { ActiveRemindersList } from "../components/ActiveRemindersList";

interface LandingPageProps {
  applications?: JobApplication[];
  dailyGoal?: number;
  selectedTable?: string;
  setApplications?: React.Dispatch<React.SetStateAction<JobApplication[]>>;
  triggerToast?: (type: "success" | "error", message: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  applications = [],
  dailyGoal = 5,
  selectedTable = "job_applications",
  setApplications = () => {},
  triggerToast = () => {},
}) => {
  const todayStr = getLocalDateString();
  
  // 1. Calculate Daily Goal Progress (added today)
  const addedToday = applications.filter((app) => app.date === todayStr).length;

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
    <div className="space-y-8 max-w-4xl mx-auto py-6">
      {/* Welcome Banner */}
      <header className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-r from-blue-900/20 via-slate-900/30 to-purple-950/15 p-8 lg:p-12 shadow-2xl">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight m-0 max-w-xl">
            Ihre Bewerbungen, intelligent organisiert.
          </h1>
          <div className="w-48 h-20 md:w-60 md:h-26 flex items-center justify-center shrink-0 overflow-hidden select-none -scale-x-100">
            <Lottie animationData={catAnimation} loop={true} className="w-full h-full object-contain" />
          </div>
        </div>
      </header>

      {/* Overview Dashboard: Activity Rings & Termine */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: Activity Rings (directly on page background) */}
        <div className="flex flex-col items-center justify-center relative overflow-visible w-full gap-2">
          {/* Active List Badge */}
          <div className="self-start md:ml-4 mb-2 flex items-center gap-2 text-[11px] font-semibold px-3.5 py-1.5 bg-slate-900/40 border border-white/5 rounded-full shadow-inner select-none backdrop-blur-sm">
            {selectedTable && selectedTable !== "job_applications" ? (
              <>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-slate-400 font-medium">Aktive Liste:</span>
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

          <ActivityRings
            addedToday={addedToday}
            dailyGoal={dailyGoal}
            totalInterviews={totalInterviews}
            interviewsWithReminder={interviewsWithReminder}
            offers={offers}
            totalApps={totalApps}
          />
        </div>

        {/* Right: Upcoming Termine Card (Reused component) */}
        <ActiveRemindersList
          activeReminders={activeReminders}
          todayStrForReminders={todayStr}
          handleDeleteReminder={handleDeleteReminder}
          variant="landing"
        />
      </div>

      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Job Tracker */}
        <Link
          to="/tracker"
          className="group professional-card p-6 hover:border-blue-500/30 transition duration-300 flex flex-col justify-between hover:scale-[1.02]"
        >
          <div className="space-y-4">
            <div className="h-10 w-10 bg-blue-500/10 border border-blue-500/15 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition duration-300">
              <Table className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Bewerbungs-Tracker</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Verwalten Sie Ihre aktuellen Bewerbungen. Fügen Sie Einträge manuell hinzu oder synchronisieren Sie Gmail.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mt-6 group-hover:translate-x-1 transition duration-150">
            Tracker öffnen &rarr;
          </span>
        </Link>

        {/* Card 2: Job Search */}
        <Link
          to="/search"
          className="group professional-card p-6 hover:border-purple-500/30 transition duration-300 flex flex-col justify-between hover:scale-[1.02]"
        >
          <div className="space-y-4">
            <div className="h-10 w-10 bg-purple-500/10 border border-purple-500/15 rounded-xl flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition duration-300">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Job-Suche</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Suchen Sie nach neuen Karrieremöglichkeiten auf verschiedenen Portalen (In Kürze verfügbar).
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block mt-6 group-hover:translate-x-1 transition duration-150">
            Details ansehen &rarr;
          </span>
        </Link>

        {/* Card 3: Profile */}
        <Link
          to="/profile"
          className="group professional-card p-6 hover:border-emerald-500/30 transition duration-300 flex flex-col justify-between hover:scale-[1.02]"
        >
          <div className="space-y-4">
            <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/15 rounded-xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition duration-300">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Profil bearbeiten</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Verwalten Sie Ihre persönlichen Profildaten, Lebensläufe und Einstellungen (In Kürze verfügbar).
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mt-6 group-hover:translate-x-1 transition duration-150">
            Profil verwalten &rarr;
          </span>
        </Link>
      </div>
    </div>
  );
};
