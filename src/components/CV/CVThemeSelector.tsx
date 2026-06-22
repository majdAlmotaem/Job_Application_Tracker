import React from "react";
import { Palette, ChevronUp, ChevronDown } from "lucide-react";
import { CVConfig } from "../../types/cv";
import { ACCENT_COLORS, FONT_OPTIONS } from "./cvThemes";

interface CVThemeSelectorProps {
  cvConfig: CVConfig;
  updateConfig: (config: Partial<CVConfig>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const CVThemeSelector = React.forwardRef<HTMLDivElement, CVThemeSelectorProps>(
  ({ cvConfig, updateConfig, isOpen, onToggle }, ref) => {
    return (
      <div ref={ref} className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm">
        <button
          onClick={onToggle}
          className="sticky top-0 z-10 w-full flex items-center justify-between p-4.5 font-bold text-slate-100 bg-slate-900 hover:bg-slate-800 transition text-left text-sm border-none border-b border-white/5 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-pink-400" />
            <span>Design & Styling</span>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        
        {isOpen && (
          <div className="p-5 border-t border-white/5 bg-slate-950/10 space-y-6 text-left">
            {/* Accent Colors */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Akzentfarbe</label>
              <div className="flex flex-wrap gap-2.5 pl-1.5 py-1">
                {ACCENT_COLORS.map((col) => {
                  const isSelected = cvConfig.primaryColor === col.key;
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => updateConfig({ primaryColor: col.key })}
                      className={`w-7 h-7 rounded-full ${col.class} relative cursor-pointer border-2 transition hover:scale-110 ${
                        isSelected ? "border-white shadow-[0_0_10px_rgba(255,255,255,0.4)]" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      title={col.label}
                    />
                  );
                })}
              </div>
            </div>

            {/* Font Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Schriftart</label>
              <select
                value={cvConfig.fontFamily}
                onChange={(e) => updateConfig({ fontFamily: e.target.value })}
                className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full cursor-pointer"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Templates grid */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Vorlage / Layout</label>
              <div className="grid grid-cols-3 gap-3">
                {/* Template 1: Classic */}
                <div 
                  onClick={() => updateConfig({ template: "Classic" })}
                  className={`relative rounded-xl border p-2 flex flex-col items-center gap-1.5 cursor-pointer transition bg-slate-950/40 ${
                    cvConfig.template === "Classic" ? "border-blue-500 shadow-md shadow-blue-500/10" : "border-white/5 hover:border-white/20"
                  }`}
                >
                  {/* Mini Layout representation */}
                  <div className="w-full aspect-[3/4] bg-white rounded border border-white/10 flex flex-col p-1.5 gap-1 shadow-inner relative overflow-hidden select-none">
                    <div className="w-1/2 h-1 bg-slate-800 rounded-sm" />
                    <div className="w-1/3 h-0.5 bg-blue-500 rounded-sm" />
                    <div className="w-full border-t border-slate-100 my-0.5" />
                    <div className="space-y-1 mt-0.5">
                      <div className="w-3/4 h-0.5 bg-slate-300 rounded-sm" />
                      <div className="w-5/6 h-0.5 bg-slate-200 rounded-sm" />
                      <div className="w-2/3 h-0.5 bg-slate-200 rounded-sm" />
                    </div>
                    <div className="space-y-1 mt-1.5">
                      <div className="w-3/4 h-0.5 bg-slate-300 rounded-sm" />
                      <div className="w-4/5 h-0.5 bg-slate-200 rounded-sm" />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-200 leading-none">Klassisch</span>
                </div>

                {/* Template 2: Modern (Placeholder) */}
                <div className="relative rounded-xl border border-white/5 p-2 flex flex-col items-center gap-1.5 bg-slate-950/20 opacity-55 cursor-not-allowed select-none">
                  <div className="w-full aspect-[3/4] bg-slate-800 rounded border border-white/5 flex p-1.5 gap-1.5 relative overflow-hidden">
                    {/* Side column */}
                    <div className="w-1/3 h-full bg-slate-700 rounded-sm flex flex-col p-1 gap-1">
                      <div className="w-full h-1 bg-slate-500 rounded-sm" />
                      <div className="w-2/3 h-0.5 bg-slate-500 rounded-sm" />
                    </div>
                    {/* Main column */}
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="w-3/4 h-1 bg-slate-600 rounded-sm" />
                      <div className="w-full border-t border-slate-700 my-0.5" />
                      <div className="w-full h-0.5 bg-slate-700 rounded-sm" />
                      <div className="w-5/6 h-0.5 bg-slate-700 rounded-sm" />
                    </div>
                    <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center p-1">
                      <span className="bg-slate-900 border border-white/10 text-white text-[7px] font-extrabold px-1 py-0.5 rounded uppercase tracking-wider">Coming Soon</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 leading-none">Modern</span>
                </div>

                {/* Template 3: Minimalist (Placeholder) */}
                <div className="relative rounded-xl border border-white/5 p-2 flex flex-col items-center gap-1.5 bg-slate-950/20 opacity-55 cursor-not-allowed select-none">
                  <div className="w-full aspect-[3/4] bg-slate-800 rounded border border-white/5 flex flex-col p-1.5 gap-1 justify-center items-center relative overflow-hidden">
                    <div className="w-1/2 h-1 bg-slate-600 rounded-sm mb-1" />
                    <div className="w-3/4 h-0.5 bg-slate-750 rounded-sm" />
                    <div className="w-3/4 h-0.5 bg-slate-750 rounded-sm" />
                    <div className="w-3/4 h-0.5 bg-slate-750 rounded-sm" />
                    <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center p-1">
                      <span className="bg-slate-900 border border-white/10 text-white text-[7px] font-extrabold px-1 py-0.5 rounded uppercase tracking-wider">Coming Soon</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 leading-none">Minimalist</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

CVThemeSelector.displayName = "CVThemeSelector";
