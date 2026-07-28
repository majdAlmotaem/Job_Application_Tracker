import React from "react";
import {
  Mail,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Briefcase,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { EmailUpdate, JobApplication } from "../types";

interface EmailSyncResultsProps {
  isInboxScanned: boolean;
  emailUpdates: EmailUpdate[];
  isNeueExpanded: boolean;
  setIsNeueExpanded: (val: boolean) => void;
  isStatusExpanded: boolean;
  setIsStatusExpanded: (val: boolean) => void;
  expandedEmailIds: string[];
  toggleEmailExpansion: (emailId: string) => void;
  syncingEmailId: string | null;
  handleRefuseEmailUpdate: (emailId: string) => void;
  handleUndoRefuseEmailUpdate: (emailId: string) => void;
  handleAcceptEmailChange: (update: EmailUpdate) => void;
  handleAcceptAll: (updates: EmailUpdate[]) => void;
  handleRejectAll: (updates: EmailUpdate[]) => void;
  getCompanyMatch: (companyName: string) => JobApplication | null;
}

export const EmailSyncResults: React.FC<EmailSyncResultsProps> = ({
  isInboxScanned,
  emailUpdates,
  isNeueExpanded,
  setIsNeueExpanded,
  isStatusExpanded,
  setIsStatusExpanded,
  expandedEmailIds,
  toggleEmailExpansion,
  syncingEmailId,
  handleRefuseEmailUpdate,
  handleUndoRefuseEmailUpdate,
  handleAcceptEmailChange,
  handleAcceptAll,
  handleRejectAll,
  getCompanyMatch,
}) => {
  if (!isInboxScanned) return null;

  const renderEmailUpdateRow = (update: EmailUpdate, isStatuswechsel: boolean) => {
    const isExpanded = expandedEmailIds.includes(update.emailId);
    const dupMatch = getCompanyMatch(update.company);

    const getEmailStageBadge = (stageStr: string) => {
      switch (stageStr) {
        case "Applied": return "bg-blue-950/45 text-blue-400 border border-blue-900/40";
        case "Interview": return "bg-violet-950/45 text-violet-400 border border-violet-900/40";
        case "Offer": return "bg-emerald-950/45 text-emerald-400 border border-emerald-900/40";
        default: return "bg-slate-900 text-slate-400 border border-slate-850";
      }
    };

    const getEmailStatusBadge = (statusStr: string) => {
      switch (statusStr) {
        case "Open": return "bg-sky-950/45 text-sky-400 border border-sky-900/40";
        case "Rejected": return "bg-rose-950/45 text-rose-400 border border-rose-900/40";
        case "Accepted": return "bg-emerald-950/45 text-emerald-400 border border-emerald-900/40";
        case "Withdrawn": return "bg-amber-950/45 text-amber-400 border border-amber-900/40";
        default: return "bg-slate-900 text-slate-300 border border-slate-800";
      }
    };

    return (
      <div key={update.emailId} className="border border-white/5 rounded-xl overflow-hidden bg-slate-900/40">
        <div
          onClick={() => toggleEmailExpansion(update.emailId)}
          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 cursor-pointer hover:bg-slate-800/45 gap-3 transition select-none"
        >
          <div className="flex items-center gap-3 text-sm flex-wrap">
            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
            <span className="font-bold text-slate-100">{update.company}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">{update.role}</span>
            <span className="text-slate-500">•</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getEmailStageBadge(update.stage)}`}>
              {update.stage}
            </span>
            <span className="text-slate-500">•</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getEmailStatusBadge(update.status)}`}>
              {update.status}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">{update.date}</span>
          </div>
          <div className="flex gap-2 items-center shrink-0">
            <a
              href={`https://mail.google.com/mail/u/0/#inbox/${update.emailId}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-950/30 hover:bg-blue-950/50 border border-blue-900/40 px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer"
            >
              <ExternalLink className="h-3 w-3" />
              E-Mail öffnen
            </a>

            {!update.synced && !update.dismissed ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRefuseEmailUpdate(update.emailId); }}
                  className="text-[10px] font-bold text-rose-450 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 px-2 py-1 rounded-md transition cursor-pointer"
                >
                  Verwerfen
                </button>
                <button
                  disabled={syncingEmailId === update.emailId}
                  onClick={(e) => { e.stopPropagation(); handleAcceptEmailChange(update); }}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-355 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/30 px-2 py-1 rounded-md transition cursor-pointer"
                >
                  {syncingEmailId === update.emailId ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Übernehmen"}
                </button>
              </>
            ) : update.synced ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-1 rounded-md flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Übernommen
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleUndoRefuseEmailUpdate(update.emailId); }}
                title="Rückgängig machen"
                className="text-[10px] font-bold text-rose-450 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/30 border border-rose-900/30 px-2.5 py-1 rounded-md flex items-center gap-1 transition cursor-pointer"
              >
                <XCircle className="h-3 w-3" />
                Verworfen
              </button>
            )}
          </div>
        </div>
        {isExpanded && (
          <div className="p-4 border-t border-white/5 bg-slate-950/40 space-y-4">
            {dupMatch && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Bestehender Eintrag gefunden (Stufe: "{dupMatch.stage}", Status: "{dupMatch.status}"). Klick auf "Übernehmen" aktualisiert auf Stufe "{update.stage}", Status "{update.status}".
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-200">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold">Standort:</span>
                  <span className="text-slate-300">{update.location || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold">Anstellungsart:</span>
                  <span className="text-slate-300">{update.anstellungsart || "N/A"}</span>
                </div>
                <div className="text-slate-200">
                  <span className="font-semibold">Betreff:</span>{" "}
                  <span className="text-slate-300">{update.subject || "(Kein Betreff)"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-slate-200">
                  <span className="font-semibold">Zusammenfassung:</span>{" "}
                  <span className="text-slate-300 italic">"{update.summary || "Keine Zusammenfassung vorhanden"}"</span>
                </div>
                <div className="text-slate-200">
                  <span className="font-semibold">Empfohlene Aktion:</span>{" "}
                  <span className="text-blue-400 font-semibold">{update.suggestedAction || "N/A"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">E-Mail Text</span>
              <div className="bg-slate-950/70 border border-white/5 rounded-xl p-4 max-h-80 overflow-y-auto select-text cursor-text font-sans text-xs leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
                {update.body || update.snippet}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const neueBewerbungen = emailUpdates.filter((up) => up.classification !== "Statuswechsel");
  const countNeue = neueBewerbungen.length;

  const statusAenderungen = emailUpdates.filter((up) => up.classification === "Statuswechsel");
  const countStatus = statusAenderungen.length;

  return (
    <div className="space-y-4">
      <div className="pb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider m-0 flex items-center gap-2">
          <Mail className="h-4 w-4 text-blue-400" /> Erkannte Bewerbungs-Mails ({emailUpdates.length})
        </h3>
        <span className="text-xs text-slate-300 font-mono bg-slate-900 border border-white/5 px-2 py-0.5 rounded">
          Gefiltert in dieser Sitzung
        </span>
      </div>
      {emailUpdates.length > 0 ? (
        <div className="space-y-4">
          {/* Neue Bewerbungen */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-900/10">
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/40 px-4 py-3 border-b border-white/5 gap-2 select-none">
              <button
                type="button"
                onClick={() => setIsNeueExpanded(!isNeueExpanded)}
                className="flex items-center gap-2 text-xs font-bold text-slate-100 bg-transparent border-none outline-none cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Neue Bewerbung ({countNeue})</span>
                {isNeueExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {countNeue > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRejectAll(neueBewerbungen)}
                    className="text-[10px] text-slate-300 bg-slate-900 hover:bg-slate-800 border border-white/5 font-bold px-2.5 py-1 rounded-md transition duration-150 cursor-pointer"
                  >
                    Alle verwerfen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAcceptAll(neueBewerbungen)}
                    className="text-[10px] text-white bg-blue-600 hover:bg-blue-700 font-bold px-2.5 py-1 rounded-md transition duration-150 cursor-pointer"
                  >
                    Alle übernehmen
                  </button>
                </div>
              )}
            </div>
            {isNeueExpanded && (
              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {countNeue > 0 ? (
                  neueBewerbungen.map((update) => renderEmailUpdateRow(update, false))
                ) : (
                  <p className="text-xs text-slate-500 italic text-center py-4">Keine Mails in dieser Kategorie.</p>
                )}
              </div>
            )}
          </div>

          {/* Statusänderungen */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-900/10">
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/40 px-4 py-3 border-b border-white/5 gap-2 select-none">
              <button
                type="button"
                onClick={() => setIsStatusExpanded(!isStatusExpanded)}
                className="flex items-center gap-2 text-xs font-bold text-slate-105 bg-transparent border-none outline-none cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span>Statusänderung ({countStatus})</span>
                {isStatusExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {countStatus > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRejectAll(statusAenderungen)}
                    className="text-[10px] text-slate-300 bg-slate-900 hover:bg-slate-800 border border-white/5 font-bold px-2.5 py-1 rounded-md transition duration-150 cursor-pointer"
                  >
                    Alle verwerfen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAcceptAll(statusAenderungen)}
                    className="text-[10px] text-white bg-blue-600 hover:bg-blue-700 font-bold px-2.5 py-1 rounded-md transition duration-150 cursor-pointer"
                  >
                    Alle übernehmen
                  </button>
                </div>
              )}
            </div>
            {isStatusExpanded && (
              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {countStatus > 0 ? (
                  statusAenderungen.map((update) => renderEmailUpdateRow(update, true))
                ) : (
                  <p className="text-xs text-slate-500 italic text-center py-4">Keine Mails in dieser Kategorie.</p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 rounded-xl border border-dashed border-white/5 text-slate-400 bg-slate-900/20">
          <Sparkles className="h-7 w-7 mx-auto mb-2.5 text-slate-500 animate-pulse" />
          <p className="text-xs font-semibold text-slate-200">Keine neuen Bewerbungs-Mails gefunden</p>
        </div>
      )}
    </div>
  );
};
