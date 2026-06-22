import React from "react";
import { FileText, ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { Education } from "../../types/cv";

interface CVEducationFormProps {
  data: Education[];
  onAdd: () => void;
  onUpdate: (id: string, fields: Partial<Education>) => void;
  onRemove: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const CVEducationForm = React.forwardRef<HTMLDivElement, CVEducationFormProps>(
  ({ data, onAdd, onUpdate, onRemove, isOpen, onToggle }, ref) => {
    return (
      <div ref={ref} className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm">
        <button
          onClick={onToggle}
          className="sticky top-0 z-10 w-full flex items-center justify-between p-4.5 font-bold text-slate-100 bg-slate-900 hover:bg-slate-800 transition text-left text-sm border-none border-b border-white/5 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Ausbildung</span>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isOpen && (
          <div className="p-5 border-t border-white/5 bg-slate-950/10 space-y-6 text-left">
            {data.map((edu, idx) => (
              <div key={edu.id} className="p-4 bg-slate-950/35 border border-white/5 rounded-xl space-y-4 relative">
                <button
                  type="button"
                  onClick={() => onRemove(edu.id)}
                  className="absolute top-3 right-3 text-slate-500 hover:text-rose-500 p-1 hover:bg-white/5 rounded transition border-none bg-transparent cursor-pointer"
                  title="Eintrag entfernen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  Ausbildung #{idx + 1}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Einrichtung / Universität</label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => onUpdate(edu.id, { institution: e.target.value })}
                      placeholder="z. B. TU Berlin"
                      className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Abschluss / Studiengang</label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => onUpdate(edu.id, { degree: e.target.value })}
                      placeholder="z. B. Bachelor of Science"
                      className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Startdatum</label>
                    <input
                      type="text"
                      value={edu.startDate}
                      onChange={(e) => onUpdate(edu.id, { startDate: e.target.value })}
                      placeholder="z. B. 2018-10"
                      className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Enddatum</label>
                    <input
                      type="text"
                      value={edu.endDate}
                      onChange={(e) => onUpdate(edu.id, { endDate: e.target.value })}
                      placeholder="z. B. 2021-09"
                      className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Beschreibung / Schwerpunkte</label>
                  <textarea
                    value={edu.description}
                    onChange={(e) => onUpdate(edu.id, { description: e.target.value })}
                    rows={3}
                    placeholder="Notendurchschnitt, Studienschwerpunkte..."
                    className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full resize-none custom-scrollbar"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={onAdd}
              className="w-full flex items-center justify-center gap-1.5 py-3 border border-dashed border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-blue-400 hover:border-blue-500/35 transition cursor-pointer bg-transparent"
            >
              <Plus className="w-4 h-4" />
              <span>Ausbildung hinzufügen</span>
            </button>
          </div>
        )}
      </div>
    );
  }
);

CVEducationForm.displayName = "CVEducationForm";
