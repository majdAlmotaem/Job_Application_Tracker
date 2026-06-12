import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock } from "lucide-react";
import { JobApplication } from "../../types";

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: JobApplication[];
  reminderAppId: string;
  setReminderAppId: (val: string) => void;
  reminderDate: string;
  setReminderDate: (val: string) => void;
  onConfirm: () => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  applications,
  reminderAppId,
  setReminderAppId,
  reminderDate,
  setReminderDate,
  onConfirm,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-slate-900 border border-white/5 rounded-xl max-w-sm w-full shadow-2xl p-6 text-left"
          >
            <h3 className="text-base font-bold text-slate-100 m-0 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500 shrink-0" />
              <span>Termin hinzufügen</span>
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-100 block mb-1">Unternehmen</label>
                <select
                  value={reminderAppId}
                  onChange={(e) => setReminderAppId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                >
                  {applications.filter((app) => app.status === "Interview").map((app) => (
                    <option key={app.id} value={app.id} className="bg-slate-950 text-white font-semibold">
                      {app.company} ({app.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-100 block mb-1">Datum</label>
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer border-none"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!reminderAppId || !reminderDate}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer text-white border-none"
              >
                Speichern
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
