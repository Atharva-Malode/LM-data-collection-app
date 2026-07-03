export type HandSide = 'Right' | 'Left';

export type FingerName =
  | 'Right Thumb' | 'Right Index' | 'Right Middle' | 'Right Ring' | 'Right Little'
  | 'Left Thumb' | 'Left Index' | 'Left Middle' | 'Left Ring' | 'Left Little';

export type Pattern = 'Whorl' | 'Loop' | 'Arch' | '';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasPoint {
  x: number;
  y: number;
  type: 'core' | 'delta';
}

export interface FingerData {
  image: string | null;
  pattern: Pattern;
  subPattern: string;
  core: Point | null;
  delta: Point | null;
  ridgeManual1: string;
  ridgeManual2: string;
  ridgeAuto: string;
  saved: boolean;
}

// Full patient record
export interface PatientRecord {
  id: string;
  
  // Basic Details
  patientName: string;
  age: string;
  gender: string;
  bloodGroup: string;
  group: string;
  birthDate: string;
  phoneNumber: string;
  address: string;
  
  // Additional Info
  smoking: string;
  alcoholConsumption: string;
  medicalCondition: string; // From new-patient, diabetes/etc in edit
  chewingHabit: string;
  allergies: string;
  notes: string;
  
  // Used in search & details views
  caseNumber?: string;
  agency?: string;
  captureDate: string;
  
  // Fingerprints
  fingerprintData: Record<string, FingerData>; // keyed by FingerName or ID
}
