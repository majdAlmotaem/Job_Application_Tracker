import { useState, useCallback } from "react";

export interface SavedSearch {
  id: number;
  tab_name: string;
  criteria: {
    job_title?: string;
    location?: string;
    employment_type?: string;
    keywords?: string[];
    date_posted?: string;
  };
  results: Array<{
    company: string;
    job_title: string;
    location: string;
    url: string;
    match_reason: string;
    is_saved?: boolean;
  }>;
  created_at?: string;
  isPending?: boolean;
}

export const useSavedSearches = (triggerToast: (type: "success" | "error", message: string) => void) => {
  const [savedTabsDb, setSavedTabsDb] = useState<SavedSearch[]>([]);
  const [pendingTabs, setPendingTabs] = useState<SavedSearch[]>([]);
  const [activeSearchId, setActiveSearchId] = useState<number | null>(null);
  const [isLoadingTabs, setIsLoadingTabs] = useState<boolean>(false);

  // Combined list of database saved tabs and local pending tabs
  const savedTabs = [...savedTabsDb, ...pendingTabs];

  const loadTabs = useCallback(async () => {
    setIsLoadingTabs(true);
    try {
      const response = await fetch("/api/searches");
      if (!response.ok) throw new Error("Fehler beim Laden der gespeicherten Suchen.");
      const data: SavedSearch[] = await response.json();
      setSavedTabsDb(data);
      setPendingTabs([]); // Clear local pending tabs once DB is loaded
      
      if (data.length > 0) {
        setActiveSearchId((currId) => (currId === null ? data[0].id : currId));
        return data;
      } else {
        // No searches in database. Initialize a local pending tab!
        const initialTab: SavedSearch = {
          id: -1,
          tab_name: "Suche 1",
          criteria: {
            job_title: "",
            location: "",
            employment_type: "Vollzeit",
            keywords: [],
            date_posted: "anytime"
          },
          results: [],
          isPending: true
        };
        setPendingTabs([initialTab]);
        setActiveSearchId((currId) => (currId === null ? -1 : currId));
        return [initialTab];
      }
    } catch (err: any) {
      console.error("Fehler beim Laden der gespeicherten Suchen:", err);
      // Fallback: Initialize a local pending tab so the app is always usable
      const initialTab: SavedSearch = {
        id: -1,
        tab_name: "Suche 1",
        criteria: {
          job_title: "",
          location: "",
          employment_type: "Vollzeit",
          keywords: [],
          date_posted: "anytime"
        },
        results: [],
        isPending: true
      };
      setPendingTabs([initialTab]);
      setActiveSearchId((currId) => (currId === null ? -1 : currId));
      return [initialTab];
    } finally {
      setIsLoadingTabs(false);
    }
  }, []);

  const createNewTab = async (name?: string) => {
    const defaultName = name || `Suche ${savedTabsDb.length + pendingTabs.length + 1}`;
    const nextPendingId = pendingTabs.length > 0 
      ? Math.min(...pendingTabs.map((t) => t.id)) - 1 
      : -1;
      
    const newTab: SavedSearch = {
      id: nextPendingId,
      tab_name: defaultName,
      criteria: {
        job_title: "",
        location: "",
        employment_type: "Vollzeit",
        keywords: [],
        date_posted: "anytime"
      },
      results: [],
      isPending: true
    };
    
    setPendingTabs((prev) => [...prev, newTab]);
    setActiveSearchId(newTab.id);
    return newTab;
  };

  const saveSearchToActiveTab = async (criteria: any, results: any[]) => {
    if (activeSearchId === null) return null;
    
    if (activeSearchId < 0) {
      // It's a pending tab (needs creation in DB)
      const activeTab = pendingTabs.find((t) => t.id === activeSearchId);
      if (!activeTab) return null;
      
      try {
        const response = await fetch("/api/searches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tab_name: activeTab.tab_name,
            criteria,
            results
          })
        });
        
        if (!response.ok) throw new Error("Such-Tab konnte nicht in der Datenbank gespeichert werden.");
        const newTab: SavedSearch = await response.json();
        
        // Remove from pending, add to DB tabs, set active search ID
        setPendingTabs((prev) => prev.filter((t) => t.id !== activeSearchId));
        setSavedTabsDb((prev) => [...prev, newTab]);
        setActiveSearchId(newTab.id);
        triggerToast("success", "Suche erfolgreich gespeichert.");
        return newTab;
      } catch (err: any) {
        console.error(err);
        triggerToast("error", err.message || "Fehler beim Speichern der Suche.");
        return null;
      }
    } else {
      // It's a database tab (needs update in DB)
      try {
        const response = await fetch(`/api/searches/${activeSearchId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            criteria,
            results
          })
        });
        
        if (!response.ok) throw new Error("Suche konnte im aktuellen Tab nicht gespeichert werden.");
        const updated: SavedSearch = await response.json();
        setSavedTabsDb((prev) => prev.map((t) => (t.id === activeSearchId ? updated : t)));
        triggerToast("success", "Suche erfolgreich aktualisiert.");
        return updated;
      } catch (err: any) {
        console.error(err);
        triggerToast("error", err.message || "Fehler beim Speichern der Suche.");
        return null;
      }
    }
  };

  const deleteTab = async (id: number) => {
    if (id < 0) {
      // Delete local pending tab
      setPendingTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        if (activeSearchId === id) {
          const combinedRemaining = [...savedTabsDb, ...filtered];
          if (combinedRemaining.length > 0) {
            setActiveSearchId(combinedRemaining[0].id);
          } else {
            setActiveSearchId(null);
          }
        }
        return filtered;
      });
      triggerToast("success", "Such-Tab gelöscht.");
    } else {
      // Delete database tab
      try {
        const response = await fetch(`/api/searches/${id}`, {
          method: "DELETE"
        });
        if (!response.ok) throw new Error("Tab konnte nicht gelöscht werden.");
        
        setSavedTabsDb((prev) => {
          const filtered = prev.filter((t) => t.id !== id);
          if (activeSearchId === id) {
            const combinedRemaining = [...filtered, ...pendingTabs];
            if (combinedRemaining.length > 0) {
              setActiveSearchId(combinedRemaining[0].id);
            } else {
              setActiveSearchId(null);
            }
          }
          return filtered;
        });
        triggerToast("success", "Such-Tab gelöscht.");
      } catch (err: any) {
        console.error(err);
        triggerToast("error", err.message || "Fehler beim Löschen des Such-Tabs.");
      }
    }
  };

  const renameTab = async (id: number, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return null;
    
    if (id < 0) {
      // Rename local pending tab
      setPendingTabs((prev) => prev.map((t) => (t.id === id ? { ...t, tab_name: trimmed } : t)));
      triggerToast("success", `Such-Tab in "${trimmed}" umbenannt.`);
      return { id, tab_name: trimmed, criteria: {}, results: [], isPending: true };
    } else {
      // Rename database tab
      try {
        const response = await fetch(`/api/searches/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tab_name: trimmed
          })
        });
        if (!response.ok) throw new Error("Tab konnte nicht umbenannt werden.");
        const updated: SavedSearch = await response.json();
        setSavedTabsDb((prev) => prev.map((t) => (t.id === id ? updated : t)));
        triggerToast("success", `Such-Tab in "${trimmed}" umbenannt.`);
        return updated;
      } catch (err: any) {
        console.error(err);
        triggerToast("error", err.message || "Fehler beim Umbenennen des Such-Tabs.");
        return null;
      }
    }
  };

  return {
    savedTabs,
    activeSearchId,
    setActiveSearchId,
    isLoadingTabs,
    loadTabs,
    createNewTab,
    saveSearchToActiveTab,
    deleteTab,
    renameTab,
  };
};
