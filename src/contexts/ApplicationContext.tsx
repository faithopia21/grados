import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Application, University, Program } from '../types';
import { mockApplications, mockUniversities, mockPrograms } from '../data/mockData';

interface ApplicationContextType {
  applications: Application[];
  universities: University[];
  programs: Program[];
  addApplication: (app: Omit<Application, 'id'>) => void;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  addUniversity: (uni: Omit<University, 'id'>) => string;
  updateUniversity: (id: string, updates: Partial<University>) => void;
  addProgram: (prog: Omit<Program, 'id'>) => string;
  updateProgram: (id: string, updates: Partial<Program>) => void;
}

const ApplicationContext = createContext<ApplicationContextType | undefined>(undefined);

export function ApplicationProvider({ children }: { children: ReactNode }) {
  // Start with empty data on first load to show empty states
  // Mock data will only be used if you manually want to see sample data
  const [applications, setApplications] = useState<Application[]>(() => {
    const stored = localStorage.getItem('gradOS_applications');
    if (stored) return JSON.parse(stored);
    // Check if this is first time - if so, use empty array
    const isFirstTime = !localStorage.getItem('gradOS_initialized');
    if (isFirstTime) {
      localStorage.setItem('gradOS_initialized', 'true');
      return [];
    }
    return mockApplications;
  });

  const [universities, setUniversities] = useState<University[]>(() => {
    const stored = localStorage.getItem('gradOS_universities');
    if (stored) return JSON.parse(stored);
    const isFirstTime = !localStorage.getItem('gradOS_initialized');
    return isFirstTime ? [] : mockUniversities;
  });

  const [programs, setPrograms] = useState<Program[]>(() => {
    const stored = localStorage.getItem('gradOS_programs');
    if (stored) return JSON.parse(stored);
    const isFirstTime = !localStorage.getItem('gradOS_initialized');
    return isFirstTime ? [] : mockPrograms;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('gradOS_applications', JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem('gradOS_universities', JSON.stringify(universities));
  }, [universities]);

  useEffect(() => {
    localStorage.setItem('gradOS_programs', JSON.stringify(programs));
  }, [programs]);

  const addUniversity = (uni: Omit<University, 'id'>): string => {
    const id = `uni-${Date.now()}`;
    const newUni = { ...uni, id };
    setUniversities(prev => [...prev, newUni]);
    return id;
  };

  const addProgram = (prog: Omit<Program, 'id'>): string => {
    const id = `prog-${Date.now()}`;
    const newProg = { ...prog, id };
    setPrograms(prev => [...prev, newProg]);
    return id;
  };

  const addApplication = (app: Omit<Application, 'id'>) => {
    const id = `app-${Date.now()}`;
    const newApp = { ...app, id };
    setApplications(prev => [...prev, newApp]);
  };

  const updateApplication = (id: string, updates: Partial<Application>) => {
    setApplications(prev =>
      prev.map(app => (app.id === id ? { ...app, ...updates } : app))
    );
  };

  const deleteApplication = (id: string) => {
    setApplications(prev => prev.filter(app => app.id !== id));
  };

  const updateUniversity = (id: string, updates: Partial<University>) => {
    setUniversities(prev =>
      prev.map(uni => (uni.id === id ? { ...uni, ...updates } : uni))
    );
  };

  const updateProgram = (id: string, updates: Partial<Program>) => {
    setPrograms(prev =>
      prev.map(prog => (prog.id === id ? { ...prog, ...updates } : prog))
    );
  };

  return (
    <ApplicationContext.Provider
      value={{
        applications,
        universities,
        programs,
        addApplication,
        updateApplication,
        deleteApplication,
        addUniversity,
        updateUniversity,
        addProgram,
        updateProgram,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplications() {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error('useApplications must be used within ApplicationProvider');
  }
  return context;
}
