'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Fingerprint, Edit, User, Calendar, Phone, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { PatientRecord } from '@/lib/types';
import Link from 'next/link';

export default function EditPatientSearchPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const res = await api.searchPatients();
      const mapped = res.map((p: any) => ({
        id: p.uuid,
        patientName: p.name || 'N/A',
        age: p.age_group || '',
        gender: p.gender || '',
        phoneNumber: p.phone || '',
        group: p.group || '',
        status: p.status || 'IN_PROGRESS',
        // Add more fields as needed
      }));
      setPatients(mapped as any);
      setFilteredPatients(mapped as any);
    } catch (err) {
      console.error('Failed to fetch patients from backend, falling back to local storage', err);
      // Fallback if needed (storage.getPatients())
      setPatients([]);
      setFilteredPatients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredPatients(patients);
      return;
    }
    const q = query.toLowerCase().trim();
    const filtered = patients.filter(p =>
      p.patientName.toLowerCase().includes(q) ||
      p.phoneNumber.toLowerCase().includes(q) ||
      (p.group || '').toLowerCase().includes(q)
    );
    setFilteredPatients(filtered);
  };

  const handleEdit = (patientId: string) => {
    router.push(`/edit-patient/details?id=${patientId}`);
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <Fingerprint className="w-5 h-5 text-primary" />
            <div>
              <h1 className="font-bold text-sm text-foreground leading-none">Data Collection Application</h1>
              <p className="text-[10px] text-muted-foreground">Patient Management</p>
            </div>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Edit Patient Records</h1>
          <Link
            href="/new-patient"
            className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            New Patient
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Search Bar */}
          <div className="p-6 border-b border-border">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name, phone, or group..."
                className="w-full pl-12 pr-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Total records: {patients.length}</p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading patient records...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No patients found</p>
                <button
                  onClick={() => router.push('/new-patient')}
                  className="mt-6 px-6 py-2 bg-primary text-white rounded-lg text-sm"
                >
                  Create New Patient
                </button>
              </div>
            ) : (
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Patient ID</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Age Group</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Group</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-muted/50 transition-colors group">
                      <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                        {patient.id?.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{patient.patientName}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {patient.age || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          patient.gender === 'Male' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 
                          patient.gender === 'Female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' : 
                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {patient.gender || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                        {patient.phoneNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-xs font-semibold rounded-md">
                          {patient.group || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                          patient.status === 'IN_PROGRESS' 
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' 
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
                        }`}>
                          {patient.status || 'IN_PROGRESS'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(patient.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-sm font-medium transition-all active:scale-[0.985]"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {filteredPatients.length > 0 && (
            <div className="px-6 py-4 border-t border-border text-xs text-muted-foreground flex items-center justify-between bg-muted/30">
              <div>Showing {filteredPatients.length} of {patients.length} patients</div>
              <button 
                onClick={loadPatients}
                className="text-primary hover:underline text-xs flex items-center gap-1"
              >
                ↻ Refresh
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}