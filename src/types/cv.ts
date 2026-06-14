export interface PersonalDetails {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  summary: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  level: string;
}

export interface CVConfig {
  template: string;
  primaryColor: string;
  fontFamily: string;
}

export interface CVData {
  personalDetails: PersonalDetails;
  workExperiences: Experience[];
  educations: Education[];
  skills: Skill[];
}
