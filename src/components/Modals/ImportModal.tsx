import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileSpreadsheet } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingFile: File | null;
  importFileName: string;
  setImportFileName: (val: string) => void;
  onConfirm: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  pendingFile,
  importFileName,
  setImportFileName,
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
              <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-base font-bold text-slate-100 m-0">
                  {pendingFile ? "CSV importieren" : "Neue Liste erstellen"}
                </h3>
                <p className="text-sm text-slate-400 m-0 leading-relaxed">
                  Geben Sie der neuen Liste einen Namen:
                </p>
                <div className="pt-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Listenname</label>
                  <input
                    type="text"
                    value={importFileName}
                    onChange={(e) => setImportFileName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                    placeholder="z.B. Bewerbungen 2025"
                    required
                  />
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
                onClick={onConfirm}
                disabled={!importFileName.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer text-white border-none"
              >
                {pendingFile ? "Importieren" : "Erstellen"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
