import React, { useRef, useState, useEffect } from "react";
import { useCVMaker } from "../hooks/useCVMaker";
import { CVThemeSelector } from "../components/CV/CVThemeSelector";
import { CVForm } from "../components/CV/CVForm";
import { CVPreview } from "../components/CV/CVPreview";


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

  return (
    <div className="w-full md:h-full h-auto flex flex-col overflow-hidden">
      {/* Split layout (Left: Forms, Right: Preview) */}
      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0 w-full select-none">

        {/* Left Column - Scrollable Forms Editor */}
        <div className="w-full md:w-1/2 h-full overflow-y-auto p-6 pb-32 space-y-4 custom-scrollbar">
          <CVThemeSelector
            ref={stylingRef}
            cvConfig={cvConfig}
            updateConfig={updateConfig}
            isOpen={openSections.styling}
            onToggle={() => toggleSection("styling")}
          />

          <CVForm
            data={cvData}
            openSections={openSections}
            onToggleSection={toggleSection}
            updatePersonalDetails={updatePersonalDetails}
            addExperience={addExperience}
            updateExperience={updateExperience}
            removeExperience={removeExperience}
            addEducation={addEducation}
            updateEducation={updateEducation}
            removeEducation={removeEducation}
            addSkill={addSkill}
            updateSkill={updateSkill}
            removeSkill={removeSkill}
            personalRef={personalRef}
            experienceRef={experienceRef}
            educationRef={educationRef}
            skillsRef={skillsRef}
          />
        </div>

        {/* Right Column - Live-Preview Box */}
        <CVPreview data={cvData} config={cvConfig} />

      </div>
    </div>
  );
};
