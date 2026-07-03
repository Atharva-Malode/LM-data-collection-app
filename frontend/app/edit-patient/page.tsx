'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Fingerprint } from 'lucide-react';
import { storage } from '@/lib/storage';
import { api } from '@/lib/api';
import { PatientRecord } from '@/lib/types';
import Link from 'next/link';

export default function EditPatientSearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<PatientRecord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    api.searchPatients()
      .then(res => {
        const mapped = res.map(p => ({
          id: p.uuid,
          patientName: p.name,
          phoneNumber: p.phone,
          age: '',
        }));
        setPatients(mapped as any);
      })
      .catch(err => {
        console.error('Failed to fetch patients from backend, falling back to local storage', err);
        setPatients(storage.getPatients());
      });
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setActiveIndex(-1);
    if (query.trim().length > 0) {
      try {
        const res = await api.searchPatients(query);
        const mapped = res.map(p => ({
          id: p.uuid,
          patientName: p.name,
          phoneNumber: p.phone,
          age: '',
        }));
        setFilteredSuggestions(mapped as any);
        setShowSuggestions(true);
      } catch (err) {
        console.error(err);
        const filtered = patients.filter(p =>
          p.patientName.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredSuggestions(filtered);
        setShowSuggestions(true);
      }
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectPatient = (patientId: string) => {
    router.push(`/edit-patient/details?id=${patientId}`);
  };

  const handleFindPatient = () => {
    if (searchQuery.trim().length > 0 && filteredSuggestions.length > 0) {
      const selectedId = activeIndex >= 0 ? filteredSuggestions[activeIndex].id : filteredSuggestions[0].id;
      handleSelectPatient(selectedId);
    } else {
      alert('Please select a patient from the suggestions');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedIdx = activeIndex >= 0 ? activeIndex : 0;
      const patient = filteredSuggestions[selectedIdx];
      if (patient) {
        setSearchQuery(patient.patientName);
        setShowSuggestions(false);
        handleSelectPatient(patient.id);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <Fingerprint className="w-5 h-5 text-primary" />
            <div>
              <h1 className="font-bold text-sm text-foreground leading-none">Data Collection Application</h1>
              <p className="text-[10px] text-muted-foreground">Patient Search</p>
            </div>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Edit Patient</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-card rounded-lg border border-border shadow-md p-8">
          <h2 className="text-xl font-bold text-foreground mb-6">Search Patient Records</h2>

          {patients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No patient records found</p>
              <p className="text-sm text-muted-foreground">Create a new patient record first</p>
              <button
                onClick={() => router.push('/new-patient')}
                className="mt-6 px-6 py-2 bg-primary text-white rounded-lg"
              >
                Go to New Patient
              </button>
            </div>
          ) : (
            <div>
              <div className="relative mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => searchQuery.trim().length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Search patient name..."
                    className="w-full pl-12 pr-4 py-3 border border-border rounded-lg text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Dropdown Suggestions */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                    {filteredSuggestions.map((patient, index) => (
                      <button
                        key={patient.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchQuery(patient.patientName);
                          setShowSuggestions(false);
                          handleSelectPatient(patient.id);
                        }}
                        className={`w-full px-4 py-3 text-left transition-colors border-b border-border last:border-b-0 text-foreground ${
                          index === activeIndex ? 'bg-muted border-l-4 border-l-primary' : 'hover:bg-muted'
                        }`}
                      >
                        <div className="font-medium">{patient.patientName}</div>
                        <div className="text-sm text-muted-foreground">Age: {patient.age || 'N/A'}</div>
                      </button>
                    ))}
                  </div>
                )}

                {showSuggestions && searchQuery.trim().length > 0 && filteredSuggestions.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 p-4 text-center">
                    <p className="text-muted-foreground text-sm">No patients found</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleFindPatient}
                disabled={filteredSuggestions.length === 0}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit Patient Record
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
