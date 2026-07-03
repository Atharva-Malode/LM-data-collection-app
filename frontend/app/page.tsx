
'use client';

import Link from 'next/link';
import { Fingerprint } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center px-4">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-4">
            <Fingerprint className="w-12 h-12 text-primary" />
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-2">
            FING
          </h1>

          <p className="text-lg text-muted-foreground">
            Data Collection Application
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* New Patient Card */}
          <Link
            href="/new-patient"
            className="group relative bg-card rounded-lg shadow-md hover:shadow-2xl transition-all duration-300 p-10 cursor-pointer border border-border overflow-hidden h-full block"
          >
            {/* Fingerprint Background */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path
                  d="M50 10 Q 70 20 70 40 Q 70 60 50 70 Q 30 60 30 40 Q 30 20 50 10"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="40"
                  r="3"
                  fill="currentColor"
                />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Fingerprint className="w-8 h-8 text-primary" />
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-3">
                New Patient
              </h2>

              <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                Start a new fingerprint collection and patient intake process
              </p>

              <div className="inline-flex px-6 py-3 bg-primary text-white rounded-lg font-medium group-hover:bg-secondary transition-colors">
                Begin Scan
              </div>
            </div>
          </Link>

          {/* Edit Patient Card */}
          <Link
            href="/edit-patient"
            className="group relative bg-card rounded-lg shadow-md hover:shadow-2xl transition-all duration-300 p-10 cursor-pointer border border-border overflow-hidden h-full block"
          >
            {/* Fingerprint Background */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path
                  d="M50 10 Q 70 20 70 40 Q 70 60 50 70 Q 30 60 30 40 Q 30 20 50 10"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="40"
                  r="3"
                  fill="currentColor"
                />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Fingerprint className="w-8 h-8 text-accent" />
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-3">
                Edit Patient
              </h2>

              <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                Search and modify existing patient records and fingerprint data
              </p>

              <div className="inline-flex px-6 py-3 bg-accent text-white rounded-lg font-medium group-hover:bg-primary transition-colors">
                Search & Edit
              </div>
            </div>
          </Link>

        </div>
      </div>
    </main>
  );
}



