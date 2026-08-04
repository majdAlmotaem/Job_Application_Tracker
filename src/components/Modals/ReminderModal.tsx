import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Calendar, FileText } from "lucide-react";
import { JobApplication } from "../../types";


interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: JobApplication[];
  reminderAppId: string;
  setReminderAppId: (val: string) => void;
  reminderDate: string;
  setReminderDate: (val: string) => void;
  reminderTime: string;
  setReminderTime: (val: string) => void;
  reminderNote: string;
  setReminderNote: (val: string) => void;
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
  reminderTime,
  setReminderTime,
  reminderNote,
  setReminderNote,
  onConfirm,
}) => {
  // Requirement 3: Only companies where stage === "Interview" AND status === "Open"
  const eligibleApps = applications.filter(
    (app) => app.stage === "Interview" && app.status === "Open"
  );

  const selectedApp = applications.find((app) => app.id === reminderAppId);
  const isEditing = !!(selectedApp?.interview_date);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full shadow-2xl p-6 text-left"
          >
            <h3 className="text-base font-bold text-slate-100 m-0 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500 shrink-0" />
              <span>Interview-Termin {isEditing ? "bearbeiten" : "hinzufügen"}</span>
            </h3>

            <div className="space-y-4">
              {/* Unternehmen Selection (Filter: stage === Interview && status === Open) */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Unternehmen (Nur Stufe: Interview & Status: Open)
                </label>
                {eligibleApps.length > 0 ? (
                  <select
                    value={reminderAppId}
                    onChange={(e) => setReminderAppId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
                  >
                    <option value="" disabled>-- Unternehmen auswählen --</option>
                    {eligibleApps.map((app) => (
                      <option key={app.id} value={app.id} className="bg-slate-950 text-white font-semibold">
                        {app.company} ({app.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-amber-400/90 bg-amber-950/20 border border-amber-900/40 p-3 rounded-lg">
                    Keine Bewerbungen mit Stufe "Interview" und Status "Open" vorhanden.
                  </div>
                )}
              </div>

              {/* Datum & Uhrzeit Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Datum */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>Datum (TT.MM.JJJJ)</span>
                  </label>
                  <input
                    type="text"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    placeholder="z. B. 15.08.2026"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>

                {/* Uhrzeit */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Uhrzeit</span>
                  </label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>
              </div>

              {/* Notiz */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-amber-400" />
                  <span>Notiz / Link / Vorbereitung</span>
                </label>
                <textarea
                  rows={3}
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  placeholder="z. B. Teams-Meeting Link, Ansprechpartner, Gehaltsvorstellung..."
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-medium resize-none"
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
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer text-slate-950 border-none"
              >
                {isEditing ? "Termin Aktualisieren" : "Termin Speichern"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
