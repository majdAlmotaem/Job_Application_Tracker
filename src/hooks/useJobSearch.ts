import { useGlobalTask } from "../context/GlobalTaskContext";
import { JobSearchCriteria, JobSearchResultItem } from "../types";

export type { JobSearchCriteria, JobSearchResultItem };

export const useJobSearch = () => {
  const {
    jobSearchResults: searchResults,
    setJobSearchResults: setSearchResults,
    isJobSearchRunning: isSearching,
    jobSearchError: searchError,
    jobSearchProgress: syncProgress,
    jobSearchPhase: syncPhase,
    jobSearchDetails: syncDetails,
    startBackgroundJobSearch,
  } = useGlobalTask();

  const executeJobSearch = async (
    criteria: JobSearchCriteria,
    activeSearchId: number | null,
    saveSearchToActiveTab?: (criteria: any, results: any[]) => Promise<any>
  ) => {
    await startBackgroundJobSearch(criteria, activeSearchId, saveSearchToActiveTab);
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

