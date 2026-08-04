import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw } from "lucide-react";
import { JobApplication, ApplicationStage, ApplicationStatus } from "../types";
import { getLocalDateString } from "../utils/matchingLogic";

export interface ManualAppInput {
  company: string;
  role: string;
  location: string;
  anstellungsart: string;
  stage: ApplicationStage;
  status: ApplicationStatus;
  date: string;
}

interface ManualAddFormProps {
  showAddForm: boolean;
  onClose: () => void;
  isSavingManual: boolean;
  onSubmit: (data: ManualAppInput) => Promise<boolean>;
}

export const ManualAddForm: React.FC<ManualAddFormProps> = ({
  showAddForm,
  onClose,
  isSavingManual,
  onSubmit,
}) => {
  const [manualCompany, setManualCompany] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualAnstellungsart, setManualAnstellungsart] = useState("Vollzeit");
  const [manualStage, setManualStage] = useState<ApplicationStage>("Applied");
  const [manualStatus, setManualStatus] = useState<ApplicationStatus>("Open");
  const [manualDate, setManualDate] = useState(getLocalDateString());

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCompany || !manualRole) return;

    const data: ManualAppInput = {
      company: manualCompany,
      role: manualRole,
      location: manualLocation,
      anstellungsart: manualAnstellungsart,
      stage: manualStage,
      status: manualStatus,
      date: manualDate,
    };

    const success = await onSubmit(data);
    if (success) {
      setManualCompany("");
      setManualRole("");
      setManualLocation("");
      setManualAnstellungsart("Vollzeit");
      setManualStage("Applied");
      setManualStatus("Open");
      setManualDate(getLocalDateString());
    }
  };

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
              onClick={onClose}
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
                value={manualRole}
                required
                onChange={(e) => setManualRole(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-100 block">Anstellungsart</label>
              <select
                value={manualAnstellungsart}
                onChange={(e) => setManualAnstellungsart(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-white font-semibold focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500 cursor-pointer"
              >
                <option value="Vollzeit" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Vollzeit</option>
                <option value="Teilzeit" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Teilzeit</option>
                <option value="Werkstudent" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Werkstudent</option>
                <option value="Praktikum" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Praktikum</option>
                <option value="Freelance" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Freelance</option>
                <option value="Ausbildung" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Ausbildung</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-100 block">Standort</label>
              <input
                type="text"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-100 block">Stufe</label>
              <select
                value={manualStage}
                onChange={(e) => setManualStage(e.target.value as ApplicationStage)}
                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-white font-semibold focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500 cursor-pointer"
              >
                <option value="Applied" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Applied</option>
                <option value="Interview" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Interview</option>
                <option value="Offer" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Offer</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-100 block">Status</label>
              <select
                value={manualStatus}
                onChange={(e) => setManualStatus(e.target.value as ApplicationStatus)}
                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-white font-semibold focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500 cursor-pointer"
              >
                <option value="Open" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Open</option>
                <option value="Rejected" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Rejected</option>
                <option value="Accepted" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Accepted</option>
                <option value="Withdrawn" className="bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white font-semibold">Withdrawn</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-100 block">Datum</label>
              <input
                type="text"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                placeholder="TT.MM.JJJJ"
                className="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-[#1E293B] dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-blue-500"
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
