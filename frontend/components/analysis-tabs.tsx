'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CanvasEditor } from './canvas-editor';
import type { CanvasPoint } from './canvas-editor';
import { api } from '@/lib/api';
import { SUB_PATTERNS } from '@/lib/constants';

interface FingerprintData {
  fingerName: string;
  fingerId: string;
  image?: string;
  corePoints: CanvasPoint[];
  deltaPoints: CanvasPoint[];
  ridgeCount?: string;
  pattern?: string;
  subPattern?: string;
}

interface AnalysisTabsProps {
  fingerprints: FingerprintData[];
  onFingerprintChange: (index: number, data: Partial<FingerprintData>) => void;
  readOnly?: boolean;
}

export function AnalysisTabs({
  fingerprints,
  onFingerprintChange,
  readOnly = false,
}: AnalysisTabsProps) {
  const [activeTab, setActiveTab] = useState(fingerprints[0]?.fingerId || 'thumb');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fingerprint Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full gap-1" style={{ gridTemplateColumns: `repeat(${fingerprints.length}, 1fr)` }}>
            {fingerprints.map((fp) => (
              <TabsTrigger key={fp.fingerId} value={fp.fingerId} className="text-xs md:text-sm">
                {fp.fingerName}
              </TabsTrigger>
            ))}
          </TabsList>

          {fingerprints.map((fingerprint, index) => (
            <TabsContent key={fingerprint.fingerId} value={fingerprint.fingerId} className="space-y-4">
              <CanvasEditor
                fingerId={fingerprint.fingerId}
                initialImage={fingerprint.image}
                points={[
                  ...fingerprint.corePoints.map(p => ({ ...p, type: 'core' as const })),
                  ...fingerprint.deltaPoints.map(p => ({ ...p, type: 'delta' as const })),
                ]}
                onPointsChange={(points) => {
                  const corePoints = points.filter(p => p.type === 'core');
                  const deltaPoints = points.filter(p => p.type === 'delta');
                  
                  // Recalculate ridge count if both points are placed
                  if (fingerprint.image && corePoints[0] && deltaPoints[0]) {
                    // Convert canvas pixels (0-500, 0-600) to percentage (0-100) for the API
                    const core_x = Math.round((corePoints[0].x / 500) * 100);
                    const core_y = Math.round((corePoints[0].y / 600) * 100);
                    const delta_x = Math.round((deltaPoints[0].x / 500) * 100);
                    const delta_y = Math.round((deltaPoints[0].y / 600) * 100);
                    
                    api.predictRidgeCount(fingerprint.image, { core_x, core_y, delta_x, delta_y })
                      .then(res => {
                        onFingerprintChange(index, { 
                          corePoints, 
                          deltaPoints, 
                          ridgeCount: String(res.ridge_count) 
                        });
                      })
                      .catch(err => {
                        console.error("Failed to recalculate ridge count", err);
                        onFingerprintChange(index, { 
                          corePoints, 
                          deltaPoints, 
                          ridgeCount: "Error: Ridge count failed" 
                        });
                      });
                  } else {
                    onFingerprintChange(index, { 
                      corePoints, 
                      deltaPoints, 
                      ridgeCount: "Error: Core/Delta not detected" 
                    });
                  }
                }}
              />

              {!readOnly && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-blue-800 font-bold">
                    Analysis Summary:
                  </p>
                  <div className="text-xs text-blue-700 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-24 inline-block font-medium text-blue-800">Pattern:</span>
                      <select
                        value={fingerprint.pattern || ''}
                        onChange={(e) => {
                          onFingerprintChange(index, { pattern: e.target.value, subPattern: '' });
                        }}
                        className="bg-white border border-blue-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                      >
                        <option value="">Select Pattern</option>
                        <option value="Whorl">Whorl</option>
                        <option value="Loop">Loop</option>
                        <option value="Arch">Arch</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-24 inline-block font-medium text-blue-800">Sub Pattern:</span>
                      <select
                        value={fingerprint.subPattern || ''}
                        disabled={!fingerprint.pattern}
                        onChange={(e) => {
                          onFingerprintChange(index, { subPattern: e.target.value });
                        }}
                        className="bg-white border border-blue-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 disabled:opacity-50"
                      >
                        <option value="">Select Sub Pattern</option>
                        {((fingerprint.pattern ? SUB_PATTERNS[fingerprint.pattern] : []) || []).map(sp => (
                          <option key={sp} value={sp}>{sp}</option>
                        ))}
                      </select>
                    </div>

                    <p>
                      <span className="w-24 inline-block font-medium text-blue-800">Core Point:</span> 
                      <span className="font-semibold">{fingerprint.corePoints[0] ? `(${Math.round(fingerprint.corePoints[0].x / 5)}%, ${Math.round(fingerprint.corePoints[0].y / 6)}%)` : 'Not placed'}</span>
                    </p>

                    <p>
                      <span className="w-24 inline-block font-medium text-blue-800">Delta Point:</span> 
                      <span className="font-semibold">{fingerprint.deltaPoints[0] ? `(${Math.round(fingerprint.deltaPoints[0].x / 5)}%, ${Math.round(fingerprint.deltaPoints[0].y / 6)}%)` : 'Not placed'}</span>
                    </p>

                    <div className="flex items-center gap-2">
                      <span className="w-24 inline-block font-medium text-blue-800">Ridge Count:</span>
                      <input
                        type="text"
                        value={fingerprint.ridgeCount || ''}
                        onChange={(e) => {
                          onFingerprintChange(index, { ridgeCount: e.target.value });
                        }}
                        className="bg-white border border-blue-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                        placeholder="e.g. 12"
                      />
                    </div>
                  </div>
                </div>
              )}

              {readOnly && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">Analysis Data</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Pattern: {fingerprint.pattern || '—'}</p>
                    <p>Sub Pattern: {fingerprint.subPattern || '—'}</p>
                    <p>Core Points: {fingerprint.corePoints.length}</p>
                    <p>Delta Points: {fingerprint.deltaPoints.length}</p>
                    <p>Ridge Count (Auto): {fingerprint.ridgeCount || '—'}</p>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
