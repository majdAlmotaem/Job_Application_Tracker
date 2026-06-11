import React from "react";
import { User } from "lucide-react";

export const ProfilePage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
      <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 animate-pulse">
        <User className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Profil bearbeiten</h2>
      <p className="text-slate-400 text-sm max-w-sm">
        Coming Soon: Laden Sie Ihren Lebenslauf hoch, pflegen Sie Ihre Profildaten und verwalten Sie Einstellungen.
      </p>
    </div>
  );
};
