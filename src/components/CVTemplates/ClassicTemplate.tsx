import React from "react";
import { CVData, CVConfig } from "../../types/cv";

interface ClassicTemplateProps {
  data: CVData;
  config: CVConfig;
}

const getColorClasses = (color: string) => {
  switch (color) {
    case "blue":
      return {
        text: "text-blue-600",
        border: "border-blue-600/30",
        bg: "bg-blue-600",
        accentBg: "bg-blue-50/50",
        accentText: "text-blue-700",
        heading: "text-blue-900 border-blue-600",
      };
    case "indigo":
      return {
        text: "text-indigo-600",
        border: "border-indigo-600/30",
        bg: "bg-indigo-600",
        accentBg: "bg-indigo-50/50",
        accentText: "text-indigo-700",
        heading: "text-indigo-900 border-indigo-600",
      };
    case "violet":
      return {
        text: "text-violet-600",
        border: "border-violet-600/30",
        bg: "bg-violet-600",
        accentBg: "bg-violet-50/50",
        accentText: "text-violet-700",
        heading: "text-violet-900 border-violet-600",
      };
    case "amber":
      return {
        text: "text-amber-600",
        border: "border-amber-600/30",
        bg: "bg-amber-650",
        accentBg: "bg-amber-50/50",
        accentText: "text-amber-700",
        heading: "text-amber-950 border-amber-650",
      };
    case "emerald":
      return {
        text: "text-emerald-600",
        border: "border-emerald-600/30",
        bg: "bg-emerald-600",
        accentBg: "bg-emerald-50/50",
        accentText: "text-emerald-700",
        heading: "text-emerald-900 border-emerald-600",
      };
    case "slate":
    default:
      return {
        text: "text-slate-600",
        border: "border-slate-600/30",
        bg: "bg-slate-600",
        accentBg: "bg-slate-100/50",
        accentText: "text-slate-700",
        heading: "text-slate-900 border-slate-600",
      };
  }
};

const getFontFamilyClass = (font: string) => {
  switch (font) {
    case "serif":
      return "font-serif";
    case "mono":
      return "font-mono";
    case "sans":
    default:
      return "font-sans";
  }
};

export const ClassicTemplate: React.FC<ClassicTemplateProps> = ({ data, config }) => {
  const colors = getColorClasses(config.primaryColor);
  const fontClass = getFontFamilyClass(config.fontFamily);
  const { personalDetails, workExperiences, educations, skills } = data;

  return (
    <div
      className={`w-[210mm] min-h-[297mm] bg-white text-slate-800 p-[20mm] shadow-2xl relative select-none box-border text-left ${fontClass} leading-relaxed`}
      style={{
        width: "210mm",
        minHeight: "297mm",
      }}
    >
      {/* 1. Header (Personal details) */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 m-0 uppercase">
          {personalDetails.fullName || "Name"}
        </h1>
        {personalDetails.jobTitle && (
          <p className={`text-xs font-black tracking-widest uppercase mt-1.5 m-0 ${colors.text}`}>
            {personalDetails.jobTitle}
          </p>
        )}

        {/* Contact details */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium mt-4 pt-4 border-t border-slate-100">
          {personalDetails.email && (
            <div className="flex items-center gap-1.5">
              <span>📧</span>
              <span>{personalDetails.email}</span>
            </div>
          )}
          {personalDetails.phone && (
            <div className="flex items-center gap-1.5">
              <span>📞</span>
              <span>{personalDetails.phone}</span>
            </div>
          )}
          {personalDetails.website && (
            <div className="flex items-center gap-1.5">
              <span>🌐</span>
              <a href={personalDetails.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-slate-600 font-semibold no-underline">
                {personalDetails.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
          {personalDetails.address && (
            <div className="flex items-center gap-1.5">
              <span>📍</span>
              <span>{personalDetails.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Professional Summary */}
      {personalDetails.summary && (
        <div className="mb-6">
          <h2 className={`text-xs font-bold uppercase tracking-wider border-b-2 pb-1.5 mb-2.5 ${colors.heading}`}>
            Profil
          </h2>
          <p className="text-xs text-slate-600 font-medium m-0 whitespace-pre-line leading-relaxed">
            {personalDetails.summary}
          </p>
        </div>
      )}

      {/* 3. Work Experience */}
      {workExperiences.length > 0 && (
        <div className="mb-6">
          <h2 className={`text-xs font-bold uppercase tracking-wider border-b-2 pb-1.5 mb-3.5 ${colors.heading}`}>
            Beruflicher Werdegang
          </h2>
          <div className="space-y-4">
            {workExperiences.map((exp) => (
              <div key={exp.id} className="space-y-1">
                <div className="flex justify-between items-start text-xs font-bold text-slate-900">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <span>{exp.position || "Position"}</span>
                    {exp.company && (
                      <span className="text-slate-400 font-medium">
                        | {exp.company}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] uppercase font-bold shrink-0 ${colors.text}`}>
                    {(exp.startDate || exp.endDate) ? `${exp.startDate} - ${exp.endDate || "Heute"}` : ""}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-[11px] text-slate-600 m-0 whitespace-pre-line leading-relaxed pl-1.5 border-l-2 border-slate-100">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Education */}
      {educations.length > 0 && (
        <div className="mb-6">
          <h2 className={`text-xs font-bold uppercase tracking-wider border-b-2 pb-1.5 mb-3.5 ${colors.heading}`}>
            Ausbildung
          </h2>
          <div className="space-y-4">
            {educations.map((edu) => (
              <div key={edu.id} className="space-y-1">
                <div className="flex justify-between items-start text-xs font-bold text-slate-900">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <span>{edu.degree || "Studiengang/Abschluss"}</span>
                    {edu.institution && (
                      <span className="text-slate-400 font-medium">
                        | {edu.institution}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] uppercase font-bold shrink-0 ${colors.text}`}>
                    {(edu.startDate || edu.endDate) ? `${edu.startDate} - ${edu.endDate || "Heute"}` : ""}
                  </span>
                </div>
                {edu.description && (
                  <p className="text-[11px] text-slate-600 m-0 whitespace-pre-line leading-relaxed pl-1.5 border-l-2 border-slate-100">
                    {edu.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Skills */}
      {skills.length > 0 && (
        <div>
          <h2 className={`text-xs font-bold uppercase tracking-wider border-b-2 pb-1.5 mb-3.5 ${colors.heading}`}>
            Fähigkeiten & Kompetenzen
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold border ${colors.border} ${colors.accentBg} ${colors.accentText}`}
              >
                <span>{skill.name || "Kompetenz"}</span>
                {skill.level && (
                  <span className="text-[9px] opacity-75 font-medium border-l pl-1.5 border-current">
                    {skill.level}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
