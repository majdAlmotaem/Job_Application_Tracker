import React from "react";
import { FileSpreadsheet, Table } from "lucide-react";

interface CSVUploaderProps {
  onUpload: (file: File) => void;
  onDownload: () => void;
  hasData: boolean;
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({
  onUpload,
  onDownload,
  hasData
}) => {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-2.5">
      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
        Daten & Backup
      </span>
      
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative border-2 border-dashed border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 text-center cursor-pointer transition hover:bg-slate-800/10"
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <FileSpreadsheet className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
        <span className="text-xs font-semibold text-[#1E293B] dark:text-slate-200 block">
          CSV hochladen
        </span>
      </div>

      {hasData && (
        <button
          onClick={onDownload}
          className="w-full text-center py-2 text-[11px] font-semibold border border-white/5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-md transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Table className="h-4 w-4 text-emerald-500" />
          CSV herunterladen
        </button>
      )}
    </div>
  );
};
