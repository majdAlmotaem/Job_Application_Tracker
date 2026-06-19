import { useState } from "react";
import { useGlobalTask } from "../context/GlobalTaskContext";

export interface JobSearchResultItem {
  company: string;
  job_title: string;
  location: string;
  url: string;
  match_reason: string;
  is_saved?: boolean;
}

export interface JobSearchCriteria {
  job_title: string;
  location: string;
  employment_type: string;
  keywords: string[];
  date_posted: string;
}

export const useJobSearch = () => {
  const [searchResults, setSearchResults] = useState<JobSearchResultItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const {
    isJobSearchRunning: isSearching,
    jobSearchProgress: syncProgress,
    jobSearchPhase: syncPhase,
    jobSearchDetails: syncDetails,
    startJobSearch: startAITask,
    updateJobSearch: updateAITask,
    stopJobSearch: stopAITask,
  } = useGlobalTask();

  const executeJobSearch = async (criteria: JobSearchCriteria) => {
    setSearchError(null);
    setSearchResults([]);
    
    startAITask("Suchanfrage wird formatiert...", "Kriterien werden analysiert");
    
    let currentProgress = 5;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 8) + 2;
      if (currentProgress >= 95) {
        currentProgress = 95;
        updateAITask(95, "Stellenanzeigen werden extrahiert...", "Die passendsten Angebote werden ausgewählt");
      } else {
        let phaseStr = "Job-Suche läuft...";
        let detailsStr = "";
        if (currentProgress > 75) {
          phaseStr = "Stellenanzeigen werden extrahiert...";
          detailsStr = "Die passendsten Angebote werden ausgewählt";
        } else if (currentProgress > 50) {
          phaseStr = "Live-Websuche läuft...";
          detailsStr = "Google-Suchergebnisse werden analysiert";
        } else if (currentProgress > 25) {
          phaseStr = "Suchkriterien werden verarbeitet...";
          detailsStr = "Gemini initiiert die Google-Suche";
        } else {
          phaseStr = "Suchanfrage wird formatiert...";
          detailsStr = "Kriterien werden analysiert";
        }
        updateAITask(currentProgress, phaseStr, detailsStr);
      }
    }, 500);

    try {
      const response = await fetch("/api/jobs/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(criteria),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Die Jobsuche ist fehlgeschlagen.");
      }

      const data = await response.json();
      const results = data.results || [];
      setSearchResults(results);
      return results;
    } catch (err: any) {
      console.error("Fehler bei der Jobsuche:", err);
      setSearchError(err.message || "Ein unerwarteter Fehler ist aufgetreten.");
      return null;
    } finally {
      clearInterval(interval);
      stopAITask();
    }
  };

  return {
    searchResults,
    setSearchResults,
    isSearching,
    searchError,
    executeJobSearch,
    syncProgress,
    syncPhase,
    syncDetails,
  };
};
