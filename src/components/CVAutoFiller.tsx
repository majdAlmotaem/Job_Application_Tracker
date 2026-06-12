import React, { useState, useRef, useEffect } from "react";
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
  isCompact?: boolean;
}

export const CVAutoFiller: React.FC<CVAutoFillerProps> = ({
  onExtractionSuccess,
  onExtractionError,
  isCompact = false,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState("PDF-Text extrahieren...");

  useEffect(() => {
    let intervalId: any;
    if (status === "loading") {
      setProgress(0);
      setLoadingPhase("PDF-Text extrahieren...");
      
      const startTime = Date.now();
      intervalId = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 98) return prev;
          
          let increment = 1;
          if (prev < 30) {
            increment = 2 + Math.random() * 2; // Fast start
            setLoadingPhase("Lebenslauf-Text extrahieren...");
          } else if (prev < 60) {
            increment = 0.8 + Math.random() * 0.8; // Connecting to API
            setLoadingPhase("Verbindung mit Gemini API herstellen...");
          } else if (prev < 85) {
            increment = 0.3 + Math.random() * 0.3; // Structuring CV schema
            setLoadingPhase("Daten extrahieren und strukturieren...");
          } else {
            increment = 0.05 + Math.random() * 0.05; // Trickling
            setLoadingPhase("Ergebnisse finalisieren...");
          }
          
          return Math.min(98, prev + increment);
        });
      }, 300);
    } else if (status === "success") {
      setProgress(100);
    } else {
      setProgress(0);
    }
    
    return () => clearInterval(intervalId);
  }, [status]);

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout limit

    try {
      const response = await fetch("/api/jobs/extract-cv", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Extraktion fehlgeschlagen");
      }

      const data: CVExtractionResult = await response.json();
      setStatus("success");
      onExtractionSuccess(data);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Error uploading CV:", err);
      setStatus("error");
      if (err.name === "AbortError") {
        onExtractionError("Zeitüberschreitung bei der Analyse. Der Server antwortet nicht rechtzeitig (Limit: 90 Sek.).");
      } else {
        onExtractionError(err.message || "Fehler beim Analysieren des Lebenslaufs.");
      }
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

  if (isCompact) {
    return (
      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        <button
          type="button"
          onClick={onButtonClick}
          disabled={isUploading}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-300 ${
            status === "loading"
              ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
              : status === "success"
              ? "bg-emerald-950/40 border-emerald-900/40 text-emerald-400 hover:bg-emerald-900/20"
              : status === "error"
              ? "bg-rose-950/40 border-rose-900/40 text-rose-400 hover:bg-rose-900/20"
              : "bg-slate-900 border-slate-800 hover:border-blue-500/30 hover:bg-blue-950/5 text-slate-300"
          }`}
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          ) : status === "success" ? (
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          ) : status === "error" ? (
            <AlertCircle className="h-4 w-4 text-rose-400" />
          ) : (
            <FileUp className="h-4 w-4 text-slate-400" />
          )}
          <span>
            {status === "loading"
              ? "Wird geladen..."
              : status === "success"
              ? "Erfolgreich eingelesen"
              : status === "error"
              ? "Fehler bei der Analyse"
              : "Lebenslauf hochladen (PDF)"}
          </span>
        </button>
        {fileName && (
          <span className="text-xs text-slate-400 truncate max-w-xs" title={fileName}>
            {fileName}
          </span>
        )}
        {status === "loading" && (
          <div className="flex items-center gap-2 grow max-w-[180px]">
            <span className="text-[10px] text-slate-500 font-bold shrink-0">{Math.round(progress)}%</span>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

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

          {status === "loading" && (
            <div className="w-full max-w-xs mt-3 space-y-1.5 mx-auto">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                <span>{loadingPhase}</span>
                <span className="text-blue-400 font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
