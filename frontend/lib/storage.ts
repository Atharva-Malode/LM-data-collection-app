import { PatientRecord } from './types';

const STORAGE_KEY = 'biocare_patients';

export const storage = {
  getPatients: (): PatientRecord[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse patients from local storage', e);
      return [];
    }
  },

  getPatient: (id: string): PatientRecord | undefined => {
    const patients = storage.getPatients();
    return patients.find(p => p.id === id);
  },

  savePatient: (patient: PatientRecord): void => {
    const patients = storage.getPatients();
    const existingIndex = patients.findIndex(p => p.id === patient.id);
    
    if (existingIndex >= 0) {
      patients[existingIndex] = patient;
    } else {
      patients.push(patient);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  },

  deletePatient: (id: string): void => {
    const patients = storage.getPatients();
    const filtered = patients.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
};
