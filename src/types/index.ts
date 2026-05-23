export type ApplicationStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Ready to Submit'
  | 'submitted'
  | 'interview'
  | 'accepted'
  | 'rejected'
  | 'waitlisted';

export type DocumentType =
  | 'cv'
  | 'sop'
  | 'transcript'
  | 'recommendation'
  | 'essay'
  | 'portfolio'
  | 'other';

export type DocumentStatus =
  | 'Not Started'
  | 'drafting'
  | 'ready'
  | 'submitted'
  | 'not_required';

export interface University {
  id: string;
  name: string;
  location: string;
  country: string;
  logo?: string;
  ranking?: number;
}

export interface Program {
  id: string;
  universityId: string;
  name: string;
  degree: 'MSc' | 'PhD' | 'MA' | 'MBA';
  department: string;
  tuitionFee?: number;
  fundingAvailable: boolean;
}

export interface Application {
  id: string;
  universityId: string;
  programId: string;
  status: ApplicationStatus;
  deadline: string;
  submittedDate?: string;
  portalLink?: string;
  notes?: string;
  requirements: Requirement[];
  documents: Document[];
  supervisors: Supervisor[];
  recommenders?: Recommender[];
  matchScore?: number;
  fundingLikelihood?: number;
}

export interface Requirement {
  id: string;
  name: string;
  description?: string;
  completed: boolean;
  required: boolean;
  status?: DocumentStatus;
}

export interface Document {
  id: string;
  type: DocumentType;
  name: string;
  uploadedDate: string;
  fileUrl?: string;
  version: number;
  status: DocumentStatus;
}

export interface Supervisor {
  id: string;
  name: string;
  email: string;
  department: string;
  researchAreas: string[];
  publicationCount?: number;
  lastContacted?: string;
  responseReceived: boolean;
  notes?: string;
}

export type RecommenderStatus = 'not_asked' | 'asked' | 'confirmed' | 'submitted';

export interface Recommender {
  id: string;
  name: string;
  title: string;
  email: string;
  status: RecommenderStatus;
  briefingNotes?: string;
  dateAsked?: string;
  dateConfirmed?: string;
  dateSubmitted?: string;
}

export interface UserProfile {
  id: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    nationality: string;
  };
  education: EducationEntry[];
  testScores: TestScore[];
  publications: Publication[];
  projects: Project[];
  experience: Experience[];
  researchInterests: string[];
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: number;
  maxGpa?: number;
}

export interface TestScore {
  id: string;
  type: 'GRE' | 'TOEFL' | 'IELTS' | 'GMAT';
  score: string;
  date: string;
  breakdown?: Record<string, number>;
}

export interface Publication {
  id: string;
  title: string;
  authors: string[];
  venue: string;
  year: number;
  doi?: string;
  citations?: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  startDate: string;
  endDate?: string;
  link?: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
  location: string;
}
