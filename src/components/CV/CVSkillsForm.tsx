import React from "react";
import { FileText, ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { Skill } from "../../types/cv";

interface CVSkillsFormProps {
  data: Skill[];
  onAdd: () => void;
  onUpdate: (id: string, fields: Partial<Skill>) => void;
  onRemove: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const CVSkillsForm = React.forwardRef<HTMLDivElement, CVSkillsFormProps>(
  ({ data, onAdd, onUpdate, onRemove, isOpen, onToggle }, ref) => {
    return (
      <div ref={ref} className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm">
        <button
          onClick={onToggle}
          className="sticky top-0 z-10 w-full flex items-center justify-between p-4.5 font-bold text-slate-100 bg-slate-900 hover:bg-slate-800 transition text-left text-sm border-none border-b border-white/5 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Kenntnisse</span>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isOpen && (
          <div className="p-5 border-t border-white/5 bg-slate-950/10 space-y-4 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.map((skill) => (
                <div key={skill.id} className="flex items-center gap-2 bg-slate-950/30 border border-white/5 p-2 rounded-xl">
                  <input
                    type="text"
                    value={skill.name}
                    onChange={(e) => onUpdate(skill.id, { name: e.target.value })}
                    placeholder="Kompetenz"
                    className="bg-slate-950/65 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none flex-1 min-w-0"
                  />
                  <select
                    value={skill.level}
                    onChange={(e) => onUpdate(skill.id, { level: e.target.value })}
                    className="bg-slate-950/65 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none cursor-pointer w-24"
                  >
                    <option value="Beginner">Basis</option>
                    <option value="Intermediate">Fortgeschritten</option>
                    <option value="Advanced">Sehr gut</option>
                    <option value="Expert">Experte</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemove(skill.id)}
                    className="text-slate-500 hover:text-rose-500 p-1 hover:bg-white/5 rounded transition border-none bg-transparent cursor-pointer shrink-0"
                    title="Kenntnis löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onAdd}
              className="w-full flex items-center justify-center gap-1.5 py-3 border border-dashed border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-blue-400 hover:border-blue-500/35 transition cursor-pointer bg-transparent"
            >
              <Plus className="w-4 h-4" />
              <span>Kompetenz hinzufügen</span>
            </button>
          </div>
        )}
      </div>
    );
  }
);

CVSkillsForm.displayName = "CVSkillsForm";
