import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  renameValue: string;
  setRenameValue: (val: string) => void;
  onConfirm: () => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  onClose,
  renameValue,
  setRenameValue,
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
            <h3 className="text-base font-bold text-slate-100 m-0 mb-4">Liste umbenennen</h3>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Neuer Name</label>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onConfirm()}
              autoFocus
              className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
              placeholder="z.B. Bewerbungen 2025"
            />
            <div className="mt-5 flex justify-end gap-3">
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
                disabled={!renameValue.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer text-white border-none"
              >
                Umbenennen
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
