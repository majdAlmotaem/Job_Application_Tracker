import React, { useState, useRef } from "react";
import { User } from "firebase/auth";
import { Mail, RefreshCw, Cpu, LogOut, Check, Sparkles, Settings, ShieldCheck, Database, Download, Upload, AlertTriangle } from "lucide-react";

import { useGlobalTask } from "../context/GlobalTaskContext";

type TabType = "connections" | "privacy" | "backup" | "system";

export const SettingsPage: React.FC = () => {
  const {
    user,
    token,
    isLoggingIn,
    handleLogin: onLogin,
    handleLogout: onLogout,
    triggerToast,
  } = useGlobalTask();
  const [activeTab, setActiveTab] = useState<TabType>("connections");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    // Open a direct link to download the DB file
    window.open("/api/database/export", "_blank");
    triggerToast("success", "Datenbank-Export gestartet.");
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current || !fileInputRef.current.files || fileInputRef.current.files.length === 0) {
      triggerToast("error", "Bitte wählen Sie zuerst eine .db Datei aus.");
      return;
    }

    const file = fileInputRef.current.files[0];
    if (!file.name.endsWith(".db")) {
      triggerToast("error", "Ungültiger Dateityp. Bitte wählen Sie eine SQLite-Datenbankdatei (.db) aus.");
      return;
    }

    // Confirm action with standard alert
    const confirmOverwrite = window.confirm(
      "Sind Sie sicher, dass Sie diese Datenbank importieren möchten? Alle aktuellen Daten werden unwiderruflich überschrieben!"
    );
    if (!confirmOverwrite) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/database/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Fehler beim Importieren der Datenbank.");
      }

      triggerToast("success", "Datenbank erfolgreich importiert. Bitte laden Sie die Seite neu.");
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("error", err.message || "Verbindung zum Server fehlgeschlagen.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto">
      {/* Page Header */}
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 bg-blue-600/10 border border-blue-600/15 rounded-xl flex items-center justify-center text-blue-400">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Einstellungen</h1>
          <p className="text-slate-400 text-xs mt-0.5">Verwalten Sie Ihre Verbindungen, Datenschutz und Daten-Backups.</p>
        </div>
      </header>

      {/* Horizontal Tabs Selection */}
      <div className="flex border-b border-white/5 pb-2 gap-3">
        <button
          onClick={() => setActiveTab("connections")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
            activeTab === "connections"
              ? "bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Verbindungen</span>
        </button>
        <button
          onClick={() => setActiveTab("privacy")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
            activeTab === "privacy"
              ? "bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Datenschutz</span>
        </button>
        <button
          onClick={() => setActiveTab("backup")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
            activeTab === "backup"
              ? "bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>Daten-Backup</span>
        </button>
        <button
          onClick={() => setActiveTab("system")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
            activeTab === "system"
              ? "bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>System-Info</span>
        </button>
      </div>


      {/* Tab Content Rendering */}
      <div className="min-h-[40vh]">
        {activeTab === "connections" && (
          <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between max-w-2xl animate-fadeIn">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 bg-blue-500/10 border border-blue-500/15 rounded-lg flex items-center justify-center text-blue-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Google-Konto verknüpfen</h3>
                    <p className="text-slate-400 text-[10px]">Gmail-Synchronisierung für Bewerbungen</p>
                  </div>
                </div>
                <div>
                  {token ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/15">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Verbunden
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/15">
                      Nicht verbunden
                    </span>
                  )}
                </div>
              </div>

              {token ? (
                <div className="space-y-3.5">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Ihr Google-Konto ist erfolgreich verknüpft. Neue Bewerbungs-E-Mails können direkt aus Ihrem Gmail-Postfach gescannt und per KI analysiert werden.
                  </p>
                  <div className="bg-slate-950/45 border border-white/5 rounded-xl p-3.5 space-y-2">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Verknüpftes Konto</div>
                    <div className="font-bold text-xs text-slate-200 truncate">{user?.displayName || "Google-Nutzer"}</div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">{user?.email}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Verbinden Sie Ihr Google-Konto, um automatisiert Bewerbungs-E-Mails (Bestätigungen, Einladungen, Absagen) einzulesen und via Gemini auszuwerten.
                  </p>
                  <div className="bg-slate-950/20 border border-dashed border-white/5 rounded-xl p-3.5 text-center text-[11px] text-slate-500 italic">
                    Es werden ausschließlich E-Mails im Lesemodus abgerufen. Keine Schreibrechte auf Ihrem Postfach.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 border-t border-white/5 flex gap-3">
              {token ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 hover:text-rose-400 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer border-none shadow-sm"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Verbindung trennen</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLogin}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer border-none shadow-sm shadow-blue-900/10"
                >
                  {isLoggingIn ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Mail className="h-3.5 w-3.5" />
                      <span>Konto verknüpfen</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </section>
        )}

        {activeTab === "privacy" && (
          <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-6 max-w-3xl animate-fadeIn">
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-sm font-bold text-slate-100">Datenschutzerklärung & Datenverarbeitung</h3>
              <p className="text-slate-400 text-[10px]">Informationen zur Sicherheit Ihrer persönlichen Daten</p>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200">1. Lokale Speicherung (SQLite)</h4>
                <p>
                  Sämtliche Daten, wie Ihre eingetragenen Bewerbungen, gespeicherten Suchen und Notizen, werden ausschließlich in einer lokalen SQLite-Datenbankdatei auf Ihrem eigenen Server/Computer (`backend/job_tracker.db`) gespeichert. Es gibt keinen Cloud-Server des App-Entwicklers, auf dem Ihre Profildaten gesammelt oder analysiert werden.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-200">2. Google Gmail-API Integration</h4>
                <p>
                  Wenn Sie Ihr Google-Konto verknüpfen, ruft die App den Autorisierungs-Token ab. Dieser Zugriffstoken wird flüchtig im Arbeitsspeicher gehalten und niemals dauerhaft in einer Remote-Datenbank gespeichert. Die App greift ausschließlich im **Lesemodus (Read-Only)** auf Ihr Postfach zu, um relevante E-Mails zu filtern. Es werden keine E-Mails gelöscht, versendet oder verändert.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-200">3. Gemini KI-Analysen</h4>
                <p>
                  Zur Klassifizierung und Datenextraktion der E-Mails wird die offizielle Google Gemini API verwendet. Es werden nur die gefilterten Textkörper Ihrer Bewerbungs-E-Mails an die API gesendet. Gemäß den Geschäftsbedingungen für Entwickler-APIs werden übermittelte API-Daten nicht zum Training der allgemeinen Google-KI-Modelle verwendet.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-200">4. Keine Telemetrie & Tracker</h4>
                <p>
                  SyncSheet enthält keine kommerziellen Analyse-Tools, Werbe-Tracker oder Telemetrie-Schnittstellen von Drittanbietern. Ihre Daten gehören zu 100 % Ihnen.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "backup" && (
          <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-6 max-w-2xl animate-fadeIn">
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-sm font-bold text-slate-100">Daten-Backup (Export & Import)</h3>
              <p className="text-slate-400 text-[10px]">Sichern Sie Ihre Daten lokal oder stellen Sie sie aus einem Backup wieder her</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Export Panel */}
              <div className="bg-slate-950/40 border border-white/5 rounded-xl p-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Download className="h-4.5 w-4.5" />
                    <h4 className="text-xs font-bold text-slate-200">Datenbank exportieren</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Lädt die komplette SQLite-Datenbank (`job_tracker.db`) mit all Ihren Bewerbungen, Tabellen und Einstellungen auf Ihr Gerät herunter.
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-1.5 bg-blue-650 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer border-none shadow-sm mt-6"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Jetzt exportieren</span>
                </button>
              </div>

              {/* Import Panel */}
              <form onSubmit={handleImport} className="bg-slate-950/40 border border-white/5 rounded-xl p-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Upload className="h-4.5 w-4.5" />
                    <h4 className="text-xs font-bold text-slate-200">Backup einspielen</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Wählen Sie eine zuvor exportierte `.db`-Datei aus, um den aktuellen Datenbestand zu überschreiben.
                  </p>

                  <div className="pt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".db"
                      className="text-[10px] text-slate-400 file:bg-slate-800 file:border-none file:text-slate-200 file:px-2.5 file:py-1 file:rounded-md file:text-[10px] file:font-semibold file:cursor-pointer hover:file:bg-slate-700 cursor-pointer w-full"
                    />
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/15 rounded-lg p-2.5 flex items-start gap-2 text-[10px] text-amber-400 leading-relaxed">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>Achtung:</strong> Der Import überschreibt alle Ihre aktuellen Daten!
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isImporting}
                  className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer border-none shadow-sm mt-6"
                >
                  {isImporting ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      <span>Backup importieren</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>
        )}

        {activeTab === "system" && (
          <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-6 max-w-2xl animate-fadeIn">
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-sm font-bold text-slate-100">System-Informationen</h3>
              <p className="text-slate-400 text-[10px]">Technische App-Details und Versionen</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/30 border border-white/5 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">App-Version</span>
                <div className="font-bold text-slate-300">1.1.0</div>
              </div>
              <div className="bg-slate-950/30 border border-white/5 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Datenbank-Engine</span>
                <div className="font-bold text-slate-300">SQLite (Lokal)</div>
              </div>
              <div className="bg-slate-950/30 border border-white/5 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">KI-Modell</span>
                <div className="font-bold text-slate-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-indigo-400 shrink-0" />
                  <span>Gemini 3.5 Flash</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

