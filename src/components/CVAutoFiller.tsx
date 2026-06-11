import React, { useState, useRef } from "react";
import { FileUp, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface CVExtractionResult {
  job_title: string;
  location: string;
  employment_type: string;
  keywords: string[];
}

interface CVAutoFillerProps {
  onExtractionSuccess: (data: CVExtractionResult) => void;
  onExtractionError: (error: string) => void;
}

export const CVAutoFiller: React.FC<CVAutoFillerProps> = ({
  onExtractionSuccess,
  onExtractionError,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      onExtractionError("Nur PDF-Dateien werden unterstützt.");
      setStatus("error");
      return;
    }

    setFileName(file.name);
    setIsUploading(true);
    setStatus("loading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/jobs/extract-cv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Extraktion fehlgeschlagen");
      }

      const data: CVExtractionResult = await response.json();
      setStatus("success");
      onExtractionSuccess(data);
    } catch (err: any) {
      console.error("Error uploading CV:", err);
      setStatus("error");
      onExtractionError(err.message || "Fehler beim Analysieren des Lebenslaufs.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`relative overflow-hidden rounded-2xl border border-dashed p-8 text-center transition-all duration-300 cursor-pointer ${
          isDragActive
            ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/5"
            : status === "success"
            ? "border-emerald-500/40 bg-emerald-500/5"
            : status === "error"
            ? "border-rose-500/40 bg-rose-500/5"
            : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          {status === "loading" ? (
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : status === "success" ? (
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="h-6 w-6" />
            </div>
          ) : status === "error" ? (
            <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertCircle className="h-6 w-6" />
            </div>
          ) : (
            <div className="h-12 w-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition">
              <FileUp className="h-6 w-6" />
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-100">
              {status === "loading"
                ? "Lebenslauf wird analysiert..."
                : status === "success"
                ? "Lebenslauf erfolgreich eingelesen!"
                : status === "error"
                ? "Fehler bei der Analyse"
                : "Lebenslauf hochladen (PDF)"}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              {status === "loading"
                ? "Künstliche Intelligenz (Gemini) extrahiert die relevanten Suchkriterien. Bitte warten..."
                : fileName
                ? `Datei: ${fileName}`
                : "Ziehen Sie Ihre PDF-Datei hierher oder klicken Sie zum Auswählen."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
