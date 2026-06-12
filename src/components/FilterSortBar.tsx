import React from "react";
import { Trash2, RefreshCw, CheckCircle, Search, Filter, Plus } from "lucide-react";
import { JobApplication } from "../types";

interface FilterSortBarProps {
  selectedRowIds: Set<string>;
  handleBulkDelete: () => void;
  draftChanges: Record<string, Partial<JobApplication>>;
  handleDiscardDraftChanges: () => void;
  isSavingDrafts: boolean;
  handleSaveDraftChanges: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  sortType: string;
  setSortType: (sortType: string) => void;
  showAddForm: boolean;
  setShowAddForm: React.Dispatch<React.SetStateAction<boolean>>;
  onRefresh: () => void;
  isFetchingApps: boolean;
  showHinweis: boolean;
}

export const FilterSortBar: React.FC<FilterSortBarProps> = ({
  selectedRowIds,
  handleBulkDelete,
  draftChanges,
  handleDiscardDraftChanges,
  isSavingDrafts,
  handleSaveDraftChanges,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  sortType,
  setSortType,
  showAddForm,
  setShowAddForm,
  onRefresh,
  isFetchingApps,
  showHinweis,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {selectedRowIds.size > 0 && (
          <button
            type="button"
            onClick={handleBulkDelete}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {selectedRowIds.size} Löschen
          </button>
        )}

        {Object.keys(draftChanges).length > 0 && (
          <div className="flex items-center gap-2 shrink-0 bg-slate-950/20 p-1 rounded-lg border border-white/5">
            <button
              type="button"
              onClick={handleDiscardDraftChanges}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-1.5 px-3 rounded-md text-xs flex items-center gap-1 transition cursor-pointer"
            >
              Verwerfen
            </button>
            <button
              type="button"
              disabled={isSavingDrafts}
              onClick={handleSaveDraftChanges}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-1.5 px-3 rounded-md text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              {isSavingDrafts ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              Speichern
            </button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Firma oder Stelle filtern..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg text-xs text-[#1E293B] dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500 w-[200px]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-[#64748B] dark:text-slate-250" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 py-1.5 px-3 rounded-lg text-xs text-white font-semibold cursor-pointer focus:outline-none focus:border-blue-500"
          >
            <option value="All" className="bg-slate-950 text-white font-semibold">Alle Status</option>
            <option value="Applied" className="bg-slate-950 text-white font-semibold">Applied</option>
            <option value="Interview" className="bg-slate-950 text-white font-semibold">Interview</option>
            <option value="Offer" className="bg-slate-950 text-white font-semibold">Offers</option>
            <option value="Rejected" className="bg-slate-950 text-white font-semibold">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#64748B] dark:text-slate-100 font-semibold">Sortieren:</span>
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value)}
            className="bg-slate-900 border border-slate-800 py-1.5 px-3 rounded-lg text-xs text-white font-semibold cursor-pointer focus:outline-none focus:border-blue-500"
          >
            <option value="date_desc" className="bg-slate-950 text-white font-semibold">Neueste zuerst</option>
            <option value="date_asc" className="bg-slate-950 text-white font-semibold">Älteste zuerst</option>
            <option value="company_asc" className="bg-slate-950 text-white font-semibold">Unternehmen (A-Z)</option>
            <option value="company_desc" className="bg-slate-950 text-white font-semibold">Unternehmen (Z-A)</option>
            <option value="status_asc" className="bg-slate-950 text-white font-semibold">Status</option>
          </select>
        </div>

        {showHinweis && (
          <div className="text-[11px] text-[#64748B] dark:text-slate-400 flex items-center gap-1.5 py-1 px-1 animate-fadeIn select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span>Hinweis: Doppelklick auf eine Zelle (Unternehmen, Stelle, Datum, Standort, Anstellungsart), um sie direkt zu bearbeiten.</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetchingApps}
          className="bg-slate-800 border border-white/10 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold p-1.5 rounded-lg text-xs transition flex items-center justify-center cursor-pointer shadow-sm h-8 w-8"
          title="Tabelle aktualisieren"
        >
          <RefreshCw className={`h-4 w-4 text-slate-400 ${isFetchingApps ? "animate-spin" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-slate-800 border border-white/10 hover:bg-slate-700 text-slate-200 font-semibold py-1.5 px-4 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 h-8"
        >
          <Plus className="h-3.5 w-3.5 text-slate-400" />
          Eintrag hinzufügen
        </button>
      </div>
    </div>
  );
};
