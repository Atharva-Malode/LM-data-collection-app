import { PatientRecord, FingerData, Pattern } from './types';

const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:8000';
  return window.location.port === '3000' ? 'http://localhost:8000' : '';
};

const API_BASE_URL = getApiBaseUrl();

export const api = {
  async savePatient(patient: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/patient/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient),
    });
    if (!res.ok) throw new Error(`Failed to save patient: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async updatePatient(uuid: string, patient: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/patient/${uuid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient),
    });
    if (!res.ok) throw new Error(`Failed to update patient: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async deletePatient(uuid: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/patient/${uuid}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete patient: ${res.statusText}`);
  },

  async searchPatients(name?: string, phone?: string, patientId?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (phone) params.append('phone', phone);
    if (patientId) params.append('patient_id', patientId);
    
    const res = await fetch(`${API_BASE_URL}/patient/search?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to search patients: ${res.statusText}`);
    const data = await res.json();
    return data.data || [];
  },

  async getPatient(uuid: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/patient/${uuid}`);
    if (!res.ok) throw new Error(`Failed to get patient: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async predictPattern(imageDataUrl: string): Promise<{ pattern: Pattern; confidence: number }> {
    const res = await fetch(`${API_BASE_URL}/predict-pattern`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataUrl }),
    });
    if (!res.ok) throw new Error(`Pattern prediction failed: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async predictCoreDelta(imageDataUrl: string): Promise<{ core_x: number | null; core_y: number | null; delta_x: number | null; delta_y: number | null }> {
    const res = await fetch(`${API_BASE_URL}/predict-core-delta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataUrl }),
    });
    if (!res.ok) throw new Error(`Core/delta detection failed: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },

  async predictRidgeCount(
    imageDataUrl: string,
    coords?: { core_x: number; core_y: number; delta_x: number; delta_y: number }
  ): Promise<{ ridge_count: number }> {
    const res = await fetch(`${API_BASE_URL}/predict-ridge-count`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataUrl, ...coords }),
    });
    if (!res.ok) throw new Error(`Ridge counting failed: ${res.statusText}`);
    const data = await res.json();
    return data.data;
  },
};
