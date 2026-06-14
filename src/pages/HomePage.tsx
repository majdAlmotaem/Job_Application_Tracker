import React from "react";
import { Link } from "react-router-dom";
import { Table, Search, User, FileText } from "lucide-react";
import Lottie from "lottie-react";
import catAnimation from "../assets/animations/Cat playing animation.json";

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-8 w-full">
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

      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Card 3: CV-Maker */}
        <Link
          to="/cv-maker"
          className="group professional-card p-6 hover:border-indigo-500/30 transition duration-300 flex flex-col justify-between hover:scale-[1.02]"
        >
          <div className="space-y-4">
            <div className="h-10 w-10 bg-indigo-500/10 border border-indigo-500/15 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition duration-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">CV-Maker (Lebenslauf)</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Erstellen Sie einen professionellen, DIN-A4-konformen Lebenslauf mit Echtzeit-Live-Vorschau und PDF-Export.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mt-6 group-hover:translate-x-1 transition duration-150">
            Lebenslauf erstellen &rarr;
          </span>
        </Link>

        {/* Card 4: Profile */}
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
