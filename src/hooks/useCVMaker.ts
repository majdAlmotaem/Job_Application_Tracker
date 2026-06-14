import { useState } from "react";
import { CVData, CVConfig, PersonalDetails, Experience, Education, Skill } from "../types/cv";

const initialCVData: CVData = {
  personalDetails: {
    fullName: "Max Mustermann",
    jobTitle: "Senior Software Developer",
    email: "max.mustermann@example.com",
    phone: "+49 123 4567890",
    website: "https://github.com/maxmustermann",
    address: "Musterstraße 42, 12345 Berlin, Germany",
    summary: "Leidenschaftlicher Full-Stack-Entwickler mit über 5 Jahren Erfahrung im Entwerfen, Entwickeln und Bereitstellen von skalierbaren Webanwendungen. Spezialisiert auf React, Node.js und Cloud-Technologien. Stets bestrebt, sauberen, wartbaren Code zu schreiben und innovative Lösungen für komplexe Probleme zu finden."
  },
  workExperiences: [
    {
      id: "exp-1",
      company: "Tech Solutions GmbH",
      position: "Senior Software Entwickler",
      startDate: "2022-03",
      endDate: "Heute",
      description: "Entwicklung und Wartung von geschäftskritischen Cloud-Plattformen unter Verwendung von React und TypeScript. Leitung eines Teams von 4 Entwicklern, Einführung agiler Methoden und Optimierung des CI/CD-Deployment-Prozesses, was die Release-Zyklen um 30% verkürzte."
    },
    {
      id: "exp-2",
      company: "Digital Innovations AG",
      position: "Junior Web Developer",
      startDate: "2019-09",
      endDate: "2022-02",
      description: "Implementierung responsiver Benutzeroberflächen mit React und Tailwind CSS. Integration von REST- und GraphQL-APIs in Node.js-Backend-Systeme. Durchführung von Code-Reviews und Unit-Tests zur Sicherstellung hoher Code-Qualität."
    }
  ],
  educations: [
    {
      id: "edu-1",
      institution: "Technische Universität Berlin",
      degree: "Master of Science in Informatik",
      startDate: "2017-10",
      endDate: "2019-07",
      description: "Vertiefungsrichtung: Software Engineering und Verteilte Systeme. Masterarbeit zum Thema 'Skalierbarkeit von Microservice-Architekturen in Kubernetes'."
    },
    {
      id: "edu-2",
      institution: "Universität Hamburg",
      degree: "Bachelor of Science in Angewandte Informatik",
      startDate: "2014-10",
      endDate: "2017-09",
      description: "Grundlagen der Informatik, Algorithmen und Datenstrukturen, Softwarearchitektur."
    }
  ],
  skills: [
    { id: "skill-1", name: "JavaScript / TypeScript", level: "Expert" },
    { id: "skill-2", name: "React / Next.js", level: "Expert" },
    { id: "skill-3", name: "Node.js / Express", level: "Advanced" },
    { id: "skill-4", name: "Docker / Kubernetes", level: "Intermediate" },
    { id: "skill-5", name: "HTML5 / Tailwind CSS", level: "Advanced" },
    { id: "skill-6", name: "Git / GitHub Actions", level: "Advanced" }
  ]
};

const initialCVConfig: CVConfig = {
  template: "Classic",
  primaryColor: "slate",
  fontFamily: "sans"
};

export const useCVMaker = () => {
  const [cvData, setCvData] = useState<CVData>(initialCVData);
  const [cvConfig, setCvConfig] = useState<CVConfig>(initialCVConfig);

  const updatePersonalDetails = (details: Partial<PersonalDetails>) => {
    setCvData((prev) => ({
      ...prev,
      personalDetails: {
        ...prev.personalDetails,
        ...details
      }
    }));
  };

  const updateConfig = (config: Partial<CVConfig>) => {
    setCvConfig((prev) => ({
      ...prev,
      ...config
    }));
  };

  // Experience Handlers
  const addExperience = () => {
    const newExp: Experience = {
      id: `exp-${Math.random().toString(36).substr(2, 9)}`,
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      description: ""
    };
    setCvData((prev) => ({
      ...prev,
      workExperiences: [...prev.workExperiences, newExp]
    }));
  };

  const updateExperience = (id: string, fields: Partial<Experience>) => {
    setCvData((prev) => ({
      ...prev,
      workExperiences: prev.workExperiences.map((exp) =>
        exp.id === id ? { ...exp, ...fields } : exp
      )
    }));
  };

  const removeExperience = (id: string) => {
    setCvData((prev) => ({
      ...prev,
      workExperiences: prev.workExperiences.filter((exp) => exp.id !== id)
    }));
  };

  // Education Handlers
  const addEducation = () => {
    const newEdu: Education = {
      id: `edu-${Math.random().toString(36).substr(2, 9)}`,
      institution: "",
      degree: "",
      startDate: "",
      endDate: "",
      description: ""
    };
    setCvData((prev) => ({
      ...prev,
      educations: [...prev.educations, newEdu]
    }));
  };

  const updateEducation = (id: string, fields: Partial<Education>) => {
    setCvData((prev) => ({
      ...prev,
      educations: prev.educations.map((edu) =>
        edu.id === id ? { ...edu, ...fields } : edu
      )
    }));
  };

  const removeEducation = (id: string) => {
    setCvData((prev) => ({
      ...prev,
      educations: prev.educations.filter((edu) => edu.id !== id)
    }));
  };

  // Skill Handlers
  const addSkill = () => {
    const newSkill: Skill = {
      id: `skill-${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      level: "Intermediate"
    };
    setCvData((prev) => ({
      ...prev,
      skills: [...prev.skills, newSkill]
    }));
  };

  const updateSkill = (id: string, fields: Partial<Skill>) => {
    setCvData((prev) => ({
      ...prev,
      skills: prev.skills.map((skill) =>
        skill.id === id ? { ...skill, ...fields } : skill
      )
    }));
  };

  const removeSkill = (id: string) => {
    setCvData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill.id !== id)
    }));
  };

  return {
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
    removeSkill
  };
};
