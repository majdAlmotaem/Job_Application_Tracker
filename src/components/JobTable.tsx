import React from "react";
import { Table, RefreshCw, Trash2 } from "lucide-react";
import { JobApplication } from "../types";
import { formatDisplayDate, formatInputDate } from "../utils/dateFormatter";

interface JobTableProps {
  applications: JobApplication[];
  filteredAndSortedApplications: JobApplication[];
  isFetchingApps: boolean;
  columnWidths: Record<string, number>;
  startResize: (e: React.MouseEvent, col: string) => void;
  selectedRowIds: Set<string>;
  handleToggleSelectAll: (apps: JobApplication[]) => void;
  handleToggleRowSelect: (id: string) => void;
  editingCell: { id: string; field: string } | null;
  editingValue: string;
  startEditing: (id: string, field: string, initialValue?: string) => void;
  cancelEditing: () => void;
  saveEditing: (id: string, field: string) => void;
  setEditingValue: (val: string) => void;
  draftChanges: Record<string, Partial<JobApplication>>;
  handleUpdateStatusDraft: (id: string, status: JobApplication["status"]) => void;
  isSavingDrafts: boolean;
  getStatusColorClass: (status: JobApplication["status"]) => string;
}

export const JobTable: React.FC<JobTableProps> = ({
  applications,
  filteredAndSortedApplications,
  isFetchingApps,
  columnWidths,
  startResize,
  selectedRowIds,
  handleToggleSelectAll,
  handleToggleRowSelect,
  editingCell,
  editingValue,
  startEditing,
  cancelEditing,
  saveEditing,
  setEditingValue,
  draftChanges,
  handleUpdateStatusDraft,
  isSavingDrafts,
  getStatusColorClass
}) => {
  if (isFetchingApps) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="h-7 w-7 text-[#2563EB] dark:text-blue-500 animate-spin mx-auto mb-2" />
        <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
          Bewerbungsdaten werden geladen...
        </p>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 bg-[#F8FAFC]/50 dark:bg-slate-900/10 border border-dashed border-[#E2E8F0] dark:border-slate-800 rounded-xl">
        <Table className="h-9 w-9 text-slate-300 dark:text-slate-600 mx-auto mb-2.5 animate-pulse" />
        <p className="text-xs font-semibold text-[#1E293B] dark:text-slate-200">
          Keine Bewerbungen vorhanden
        </p>
        <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-normal max-w-md mx-auto mt-0.5">
          Fügen Sie manuell einen Eintrag hinzu, laden Sie eine CSV-Datei hoch oder synchronisieren Sie Ihren Gmail-Posteingang.
        </p>
      </div>
    );
  }

  if (filteredAndSortedApplications.length === 0) {
    return (
      <div className="text-center py-12 bg-[#F8FAFC]/50 dark:bg-slate-900/10 border border-dashed border-[#E2E8F0] dark:border-slate-800 rounded-xl">
        <Table className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2.5" />
        <p className="text-xs font-semibold text-[#1E293B] dark:text-slate-200">
          Keine Einträge für diese Filter
        </p>
        <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-normal max-w-sm mx-auto mt-0.5">
          Geben Sie einen anderen Suchbegriff ein oder ändern Sie den Statusfilter.
        </p>
      </div>
    );
  }

  const allSelected =
    filteredAndSortedApplications.length > 0 &&
    filteredAndSortedApplications.every((app) => selectedRowIds.has(app.id));

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-slate-800">
      <table className="w-full text-left border-collapse text-xs table-fixed">
        <thead>
          <tr className="professional-table-header border-b border-[#E2E8F0] dark:border-slate-800/80">
            <th
              style={{ width: columnWidths.select }}
              className="p-3 text-center bg-slate-50/20 dark:bg-slate-900/10"
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => handleToggleSelectAll(filteredAndSortedApplications)}
                className="rounded border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-slate-900 cursor-pointer h-4.5 w-4.5 transition-all focus:outline-none"
              />
            </th>
            <th
              style={{ width: columnWidths.company, position: "relative" }}
              className="p-3 select-none"
            >
              <span className="truncate block pr-2">Unternehmen</span>
              <div
                onMouseDown={(e) => startResize(e, "company")}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-10"
                style={{ touchAction: "none" }}
              />
            </th>
            <th
              style={{ width: columnWidths.role, position: "relative" }}
              className="p-3 select-none"
            >
              <span className="truncate block pr-2">Stelle / Rolle</span>
              <div
                onMouseDown={(e) => startResize(e, "role")}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-10"
                style={{ touchAction: "none" }}
              />
            </th>
            <th
              style={{ width: columnWidths.status, position: "relative" }}
              className="p-3 select-none"
            >
              <span className="truncate block pr-2">Status</span>
              <div
                onMouseDown={(e) => startResize(e, "status")}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-10"
                style={{ touchAction: "none" }}
              />
            </th>
            <th
              style={{ width: columnWidths.date, position: "relative" }}
              className="p-3 select-none"
            >
              <span className="truncate block pr-2">Bewerbungsdatum</span>
              <div
                onMouseDown={(e) => startResize(e, "date")}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-10"
                style={{ touchAction: "none" }}
              />
            </th>
            <th
              style={{ width: columnWidths.location, position: "relative" }}
              className="p-3 select-none"
            >
              <span className="truncate block pr-2">Standort</span>
              <div
                onMouseDown={(e) => startResize(e, "location")}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-10"
                style={{ touchAction: "none" }}
              />
            </th>
            <th
              style={{ width: columnWidths.anstellungsart, position: "relative" }}
              className="p-3 select-none"
            >
              <span className="truncate block pr-2">Anstellungsart</span>
              <div
                onMouseDown={(e) => startResize(e, "anstellungsart")}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-10"
                style={{ touchAction: "none" }}
              />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60">
          {filteredAndSortedApplications.map((app) => {
            const isSelected = selectedRowIds.has(app.id);
            const hasDraft = !!draftChanges[app.id];
            return (
              <tr
                key={app.id}
                className={`${
                  isSelected ? "bg-blue-500/5 dark:bg-blue-600/5" : "bg-white dark:bg-[#111827]"
                } transition-colors`}
              >
                {/* Checkbox select */}
                <td
                  style={{ width: columnWidths.select }}
                  className="p-3.5 text-center border-r border-[#E2E8F0] dark:border-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleRowSelect(app.id)}
                    className="rounded border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-slate-900 cursor-pointer h-4.5 w-4.5 transition-all focus:outline-none"
                  />
                </td>

                {/* Company Name */}
                <td
                  style={{ width: columnWidths.company }}
                  className="p-3.5 font-bold text-[#1E293B] dark:text-slate-100 cursor-default truncate overflow-hidden whitespace-nowrap relative"
                  onDoubleClick={() =>
                    startEditing(
                      app.id,
                      "company",
                      draftChanges[app.id]?.company ?? app.company
                    )
                  }
                >
                  {editingCell?.id === app.id && editingCell.field === "company" ? (
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => saveEditing(app.id, "company")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing(app.id, "company");
                        if (e.key === "Escape") cancelEditing();
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md text-xs"
                    />
                  ) : (
                    <>
                      {draftChanges[app.id]?.company ?? app.company}
                      {hasDraft && (
                        <span
                          className="absolute right-1.5 top-1.5 w-1.5 h-1.5 rounded-full bg-amber-500"
                          title="Ungespeicherte Änderungen"
                        />
                      )}
                    </>
                  )}
                </td>

                {/* Role / Job Title */}
                <td
                  style={{ width: columnWidths.role }}
                  className="p-3.5 font-medium text-[#64748B] dark:text-slate-100 cursor-default truncate overflow-hidden whitespace-nowrap"
                  onDoubleClick={() =>
                    startEditing(app.id, "role", draftChanges[app.id]?.role ?? app.role)
                  }
                >
                  {editingCell?.id === app.id && editingCell.field === "role" ? (
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => saveEditing(app.id, "role")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing(app.id, "role");
                        if (e.key === "Escape") cancelEditing();
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md text-xs"
                    />
                  ) : (
                    draftChanges[app.id]?.role ?? app.role
                  )}
                </td>

                {/* Status Dropdown */}
                <td style={{ width: columnWidths.status }} className="p-3.5 overflow-visible">
                  {isSavingDrafts && draftChanges[app.id] ? (
                    <div className="flex items-center gap-1 font-semibold text-slate-400 py-1">
                      <RefreshCw className="h-3 w-3 animate-spin text-slate-400" /> Speichere...
                    </div>
                  ) : (
                    <div className="relative inline-block w-full text-[#1E293B] dark:text-white">
                      <select
                        id={`status-select-${app.id}`}
                        value={draftChanges[app.id]?.status ?? app.status ?? "Applied"}
                        onChange={(e) =>
                          handleUpdateStatusDraft(
                            app.id,
                            e.target.value as JobApplication["status"]
                          )
                        }
                        className={`w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md text-xs font-bold focus:outline-none cursor-pointer text-slate-800 dark:text-white ${getStatusColorClass(
                          draftChanges[app.id]?.status ?? app.status
                        )}`}
                      >
                        <option value="Applied" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-semibold">Applied</option>
                        <option value="Interview" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-semibold">Interview</option>
                        <option value="Offer" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-semibold">Offer</option>
                        <option value="Rejected" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-semibold">Rejected</option>
                        <option value="Received" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-semibold">Received</option>
                        <option value="Unknown" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-semibold">Unknown</option>
                      </select>
                    </div>
                  )}
                </td>

                {/* Date */}
                <td
                  style={{ width: columnWidths.date }}
                  className="p-3.5 text-[#64748B] dark:text-slate-100 font-medium cursor-default truncate overflow-hidden whitespace-nowrap"
                  onDoubleClick={() =>
                    startEditing(app.id, "date", formatInputDate(draftChanges[app.id]?.date ?? app.date ?? ""))
                  }
                >
                  {editingCell?.id === app.id && editingCell.field === "date" ? (
                    <input
                      type="date"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => saveEditing(app.id, "date")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing(app.id, "date");
                        if (e.key === "Escape") cancelEditing();
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md text-xs"
                    />
                  ) : (
                    formatDisplayDate(draftChanges[app.id]?.date ?? app.date)
                  )}
                </td>

                {/* Location */}
                <td
                  style={{ width: columnWidths.location }}
                  className="p-3.5 text-[#64748B] dark:text-slate-100 font-medium cursor-default truncate overflow-hidden whitespace-nowrap"
                  onDoubleClick={() =>
                    startEditing(
                      app.id,
                      "location",
                      draftChanges[app.id]?.location ?? app.location ?? ""
                    )
                  }
                >
                  {editingCell?.id === app.id && editingCell.field === "location" ? (
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => saveEditing(app.id, "location")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing(app.id, "location");
                        if (e.key === "Escape") cancelEditing();
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md text-xs"
                    />
                  ) : (
                    draftChanges[app.id]?.location ?? app.location ?? "N/A"
                  )}
                </td>

                {/* Employment Type */}
                <td
                  style={{ width: columnWidths.anstellungsart }}
                  className="p-3.5 text-[#64748B] dark:text-slate-100 font-medium cursor-default truncate overflow-hidden whitespace-nowrap"
                  onDoubleClick={() =>
                    startEditing(
                      app.id,
                      "anstellungsart",
                      draftChanges[app.id]?.anstellungsart ?? app.anstellungsart ?? ""
                    )
                  }
                >
                  {editingCell?.id === app.id && editingCell.field === "anstellungsart" ? (
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => saveEditing(app.id, "anstellungsart")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing(app.id, "anstellungsart");
                        if (e.key === "Escape") cancelEditing();
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md text-xs"
                    />
                  ) : (
                    draftChanges[app.id]?.anstellungsart ?? app.anstellungsart ?? "N/A"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
