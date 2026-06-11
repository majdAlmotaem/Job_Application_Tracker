import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Table, Search, User, Sparkles, Target, ArrowRight, Clock, Trash2 } from "lucide-react";
import { JobApplication } from "../types";

interface InterviewReminder {
  id: string;
  applicationId: string;
  company: string;
  date: string;
  tableName: string;
}

interface LandingPageProps {
  selectedTable: string;
  dailyGoal: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({ selectedTable, dailyGoal }) => {
  const [addedToday, setAddedToday] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [reminders, setReminders] = useState<InterviewReminder[]>(() => {
    const saved = localStorage.getItem("syncsheet_interview_reminders");
    return saved ? JSON.parse(saved) : [];
  });

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchTodayApps = async () => {
      if (!selectedTable || selectedTable.startsWith("neue_liste")) {
        setAddedToday(0);
        setApplications([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`/api/applications?table_name=${encodeURIComponent(selectedTable)}`);
        if (response.ok) {
          const apps: JobApplication[] = await response.json();
          setApplications(apps);
          const todayStr = getLocalDateString();
          const count = apps.filter((app) => app.date === todayStr).length;
          setAddedToday(count);
        }
      } catch (err) {
        console.error("Error fetching applications for landing page:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTodayApps();
  }, [selectedTable]);

  const todayStrForReminders = getLocalDateString();
  const activeReminders = reminders.filter(rem => {
    if (rem.tableName !== selectedTable) return false;
    if (rem.date < todayStrForReminders) return false;
    const linkedApp = applications.find(app => app.id === rem.applicationId);
    if (!linkedApp || linkedApp.status !== "Interview") return false;
    return true;
  });

  useEffect(() => {
    if (isLoading) return;
    const todayStr = getLocalDateString();
    const otherTablesReminders = reminders.filter(r => r.tableName !== selectedTable && r.date >= todayStr);
    const prunedAll = [...otherTablesReminders, ...activeReminders];
    if (prunedAll.length !== reminders.length) {
      setReminders(prunedAll);
      localStorage.setItem("syncsheet_interview_reminders", JSON.stringify(prunedAll));
    }
  }, [applications, selectedTable, isLoading]);

  const handleDeleteReminder = (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    localStorage.setItem("syncsheet_interview_reminders", JSON.stringify(updated));
  };

  const progressPercent = dailyGoal > 0 ? Math.min((addedToday / dailyGoal) * 100, 100) : 0;

  const getGoalFeedback = () => {
    if (addedToday === 0) {
      return {
        message: "Starte jetzt damit! Trage deine erste Bewerbung ein.",
        badge: "Bereit zum Start",
        colorClass: "border-blue-500/20 bg-blue-500/5 text-blue-400",
        barColor: "bg-blue-500",
      };
    } else if (addedToday < dailyGoal) {
      return {
        message: "Sie sind fast da!",
        badge: "Fast am Ziel",
        colorClass: "border-amber-500/20 bg-amber-500/5 text-amber-400",
        barColor: "bg-amber-500",
      };
    } else {
      return {
        message: "Tagesziel erreicht! Großartige Arbeit, du hast dein Bewerbungssoll für heute erfüllt.",
        badge: "Ziel erreicht",
        colorClass: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
        barColor: "bg-emerald-500",
      };
    }
  };

  const feedback = getGoalFeedback();

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6">
      {/* Welcome Banner */}
      <header className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-r from-blue-900/20 via-slate-900/30 to-purple-950/15 p-8 lg:p-12 shadow-2xl">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 border border-blue-500/15 text-blue-400">
            <Sparkles className="h-3.5 w-3.5" /> Willkommen bei SyncSheet
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Ihre Bewerbungen, intelligent organisiert.
          </h1>
          <p className="text-slate-355 text-sm max-w-2xl leading-relaxed">
            Synchronisieren Sie Ihren Gmail-Posteingang automatisch, analysieren Sie Rückmeldungen per KI und behalten Sie den Überblick über alle Jobangebote und Interviewtermine an einem einzigen, geschützten Ort.
          </p>
        </div>
      </header>

      {/* Goal Status Card */}
      {!isLoading && (
        <div className={`p-6 rounded-2xl border ${feedback.colorClass} shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300`}>
          <div className="flex-1 space-y-3 w-full">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${feedback.colorClass}`}>
                {feedback.badge}
              </span>
              <span className="text-xs font-semibold text-slate-400">Tagesziel-Fortschritt</span>
            </div>

            <h2 className="text-base font-bold text-slate-100 leading-tight">
              {feedback.message}
            </h2>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                <span>Fortschritt</span>
                <span>{addedToday} / {dailyGoal} Bewerbungen</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${feedback.barColor} transition-all duration-500`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <Link
            to="/tracker"
            className="flex items-center gap-1.5 shrink-0 bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-white/10 text-slate-200 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            <span>Tracker aufrufen</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Active Interview Reminders Card */}
      {!isLoading && activeReminders.length > 0 && (
        <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Anstehende Interviews ({activeReminders.length})</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeReminders.map((rem) => {
              const today = new Date(todayStrForReminders);
              const interviewDate = new Date(rem.date);
              const diffTime = interviewDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              let badgeText = `In ${diffDays} Tagen`;
              if (diffDays === 0) badgeText = "Heute!";
              if (diffDays === 1) badgeText = "Morgen!";

              return (
                <div key={rem.id} className="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-xl p-4 flex items-center justify-between gap-3 group/item transition">
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-bold text-slate-100 truncate">{rem.company}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <span>Termin:</span>
                      <span className="font-bold text-slate-200">{new Date(rem.date).toLocaleDateString("de-DE")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diffDays === 0 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                      {badgeText}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteReminder(rem.id)}
                      className="opacity-0 group-hover/item:opacity-100 focus:opacity-100 transition-opacity p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-450 border-none cursor-pointer bg-transparent"
                      title="Termin entfernen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/15 rounded-xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-50 group-hover:text-white transition duration-300">
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
