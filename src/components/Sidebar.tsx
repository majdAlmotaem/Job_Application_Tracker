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
} from "lucide-react";
import { SavedSearch } from "../hooks/useSavedSearches";

interface PendingTab {
  key: string;
  label: string;
}

interface SidebarProps {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean) => void;
  token: string | null;
  user: User | null;
  isLoggingIn: boolean;
  onLogin: () => void;
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
  token,
  user,
  isLoggingIn,
  onLogin,
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
  const [trackerOpen, setTrackerOpen] = useState(true);
  const [searchTabsOpen, setSearchTabsOpen] = useState(true);

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
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 lg:px-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div
            onClick={() => { if (isSidebarCollapsed) setIsSidebarCollapsed(false); }}
            className={`flex items-center gap-2.5 ${isSidebarCollapsed ? "cursor-pointer" : "cursor-default"}`}
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

          {/* Übersicht */}
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
            title={isSidebarCollapsed ? "Übersicht" : undefined}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!isSidebarCollapsed && <span>Übersicht</span>}
          </NavLink>

          {/* ── Bewerbungs-Tracker section ── */}
          <div className="space-y-0.5">
            {/* Row: NavLink text + collapse arrow */}
            <div className="flex items-center gap-1">
              <NavLink
                to="/tracker"
                className={({ isActive }) =>
                  `flex-1 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg transition ${
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

            {/* Collapsed: show "+" icon for quick new tab */}
            {isSidebarCollapsed && (
              <button
                onClick={handleNewTab}
                className="w-full flex justify-center py-1.5 text-slate-500 hover:text-blue-400 transition cursor-pointer"
                title="Neue Liste"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* ── Job-Suche Collapsible section ── */}
          <div className="space-y-0.5">
            {/* Row: NavLink + Collapse Chevron */}
            <div className="flex items-center gap-1">
              <NavLink
                to="/search"
                className={({ isActive }) =>
                  `flex-1 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg transition ${
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

            {/* Collapsed: show "+" icon for quick new search tab */}
            {isSidebarCollapsed && (
              <button
                onClick={() => {
                  createNewTab();
                  navigate("/search");
                }}
                className="w-full flex justify-center py-1.5 text-slate-500 hover:text-blue-400 transition cursor-pointer"
                title="Neue Suche"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Profil */}
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg transition ${
                isActive
                  ? "bg-blue-500/10 border border-blue-500/15 text-blue-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
              }`
            }
            title={isSidebarCollapsed ? "Profil bearbeiten" : undefined}
          >
            <UserIcon className="h-4 w-4 shrink-0" />
            {!isSidebarCollapsed && <span>Profil bearbeiten</span>}
          </NavLink>
        </nav>

        {/* ── Google Account / bottom section ── */}
        <div className="shrink-0 mt-6">
          {isSidebarCollapsed ? (
            <div className="pt-5 border-t border-white/5 flex flex-col items-center gap-4">
              <div
                onClick={() => setIsSidebarCollapsed(false)}
                className="cursor-pointer"
                title={token ? "Verbunden mit Google" : "Google verbinden"}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${
                  token
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                }`}>
                  <Mail className="h-4 w-4" />
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-5 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Google-Konto</span>
                {token ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Verbunden
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400">Nicht verbunden</span>
                )}
              </div>

              {token ? (
                <div className="bg-slate-950/40 backdrop-blur-md rounded-xl p-3.5 border border-white/5">
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 truncate">
                    <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{user?.email || "Gmail"}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-slate-950/45 backdrop-blur-md rounded-xl p-3.5 border border-white/5">
                  <div className="text-[11px] text-slate-300 leading-relaxed">
                    Verbinden Sie Ihr Google-Konto, um Bewerbungen aus Gmail zu scannen.
                  </div>
                  <button
                    onClick={onLogin}
                    disabled={isLoggingIn}
                    className="w-full justify-center flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg text-xs shadow-sm transition cursor-pointer"
                  >
                    {isLoggingIn ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Konto verknüpfen"}
                  </button>
                </div>
              )}

              {user && (
                <div className="pt-4 border-t border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Benutzer</div>
                  <div className="font-bold text-sm text-slate-100 mt-1 truncate">{user?.displayName || "User"}</div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">{user?.email}</div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </aside>
  );
};
