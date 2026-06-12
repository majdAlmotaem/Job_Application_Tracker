import { useState } from "react";

export interface JobSearchResultItem {
  company: string;
  job_title: string;
  location: string;
  url: string;
  match_reason: string;
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
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const executeJobSearch = async (criteria: JobSearchCriteria) => {
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

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
      setSearchResults(data.results || []);
    } catch (err: any) {
      console.error("Fehler bei der Jobsuche:", err);
      setSearchError(err.message || "Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setIsSearching(false);
    }
  };

  return {
    searchResults,
    isSearching,
    searchError,
    executeJobSearch,
  };
};
