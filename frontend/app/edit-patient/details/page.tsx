'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Trash2, Save, ArrowLeft, Fingerprint, Loader2 } from 'lucide-react';
import { storage } from '@/lib/storage';
import { api } from '@/lib/api';
import { PatientRecord } from '@/lib/types';
import { PatientForm } from '@/components/patient-form';
import { AnalysisTabs } from '@/components/analysis-tabs';
import Link from 'next/link';

function EditPatientDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get('id') as string;

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [formData, setFormData] = useState<Partial<PatientRecord>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fingerprints, setFingerprints] = useState<any[]>([]);

  const setupPatientData = (record: PatientRecord) => {
    setPatient(record);
    setFormData(record);

    const fps = Object.entries(record.fingerprintData || {}).map(([fingerName, data]) => {
      // Convert stored percentage (0-100) to CanvasEditor pixels (500 width, 600 height)
      const corePoints = data.core ? [{ x: (data.core.x / 100) * 500, y: (data.core.y / 100) * 600, type: 'core' as const }] : [];
      const deltaPoints = data.delta ? [{ x: (data.delta.x / 100) * 500, y: (data.delta.y / 100) * 600, type: 'delta' as const }] : [];

      return {
        fingerName: fingerName,
        fingerId: fingerName.toLowerCase().replace(/\s+/g, '-'),
        image: data.image || undefined,
        corePoints,
        deltaPoints,
        ridgeCount: data.ridgeManual1 || data.ridgeAuto || '',
        pattern: data.pattern || '',
        subPattern: data.subPattern || '',
      };
    });
    setFingerprints(fps);
  };

  useEffect(() => {
    if (!patientId) return;
    api.getPatient(patientId)
      .then(record => {
        setupPatientData(record);
      })
      .catch(err => {
        console.error('Failed to get patient from backend, checking local storage', err);
        const found = storage.getPatient(patientId);
        if (found) {
          setupPatientData(found);
        }
      });
  }, [patientId]);

  const handleUpdate = async () => {
    setIsUpdating(true);

    if (patient) {
      const updatedFingerData = { ...patient.fingerprintData };

      fingerprints.forEach(fp => {
        const origKey = Object.keys(updatedFingerData).find(k => k.toLowerCase().replace(/\s+/g, '-') === fp.fingerId);
        if (origKey) {
          updatedFingerData[origKey] = {
            ...updatedFingerData[origKey],
            // Convert canvas pixels back to percentages (0-100) for storage
            core: fp.corePoints[0] ? { x: Math.round((fp.corePoints[0].x / 500) * 100), y: Math.round((fp.corePoints[0].y / 600) * 100) } : null,
            delta: fp.deltaPoints[0] ? { x: Math.round((fp.deltaPoints[0].x / 500) * 100), y: Math.round((fp.deltaPoints[0].y / 600) * 100) } : null,
            ridgeAuto: fp.ridgeCount || '',
            ridgeManual1: fp.ridgeCount && !fp.ridgeCount.startsWith("Error") ? fp.ridgeCount : '',
            pattern: fp.pattern || '',
            subPattern: fp.subPattern || '',
          };
        }
      });

      const updatedPatient: PatientRecord = {
        ...(patient as PatientRecord),
        ...formData,
        fingerprintData: updatedFingerData,
      };

      try {
        await api.updatePatient(patientId, updatedPatient);
        await new Promise(resolve => setTimeout(resolve, 1200));
        router.push('/');
      } catch (err) {
        console.error(err);
        alert('Failed to update patient on backend. Saving locally as fallback.');
        storage.savePatient(updatedPatient);
        router.push('/');
      }
    }

    setIsUpdating(false);
  };

  const handleDelete = async () => {
    try {
      await api.deletePatient(patientId);
      router.push('/edit-patient');
    } catch (err) {
      console.error(err);
      alert('Failed to delete patient on backend. Deleting locally.');
      storage.deletePatient(patientId);
      router.push('/edit-patient');
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="mb-4">Loading or patient not found...</p>
        <Link href="/edit-patient" className="text-primary hover:underline">
          Return to Search
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-70 transition-opacity shrink-0"
            >
              <Fingerprint className="w-6 h-6 text-primary" />
              <div>
                <h1 className="font-bold text-sm text-foreground leading-none">Data Collection Application</h1>
                <p className="text-[10px] text-muted-foreground">Patient Details</p>
              </div>
            </Link>
            <div className="h-6 w-px bg-border hidden md:block" />
            <Link href="/edit-patient" className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 text-xs font-semibold">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Search
            </Link>
          </div>
          <div className="flex justify-between items-center gap-4 flex-1 md:flex-initial">
            <h1 className="text-xl font-bold text-foreground hidden lg:block">Edit Patient Details</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-destructive text-destructive rounded-lg text-xs font-semibold hover:bg-destructive/10 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side - Patient Form */}
        <div className="h-full overflow-y-auto w-[300px] border-r border-border p-4 bg-card/30">
          <PatientForm
            data={formData}
            onChange={(patch) => setFormData(prev => ({ ...prev, ...patch }))}
          />
        </div>

        {/* Right Side - Fingerprint Analysis Tabs */}
        <div className="flex-1 h-full overflow-y-auto p-6">
          {fingerprints.length > 0 ? (
            <AnalysisTabs
              fingerprints={fingerprints}
              onFingerprintChange={(idx, data) => {
                const updated = [...fingerprints];
                updated[idx] = { ...updated[idx], ...data };
                setFingerprints(updated);
              }}
            />
          ) : (
            <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
              No fingerprint data recorded for this patient.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl p-8 max-w-sm mx-auto border border-border">
            <h3 className="text-xl font-bold text-foreground mb-4">Delete Patient Record</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this patient record? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-3 bg-destructive text-white rounded-lg font-medium hover:bg-destructive/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Visual Save Confirmation Overlay */}
      {isUpdating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4 transition-all duration-300">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <h2 className="text-xl font-bold text-foreground">Your data is successfully being saved...</h2>
          <p className="text-sm text-muted-foreground">Syncing patient profiles and search index spreadsheet</p>
        </div>
      )}
    </main>
  );
}

export default function EditPatientDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="mb-4">Loading patient details...</p>
      </div>
    }>
      <EditPatientDetailsContent />
    </Suspense>
  );
}
