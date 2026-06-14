import React, { useRef, useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { FileText, Plus, Trash2, ChevronDown, ChevronUp, Download, Link as LinkIcon, Mail, Phone, MapPin, Briefcase, ZoomIn, ZoomOut, RotateCcw, Palette } from "lucide-react";
import { useCVMaker } from "../hooks/useCVMaker";
import { ClassicTemplate } from "../components/CVTemplates/ClassicTemplate";

export const CVMakerPage: React.FC = () => {
  const {
    cvData,
    cvConfig,
    updatePersonalDetails,
    updateConfig,
    addExperience,
    updateExperience,
    removeExperience,
    addEducation,
    updateEducation,
    removeEducation,
    addSkill,
    updateSkill,
    removeSkill,
  } = useCVMaker();

  const componentRef = useRef<HTMLDivElement>(null);

  // Refs for scrolling expanded sections into view
  const stylingRef = useRef<HTMLDivElement>(null);
  const personalRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const educationRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);

  // Accordion Section States
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    styling: true,
    personal: false,
    experience: false,
    education: false,
    skills: false,
  });

  const [lastOpenedSection, setLastOpenedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const nextState = !prev[section];
      if (nextState) {
        setLastOpenedSection(section);
      }
      return {
        ...prev,
        [section]: nextState,
      };
    });
  };

  useEffect(() => {
    if (lastOpenedSection && openSections[lastOpenedSection]) {
      const refs = {
        styling: stylingRef,
        personal: personalRef,
        experience: experienceRef,
        education: educationRef,
        skills: skillsRef,
      };
      const targetRef = refs[lastOpenedSection as keyof typeof refs];
      if (targetRef?.current) {
        setTimeout(() => {
          targetRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 120);
      }
    }
  }, [openSections, lastOpenedSection]);

  // PDF Download Trigger
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  // Resize Observer to scale preview A4 dynamically to fit parent container width
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [baseScale, setBaseScale] = useState(0.7);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [templateHeight, setTemplateHeight] = useState(1122.5);

  const totalPages = Math.max(1, Math.ceil(templateHeight / 1122.5));

  useEffect(() => {
    if (!previewContainerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        // A4 page width is 210mm. 210mm in pixels at 96 DPI is approx 794px.
        // We subtract padding to fit page nicely (48px total horizontal margins).
        const newScale = Math.min((width - 48) / 794, 1);
        setBaseScale(newScale);
      }
    });
    resizeObserver.observe(previewContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!componentRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setTemplateHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(componentRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const finalScale = baseScale * (zoomLevel / 100);

  return (
    <div className="w-full md:h-full h-auto flex flex-col overflow-hidden">
      {/* Split layout (Left: Forms, Right: Preview) */}
      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0 w-full select-none">
        
        {/* Left Column - Scrollable Forms Editor */}
        <div className="w-full md:w-1/2 h-full overflow-y-auto p-6 pb-32 space-y-4 custom-scrollbar">
          
          {/* Section: Design & Styling */}
          <div ref={stylingRef} className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm">
            <button
              onClick={() => toggleSection("styling")}
              className="sticky top-0 z-10 w-full flex items-center justify-between p-4.5 font-bold text-slate-100 bg-slate-900 hover:bg-slate-800 transition text-left text-sm border-none border-b border-white/5 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-pink-400" />
                <span>Design & Styling</span>
              </div>
              {openSections.styling ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            
            {openSections.styling && (
              <div className="p-5 border-t border-white/5 bg-slate-950/10 space-y-6 text-left">
                {/* Accent Colors */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Akzentfarbe</label>
                  <div className="flex flex-wrap gap-2.5 pl-1.5 py-1">
                    {[
                      { key: "slate", label: "Schiefergrau", class: "bg-slate-500" },
                      { key: "blue", label: "Königsblau", class: "bg-blue-600" },
                      { key: "emerald", label: "Smaragdgrün", class: "bg-emerald-600" },
                      { key: "indigo", label: "Königsindigo", class: "bg-indigo-600" },
                      { key: "violet", label: "Violett", class: "bg-violet-600" },
                      { key: "amber", label: "Ambergold", class: "bg-amber-500" },
                    ].map((col) => {
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
                    <option value="sans">Sans-Serif (Modern & Clean)</option>
                    <option value="serif">Serif (Klassisch & Elegant)</option>
                    <option value="mono">Monospace (Technisch & Minimalistisch)</option>
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

          {/* Section A: Personal Details */}
          <div ref={personalRef} className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm">
            <button
              onClick={() => toggleSection("personal")}
              className="sticky top-0 z-10 w-full flex items-center justify-between p-4.5 font-bold text-slate-100 bg-slate-900 hover:bg-slate-800 transition text-left text-sm border-none border-b border-white/5 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" />
                <span>Persönliche Details</span>
              </div>
              {openSections.personal ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            
            {openSections.personal && (
              <div className="p-5 border-t border-white/5 bg-slate-950/10 space-y-4 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Vollständiger Name</label>
                    <input
                      type="text"
                      value={cvData.personalDetails.fullName}
                      onChange={(e) => updatePersonalDetails({ fullName: e.target.value })}
                      placeholder="z. B. Max Mustermann"
                      className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Berufsbezeichnung</label>
                    <input
                      type="text"
                      value={cvData.personalDetails.jobTitle}
                      onChange={(e) => updatePersonalDetails({ jobTitle: e.target.value })}
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
                      value={cvData.personalDetails.email}
                      onChange={(e) => updatePersonalDetails({ email: e.target.value })}
                      placeholder="max@beispiel.de"
                      className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Telefonnummer</label>
                    <input
                      type="text"
                      value={cvData.personalDetails.phone}
                      onChange={(e) => updatePersonalDetails({ phone: e.target.value })}
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
                      value={cvData.personalDetails.website}
                      onChange={(e) => updatePersonalDetails({ website: e.target.value })}
                      placeholder="https://github.com/nutzer"
                      className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Adresse</label>
                    <input
                      type="text"
                      value={cvData.personalDetails.address}
                      onChange={(e) => updatePersonalDetails({ address: e.target.value })}
                      placeholder="Musterweg 12, 12345 Berlin"
                      className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Kurzprofil / Zusammenfassung</label>
                  <textarea
                    value={cvData.personalDetails.summary}
                    onChange={(e) => updatePersonalDetails({ summary: e.target.value })}
                    rows={4}
                    placeholder="Beschreiben Sie sich kurz..."
                    className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full resize-none custom-scrollbar"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section B: Work Experience */}
          <div ref={experienceRef} className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm">
            <button
              onClick={() => toggleSection("experience")}
              className="sticky top-0 z-10 w-full flex items-center justify-between p-4.5 font-bold text-slate-100 bg-slate-900 hover:bg-slate-800 transition text-left text-sm border-none border-b border-white/5 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-400" />
                <span>Berufliche Erfahrung</span>
              </div>
              {openSections.experience ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openSections.experience && (
              <div className="p-5 border-t border-white/5 bg-slate-950/10 space-y-6 text-left">
                {cvData.workExperiences.map((exp, idx) => (
                  <div key={exp.id} className="p-4 bg-slate-950/35 border border-white/5 rounded-xl space-y-4 relative">
                    <button
                      type="button"
                      onClick={() => removeExperience(exp.id)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-rose-500 p-1 hover:bg-white/5 rounded transition border-none bg-transparent cursor-pointer"
                      title="Eintrag entfernen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                      Position #{idx + 1}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Arbeitgeber / Firma</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                          placeholder="z. B. Tech AG"
                          className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Position</label>
                        <input
                          type="text"
                          value={exp.position}
                          onChange={(e) => updateExperience(exp.id, { position: e.target.value })}
                          placeholder="z. B. Webentwickler"
                          className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Startdatum</label>
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                          placeholder="z. B. 2021-01 oder Jan 2021"
                          className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Enddatum</label>
                        <input
                          type="text"
                          value={exp.endDate}
                          onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                          placeholder="z. B. 2023-12 oder Heute"
                          className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Tätigkeiten / Beschreibung</label>
                      <textarea
                        value={exp.description}
                        onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                        rows={3}
                        placeholder="Erfolge und Hauptaufgaben auflisten..."
                        className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full resize-none custom-scrollbar"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExperience}
                  className="w-full flex items-center justify-center gap-1.5 py-3 border border-dashed border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-blue-400 hover:border-blue-500/35 transition cursor-pointer bg-transparent"
                >
                  <Plus className="w-4 h-4" />
                  <span>Werdegang hinzufügen</span>
                </button>
              </div>
            )}
          </div>

          {/* Section C: Education */}
          <div ref={educationRef} className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm">
            <button
              onClick={() => toggleSection("education")}
              className="sticky top-0 z-10 w-full flex items-center justify-between p-4.5 font-bold text-slate-100 bg-slate-900 hover:bg-slate-800 transition text-left text-sm border-none border-b border-white/5 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Ausbildung</span>
              </div>
              {openSections.education ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openSections.education && (
              <div className="p-5 border-t border-white/5 bg-slate-950/10 space-y-6 text-left">
                {cvData.educations.map((edu, idx) => (
                  <div key={edu.id} className="p-4 bg-slate-950/35 border border-white/5 rounded-xl space-y-4 relative">
                    <button
                      type="button"
                      onClick={() => removeEducation(edu.id)}
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
                          onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                          placeholder="z. B. TU Berlin"
                          className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Abschluss / Studiengang</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
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
                          onChange={(e) => updateEducation(edu.id, { startDate: e.target.value })}
                          placeholder="z. B. 2018-10"
                          className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Enddatum</label>
                        <input
                          type="text"
                          value={edu.endDate}
                          onChange={(e) => updateEducation(edu.id, { endDate: e.target.value })}
                          placeholder="z. B. 2021-09"
                          className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Beschreibung / Schwerpunkte</label>
                      <textarea
                        value={edu.description}
                        onChange={(e) => updateEducation(edu.id, { description: e.target.value })}
                        rows={3}
                        placeholder="Notendurchschnitt, Studienschwerpunkte..."
                        className="bg-slate-950/65 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none w-full resize-none custom-scrollbar"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addEducation}
                  className="w-full flex items-center justify-center gap-1.5 py-3 border border-dashed border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-blue-400 hover:border-blue-500/35 transition cursor-pointer bg-transparent"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ausbildung hinzufügen</span>
                </button>
              </div>
            )}
          </div>

          {/* Section D: Skills */}
          <div ref={skillsRef} className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm">
            <button
              onClick={() => toggleSection("skills")}
              className="sticky top-0 z-10 w-full flex items-center justify-between p-4.5 font-bold text-slate-100 bg-slate-900 hover:bg-slate-800 transition text-left text-sm border-none border-b border-white/5 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Kenntnisse</span>
              </div>
              {openSections.skills ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openSections.skills && (
              <div className="p-5 border-t border-white/5 bg-slate-950/10 space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cvData.skills.map((skill) => (
                    <div key={skill.id} className="flex items-center gap-2 bg-slate-950/30 border border-white/5 p-2 rounded-xl">
                      <input
                        type="text"
                        value={skill.name}
                        onChange={(e) => updateSkill(skill.id, { name: e.target.value })}
                        placeholder="Kompetenz"
                        className="bg-slate-950/65 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none flex-1 min-w-0"
                      />
                      <select
                        value={skill.level}
                        onChange={(e) => updateSkill(skill.id, { level: e.target.value })}
                        className="bg-slate-950/65 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none cursor-pointer w-24"
                      >
                        <option value="Beginner">Basis</option>
                        <option value="Intermediate">Fortgeschritten</option>
                        <option value="Advanced">Sehr gut</option>
                        <option value="Expert">Experte</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeSkill(skill.id)}
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
                  onClick={addSkill}
                  className="w-full flex items-center justify-center gap-1.5 py-3 border border-dashed border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-blue-400 hover:border-blue-500/35 transition cursor-pointer bg-transparent"
                >
                  <Plus className="w-4 h-4" />
                  <span>Kompetenz hinzufügen</span>
                </button>
              </div>
            )}
          </div>
        </div>

             {/* Right Column - Live-Preview Box */}
        <div 
          className="w-full md:w-1/2 h-full bg-slate-950/30 border border-white/5 rounded-2xl flex flex-col overflow-hidden relative shadow-inner"
        >
          {/* Controls Bar inside the Preview Card */}
          <div className="bg-slate-900/60 backdrop-blur-md border-b border-white/5 px-4.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200">Lebenslauf Vorschau</span>
            </div>

            {/* Zoom and Export Actions */}
            <div className="flex items-center justify-between sm:justify-end gap-3 flex-1 sm:flex-initial">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5 bg-slate-950/70 border border-white/10 rounded-xl px-2 py-1 h-[32px]">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                  className="text-slate-400 hover:text-white transition p-1 rounded hover:bg-white/5 border-none cursor-pointer flex items-center justify-center bg-transparent"
                  title="Verkleinern"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-slate-300 text-[10px] select-none min-w-[28px] text-center">{zoomLevel}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                  className="text-slate-400 hover:text-white transition p-1 rounded hover:bg-white/5 border-none cursor-pointer flex items-center justify-center bg-transparent"
                  title="Vergrößern"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="text-slate-500 hover:text-slate-300 transition p-1 rounded hover:bg-white/5 border-none cursor-pointer flex items-center justify-center ml-0.5 bg-transparent"
                  title="Zurücksetzen"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              {/* PDF Export Button */}
              <button
                onClick={() => handlePrint()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs shadow-md shadow-blue-900/10 cursor-pointer transition border-none h-[32px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportieren</span>
              </button>
            </div>
          </div>

          {/* Outer scroll container for centered A4 template pages stacked vertically */}
          <div 
            ref={previewContainerRef}
            className="flex-1 overflow-y-auto overflow-x-auto p-6 custom-scrollbar flex flex-col items-center gap-6"
          >
            {Array.from({ length: totalPages }).map((_, index) => (
              <div 
                key={index}
                style={{
                  width: `${794 * finalScale}px`,
                  height: `${1122.5 * finalScale}px`,
                  position: "relative",
                  overflow: "hidden",
                }}
                className="shrink-0 bg-white shadow-2xl rounded-sm transition-all duration-200"
              >
                {/* Scaled Wrapper */}
                <div 
                  className="origin-top-left bg-white"
                  style={{
                    transform: `scale(${finalScale})`,
                    width: "794px",
                    position: "absolute",
                    top: `-${index * 1122.5 * finalScale}px`,
                    left: 0,
                  }}
                >
                  <ClassicTemplate data={cvData} config={cvConfig} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Offscreen Print Container */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div ref={componentRef}>
          <ClassicTemplate data={cvData} config={cvConfig} />
        </div>
      </div>
    </div>
  );
};
