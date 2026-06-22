import React from "react";
import { CVData, PersonalDetails, Experience, Education, Skill } from "../../types/cv";
import { CVPersonalInfoForm } from "./CVPersonalInfoForm";
import { CVWorkExperienceForm } from "./CVWorkExperienceForm";
import { CVEducationForm } from "./CVEducationForm";
import { CVSkillsForm } from "./CVSkillsForm";

interface CVFormProps {
  data: CVData;
  openSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  updatePersonalDetails: (details: Partial<PersonalDetails>) => void;
  addExperience: () => void;
  updateExperience: (id: string, fields: Partial<Experience>) => void;
  removeExperience: (id: string) => void;
  addEducation: () => void;
  updateEducation: (id: string, fields: Partial<Education>) => void;
  removeEducation: (id: string) => void;
  addSkill: () => void;
  updateSkill: (id: string, fields: Partial<Skill>) => void;
  removeSkill: (id: string) => void;
  personalRef: React.RefObject<HTMLDivElement>;
  experienceRef: React.RefObject<HTMLDivElement>;
  educationRef: React.RefObject<HTMLDivElement>;
  skillsRef: React.RefObject<HTMLDivElement>;
}

export const CVForm: React.FC<CVFormProps> = ({
  data,
  openSections,
  onToggleSection,
  updatePersonalDetails,
  addExperience,
  updateExperience,
  removeExperience,
  addEducation,
  updateEducation,
  removeEducation,
  addSkill,
  updateSkill,
  removeSkill,
  personalRef,
  experienceRef,
  educationRef,
  skillsRef,
}) => {
  return (
    <div className="space-y-4">
      <CVPersonalInfoForm
        ref={personalRef}
        data={data.personalDetails}
        onUpdate={updatePersonalDetails}
        isOpen={openSections.personal}
        onToggle={() => onToggleSection("personal")}
      />
      <CVWorkExperienceForm
        ref={experienceRef}
        data={data.workExperiences}
        onAdd={addExperience}
        onUpdate={updateExperience}
        onRemove={removeExperience}
        isOpen={openSections.experience}
        onToggle={() => onToggleSection("experience")}
      />
      <CVEducationForm
        ref={educationRef}
        data={data.educations}
        onAdd={addEducation}
        onUpdate={updateEducation}
        onRemove={removeEducation}
        isOpen={openSections.education}
        onToggle={() => onToggleSection("education")}
      />
      <CVSkillsForm
        ref={skillsRef}
        data={data.skills}
        onAdd={addSkill}
        onUpdate={updateSkill}
        onRemove={removeSkill}
        isOpen={openSections.skills}
        onToggle={() => onToggleSection("skills")}
      />
    </div>
  );
};
