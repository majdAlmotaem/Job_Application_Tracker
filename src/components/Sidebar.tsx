import React, { useState } from "react";
import { User } from "firebase/auth";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Mail,
  Table,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  LayoutDashboard,
  Search,
  User as UserIcon,
  Plus,
  Clock,
  Home,
  FileText,
  Settings,
} from "lucide-react";
import { SavedSearch } from "../hooks/useSavedSearches";

interface PendingTab {
  key: string;
  label: string;
}

interface SidebarProps {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean) => void;
  availableTables: string[];
  pendingTabs: PendingTab[];
  selectedTable: string;
  setSelectedTable: (val: string) => void;
  onRequestNewTab: () => void;

  // New props for Saved Searches
  savedTabs: SavedSearch[];
  activeSearchId: number | null;
  setActiveSearchId: (id: number | null) => void;
  createNewTab: (name?: string) => Promise<any>;
  deleteTab: (id: number) => Promise<void>;
  renameTab: (id: number, newName: string) => Promise<any>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  availableTables,
  pendingTabs,
  selectedTable,
  setSelectedTable,
  onRequestNewTab,

  savedTabs,
  activeSearchId,
  setActiveSearchId,
  createNewTab,
  deleteTab,
  renameTab,
}) => {
  const navigate = useNavigate();
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [searchTabsOpen, setSearchTabsOpen] = useState(false);

  const formatTableName = (name: string) => {
    if (name === "job_applications") return "Standard-Tabelle";
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleNewTab = () => {
    onRequestNewTab(); // adds pending tab + sets selectedTable in App
    navigate("/tracker");
  };

  const totalTabs = availableTables.filter((t) => t !== "job_applications").length + pendingTabs.length;

  return (
    <aside
      className={`h-screen shrink-0 flex flex-col transition-all duration-300 ${
        isSidebarCollapsed ? "w-20" : "w-72"
      } bg-slate-900/30 backdrop-blur-xl border-r border-white/5`}
    >
      <div className={`flex flex-col flex-1 overflow-y-auto overflow-x-hidden py-6 ${isSidebarCollapsed ? "px-3" : "px-4 lg:px-6"}`}>

        {/* ── Header ── */}
        <div className={`flex ${isSidebarCollapsed ? "flex-col items-center gap-4" : "items-center justify-between"} mb-8 shrink-0`}>
          <div
            onClick={() => { if (isSidebarCollapsed) setIsSidebarCollapsed(false); }}
            className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"} ${isSidebarCollapsed ? "cursor-pointer" : "cursor-default"}`}
            title={isSidebarCollapsed ? "Seitenleiste öffnen" : undefined}
          >
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black shadow-sm shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            {!isSidebarCollapsed && (
              <div>
                <h1 className="text-base font-bold text-slate-100 tracking-tight leading-none">SyncSheet</h1>
                <span className="text-[10px] text-slate-400 font-mono leading-none">Bewerbungs-Tracker</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex items-center justify-center h-6 w-6 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
          >
            {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="space-y-1 text-sm font-medium flex-1">

          {/* Startseite */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg transition ${
                isActive
                  ? "bg-blue-500/10 border border-blue-500/15 text-blue-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
              }`
            }
            title={isSidebarCollapsed ? "Startseite" : undefined}
          >
            <Home className="h-4 w-4 shrink-0" />
            {!isSidebarCollapsed && <span>Startseite</span>}
          </NavLink>

          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg transition ${
                isActive
                  ? "bg-blue-500/10 border border-blue-500/15 text-blue-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
              }`
            }
            title={isSidebarCollapsed ? "Dashboard" : undefined}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!isSidebarCollapsed && <span>Dashboard</span>}
          </NavLink>

          {/* ── Bewerbungs-Tracker section ── */}
          <div className="space-y-0.5">
            {/* Row: NavLink text + collapse arrow */}
            <div className={isSidebarCollapsed ? "" : "flex items-center gap-1"}>
              <NavLink
                to="/tracker"
                className={({ isActive }) =>
                  `${isSidebarCollapsed ? "w-full" : "flex-1"} flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg transition ${
                    isActive
                      ? "bg-blue-500/10 border border-blue-500/15 text-blue-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                  }`
                }
                title={isSidebarCollapsed ? "Bewerbungs-Tracker" : undefined}
              >
                <Table className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="flex-1">Bewerbungs-Tracker</span>
                )}
              </NavLink>

              {/* Toggle chevron — only in expanded mode */}
              {!isSidebarCollapsed && totalTabs > 0 && (
                <button
                  type="button"
                  onClick={() => setTrackerOpen((v) => !v)}
                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition cursor-pointer shrink-0 mr-1"
                  title={trackerOpen ? "Tabs ausblenden" : "Tabs einblenden"}
                >
                  {trackerOpen
                    ? <ChevronUp className="h-3.5 w-3.5" />
                    : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>

            {/* Sub-tabs list — shown when expanded & trackerOpen */}
            {!isSidebarCollapsed && trackerOpen && (
              <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-white/5 ml-5 mt-0.5 select-none">

                {/* DB tables — hide the default job_applications table */}
                {availableTables.filter((tbl) => tbl !== "job_applications").map((tbl) => {
                  const isActive = selectedTable === tbl;
                  const isDefault = tbl === "job_applications";
                  return (
                    <button
                      key={tbl}
                      onClick={() => { setSelectedTable(tbl); navigate("/tracker"); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-2 border-none cursor-pointer ${
                        isActive
                          ? "text-blue-400 bg-transparent"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isActive ? "bg-blue-400" : isDefault ? "bg-emerald-600" : "bg-slate-600"}`} />
                      <span className="truncate">{formatTableName(tbl)}</span>
                    </button>
                  );
                })}

                {/* Pending tabs (not yet in DB) */}
                {pendingTabs.map((pt) => {
                  const isActive = selectedTable === pt.key;
                  return (
                    <button
                      key={pt.key}
                      onClick={() => { setSelectedTable(pt.key); navigate("/tracker"); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-2 border-none cursor-pointer ${
                        isActive
                          ? "text-amber-400 bg-transparent"
                          : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/30"
                      }`}
                      title="Noch nicht gespeichert – füge Einträge hinzu"
                    >
                      <Clock className={`h-3 w-3 shrink-0 ${isActive ? "text-amber-400" : "text-slate-600"}`} />
                      <span className="truncate italic">{pt.label}</span>
                    </button>
                  );
                })}

                {/* "+" new tab button */}
                <button
                  onClick={handleNewTab}
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-2 border-none cursor-pointer text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 mt-0.5"
                  title="Neue Liste erstellen"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>Neue Liste</span>
                </button>
              </div>
            )}

          </div>

          {/* ── Job-Suche Collapsible section ── */}
          <div className="space-y-0.5">
            {/* Row: NavLink + Collapse Chevron */}
            <div className={isSidebarCollapsed ? "" : "flex items-center gap-1"}>
              <NavLink
                to="/search"
                className={({ isActive }) =>
                  `${isSidebarCollapsed ? "w-full" : "flex-1"} flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg transition ${
                    isActive
                      ? "bg-blue-500/10 border border-blue-500/15 text-blue-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                  }`
                }
                title={isSidebarCollapsed ? "Job-Suche" : undefined}
              >
                <Search className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed && <span className="flex-1">Job-Suche</span>}
              </NavLink>

              {!isSidebarCollapsed && savedTabs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchTabsOpen((v) => !v)}
                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition cursor-pointer shrink-0 mr-1"
                  title={searchTabsOpen ? "Suchen ausblenden" : "Suchen einblenden"}
                >
                  {searchTabsOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* Sub-tabs list — shown when expanded & searchTabsOpen */}
            {!isSidebarCollapsed && searchTabsOpen && savedTabs.length > 0 && (
              <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-white/5 ml-5 mt-0.5 select-none">
                {savedTabs.map((tab) => {
                  const isActive = activeSearchId === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveSearchId(tab.id);
                        navigate("/search");
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-2 border-none bg-transparent cursor-pointer truncate ${
                        isActive
                          ? "text-blue-400 bg-transparent"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          isActive ? "bg-blue-400" : "bg-slate-600"
                        }`}
                      />
                      <span className="truncate">{tab.tab_name}</span>
                    </button>
                  );
                })}

                {/* "+" new search button */}
                <button
                  onClick={() => {
                    createNewTab();
                    navigate("/search");
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-2 border-none cursor-pointer text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 mt-0.5"
                  title="Neue Suche erstellen"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>Neue Suche</span>
                </button>
              </div>
            )}

          </div>

          {/* CV-Maker */}
          <NavLink
            to="/cv-maker"
            className={({ isActive }) =>
              `flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg transition ${
                isActive
                  ? "bg-blue-500/10 border border-blue-500/15 text-blue-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
              }`
            }
            title={isSidebarCollapsed ? "CV-Maker" : undefined}
          >
            <FileText className="h-4 w-4 shrink-0" />
            {!isSidebarCollapsed && <span>CV-Maker</span>}
          </NavLink>


        </nav>

        {/* ── Settings / bottom section ── */}
        <div className="shrink-0 mt-auto pt-4 border-t border-white/5">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg transition ${
                isActive
                  ? "bg-blue-500/10 border border-blue-500/15 text-blue-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
              }`
            }
            title={isSidebarCollapsed ? "Einstellungen" : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!isSidebarCollapsed && <span>Einstellungen</span>}
          </NavLink>
        </div>

      </div>
    </aside>
  );
};
