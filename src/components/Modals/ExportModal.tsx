import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Table } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportFileSelected: string;
  setExportFileSelected: (val: string) => void;
  availableTables: string[];
  formatTableName: (name: string) => string;
  onConfirm: (table: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  exportFileSelected,
  setExportFileSelected,
  availableTables,
  formatTableName,
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
            className="bg-slate-900 border border-white/5 rounded-xl max-w-md w-full overflow-hidden shadow-2xl p-6 text-left"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Table className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-base font-bold text-slate-100 m-0">
                  CSV-Datei exportieren
                </h3>
                <p className="text-sm text-slate-100 m-0 leading-relaxed">
                  Wählen Sie aus, welche Tabelle Sie genau exportieren möchten:
                </p>
                <div className="pt-2">
                  <select
                    value={exportFileSelected}
                    onChange={(e) => setExportFileSelected(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-sm text-white font-semibold cursor-pointer focus:outline-none focus:border-blue-500"
                  >
                    {availableTables.map((tbl) => (
                      <option key={tbl} value={tbl} className="bg-slate-950 text-white font-semibold">
                        {formatTableName(tbl)}
                      </option>
                    ))}
                  </select>
                </div>
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
                onClick={() => onConfirm(exportFileSelected)}
                className="bg-emerald-600 hover:bg-emerald-700 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer text-white border-none flex items-center gap-1"
              >
                Exportieren
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
