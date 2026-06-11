import React from "react";
import { Search } from "lucide-react";

export const JobSearchPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
      <div className="h-16 w-16 bg-purple-500/10 border border-purple-500/15 rounded-2xl flex items-center justify-center text-purple-400 mb-6 animate-pulse">
        <Search className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Job-Suche</h2>
      <p className="text-slate-400 text-sm max-w-sm">
        Coming Soon: Finden Sie passende Jobs direkt aus der Anwendung heraus.
      </p>
    </div>
  );
};
