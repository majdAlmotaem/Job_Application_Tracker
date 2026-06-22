import React from "react";
import { Mail, ChevronUp, ChevronDown } from "lucide-react";
import { PersonalDetails } from "../../types/cv";

interface CVPersonalInfoFormProps {
  data: PersonalDetails;
  onUpdate: (details: Partial<PersonalDetails>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const CVPersonalInfoForm = React.forwardRef<HTMLDivElement, CVPersonalInfoFormProps>(
  ({ data, onUpdate, isOpen, onToggle }, ref) => {
    return (
      <div ref={ref} className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm">
        <button
          onClick={onToggle}
          className="sticky top-0 z-10 w-full flex items-center justify-between p-4.5 font-bold text-slate-100 bg-slate-900 hover:bg-slate-800 transition text-left text-sm border-none border-b border-white/5 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400" />
            <span>Persönliche Details</span>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isOpen && (
          <div className="p-5 border-t border-white/5 bg-slate-950/10 space-y-4 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Vollständiger Name</label>
                <input
                  type="text"
                  value={data.fullName}
                  onChange={(e) => onUpdate({ fullName: e.target.value })}
                  placeholder="z. B. Max Mustermann"
                  className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Berufsbezeichnung</label>
                <input
                  type="text"
                  value={data.jobTitle}
                  onChange={(e) => onUpdate({ jobTitle: e.target.value })}
                  placeholder="z. B. Senior React Entwickler"
                  className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">E-Mail-Adresse</label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => onUpdate({ email: e.target.value })}
                  placeholder="max@beispiel.de"
                  className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Telefonnummer</label>
                <input
                  type="text"
                  value={data.phone}
                  onChange={(e) => onUpdate({ phone: e.target.value })}
                  placeholder="+49 170 1234567"
                  className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Website / Portfolio</label>
                <input
                  type="text"
                  value={data.website}
                  onChange={(e) => onUpdate({ website: e.target.value })}
                  placeholder="https://github.com/nutzer"
                  className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Adresse</label>
                <input
                  type="text"
                  value={data.address}
                  onChange={(e) => onUpdate({ address: e.target.value })}
                  placeholder="Musterweg 12, 12345 Berlin"
                  className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Kurzprofil / Zusammenfassung</label>
              <textarea
                value={data.summary}
                onChange={(e) => onUpdate({ summary: e.target.value })}
                rows={4}
                placeholder="Beschreiben Sie sich kurz..."
                className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full resize-none custom-scrollbar"
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

CVPersonalInfoForm.displayName = "CVPersonalInfoForm";
