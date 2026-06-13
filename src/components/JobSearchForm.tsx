import React, { useState, useEffect } from "react";
import { Search, RefreshCw } from "lucide-react";

interface CVExtractionResult {
  job_title: string;
  location: string;
  employment_type: string;
  keywords: string[];
}

interface JobSearchCriteria extends CVExtractionResult {
  date_posted: string;
}

interface JobSearchFormProps {
  initialValues: CVExtractionResult;
  onSubmit: (values: JobSearchCriteria) => void;
  isSearching: boolean;
}

export const JobSearchForm: React.FC<JobSearchFormProps> = ({
  initialValues,
  onSubmit,
  isSearching,
}) => {
  const [jobTitle, setJobTitle] = useState(initialValues.job_title);
  const [location, setLocation] = useState(initialValues.location);
  const [employmentType, setEmploymentType] = useState(initialValues.employment_type);
  const [keywordsInput, setKeywordsInput] = useState(initialValues.keywords.join(", "));
  const [datePosted, setDatePosted] = useState("anytime");

  // Synchronize state when initialValues prop changes (e.g. after CV upload)
  useEffect(() => {
    setJobTitle(initialValues.job_title);
    setLocation(initialValues.location);
    setEmploymentType(initialValues.employment_type);
    setKeywordsInput(initialValues.keywords.join(", "));
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedKeywords = keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    onSubmit({
      job_title: jobTitle,
      location,
      employment_type: employmentType,
      keywords: parsedKeywords,
      date_posted: datePosted,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Job Title */}
        <div className="space-y-1.5">
          <label htmlFor="jobTitle" className="text-xs font-semibold text-slate-100 block">
            Beruf / Position
          </label>
          <input
            id="jobTitle"
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="z.B. Softwareentwickler"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
            required
          />
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <label htmlFor="location" className="text-xs font-semibold text-slate-100 block">
            Ort
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="z.B. Düsseldorf oder Remote"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
          />
        </div>

        {/* Employment Type */}
        <div className="space-y-1.5">
          <label htmlFor="employmentType" className="text-xs font-semibold text-slate-100 block">
            Anstellungsart
          </label>
          <select
            id="employmentType"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 cursor-pointer"
          >
            <option value="Vollzeit" className="bg-slate-950 text-white font-semibold">Vollzeit</option>
            <option value="Teilzeit" className="bg-slate-950 text-white font-semibold">Teilzeit</option>
            <option value="Freie Mitarbeit" className="bg-slate-950 text-white font-semibold">Freie Mitarbeit</option>
            <option value="Praktikum" className="bg-slate-950 text-white font-semibold">Praktikum</option>
            <option value="Werkstudent" className="bg-slate-950 text-white font-semibold">Werkstudent</option>
            <option value="N/A" className="bg-slate-950 text-white font-semibold">N/A / Nicht spezifiziert</option>
          </select>
        </div>

        {/* Date Posted */}
        <div className="space-y-1.5">
          <label htmlFor="datePosted" className="text-xs font-semibold text-slate-100 block">
            Veröffentlichungsdatum
          </label>
          <select
            id="datePosted"
            value={datePosted}
            onChange={(e) => setDatePosted(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 cursor-pointer"
          >
            <option value="anytime" className="bg-slate-950 text-white font-semibold">Beliebig</option>
            <option value="24h" className="bg-slate-950 text-white font-semibold">Letzte 24 Stunden</option>
            <option value="3days" className="bg-slate-950 text-white font-semibold">Letzte 3 Tage</option>
            <option value="week" className="bg-slate-950 text-white font-semibold">Letzte Woche</option>
            <option value="month" className="bg-slate-950 text-white font-semibold">Letzter Monat</option>
          </select>
        </div>

        {/* Keywords */}
        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="keywords" className="text-xs font-semibold text-slate-100 block">
            Keywords / Skills (Kommagetrennt)
          </label>
          <input
            id="keywords"
            type="text"
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            placeholder="z.B. React, TypeScript, Python"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 flex flex-col gap-4">
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSearching}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 border-none text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-blue-900/20 disabled:opacity-50"
          >
            {isSearching ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Sucht...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Jobs suchen</span>
              </>
            )}
          </button>
        </div>

      </div>
    </form>
  );
};
