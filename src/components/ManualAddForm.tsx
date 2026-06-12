import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw } from "lucide-react";
import { JobApplication } from "../types";

interface ManualAddFormProps {
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  manualCompany: string;
  setManualCompany: (val: string) => void;
  manualRole: string;
  setManualRole: (val: string) => void;
  manualLocation: string;
  setManualLocation: (val: string) => void;
  manualAnstellungsart: string;
  setManualAnstellungsart: (val: string) => void;
  manualStatus: JobApplication["status"];
  setManualStatus: (val: JobApplication["status"]) => void;
  manualDate: string;
  setManualDate: (val: string) => void;
  isSavingManual: boolean;
  handleManualAddSubmit: (e: React.FormEvent) => void;
}

export const ManualAddForm: React.FC<ManualAddFormProps> = ({
  showAddForm,
  setShowAddForm,
  manualCompany,
  setManualCompany,
  manualRole,
  setManualRole,
  manualLocation,
  setManualLocation,
  manualAnstellungsart,
  setManualAnstellungsart,
  manualStatus,
  setManualStatus,
  manualDate,
  setManualDate,
  isSavingManual,
  handleManualAddSubmit,
}) => {
  return (
    <AnimatePresence>
      {showAddForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          onSubmit={handleManualAddSubmit}
          className="bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 mb-6 space-y-4 overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-[#64748B] dark:text-slate-100 tracking-wider m-0">Bewerbung manuell erfassen</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline bg-transparent border-none cursor-pointer"
            >
              Schließen
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-100 block">Unternehmen *</label>
              <input
                type="text"
                placeholder="z.B. FINOVESTA GmbH"
                value={manualCompany}
                required
                onChange={(e) => setManualCompany(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-100 block">Stelle / Rolle *</label>
              <input
                type="text"
                placeholder="z.B. Softwareentwickler"
                value={manualRole}
                required
                onChange={(e) => setManualRole(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-100 block">Anstellungsart</label>
              <input
                type="text"
                placeholder="z.B. Festanstellung / Vollzeit"
                value={manualAnstellungsart}
                onChange={(e) => setManualAnstellungsart(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-100 block">Standort</label>
              <input
                type="text"
                placeholder="z.B. Düsseldorf, Germany"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-100 block">Status</label>
              <select
                value={manualStatus}
                onChange={(e) => setManualStatus(e.target.value as JobApplication["status"])}
                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-white font-semibold focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500 cursor-pointer"
              >
                <option value="Applied" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Applied</option>
                <option value="Interview" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Interview</option>
                <option value="Offer" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Offer</option>
                <option value="Rejected" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Rejected</option>
                <option value="Received" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Received</option>
                <option value="Unknown" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Unknown</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-100 block">Datum</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-white font-semibold focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSavingManual}
              className="bg-[#2563EB] hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition border-none"
            >
              {isSavingManual ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "In Datenbank speichern"
              )}
            </button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
};
