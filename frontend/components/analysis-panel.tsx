'use client';

import { useState } from 'react';
import { Fingerprint, ZoomIn, ZoomOut, Save, Check } from 'lucide-react';
import { SUB_PATTERNS } from '@/lib/constants';
import { FingerName, FingerData, Pattern } from '@/lib/types';



const ANALYSIS_TABS = ['Pattern', 'Sub Pattern', 'Select Core', 'Select Delta', 'Ridges', 'Save'];
const inputCls = "w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors";
const selectCls = inputCls + " cursor-pointer";

export function AnalysisPanel({
  finger, data, image, onChange, onSave, activeTab, onTabChange,
}: {
  finger: FingerName;
  data: FingerData;
  image: string;
  onChange: (d: Partial<FingerData>) => void;
  onSave: () => void;
  activeTab: number;
  onTabChange: (tab: number) => void;
}) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>, mode: 'core' | 'delta') => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    if (mode === 'core') onChange({ core: { x, y } });
    else onChange({ delta: { x, y } });
  };

  const handleSave = () => { onSave(); setShowSuccess(true); setTimeout(() => setShowSuccess(false), 3000); };
  const isPointMode = activeTab === 2 || activeTab === 3;

  return (
    <div className="flex flex-col h-full gap-2 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Fingerprint className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">{finger}</span>
        {data.saved && <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-1.5 py-0.5 rounded-full">Saved</span>}
      </div>

      {/* Fingerprint preview */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        {isPointMode && (
          <div className="flex gap-1.5 self-start">
            <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-muted rounded hover:bg-muted/70 transition-colors">
              <ZoomIn className="w-3 h-3" /> In
            </button>
            <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-muted rounded hover:bg-muted/70 transition-colors">
              <ZoomOut className="w-3 h-3" /> Out
            </button>
            <span className="text-[10px] text-muted-foreground self-center">{Math.round(zoom * 100)}%</span>
          </div>
        )}
        <div
          className={`relative overflow-auto rounded-xl border-2 bg-slate-50 dark:bg-slate-900 shadow-md ${isPointMode ? 'border-primary/50 cursor-crosshair' : 'border-border'}`}
          style={{ width: '100%', maxHeight: isPointMode ? 200 : 160 }}
          onClick={isPointMode ? (e) => handleImageClick(e, activeTab === 2 ? 'core' : 'delta') : undefined}
        >
          <div style={{ transform: `scale(${isPointMode ? zoom : 1})`, transformOrigin: 'top left', width: isPointMode ? `${100 / zoom}%` : '100%' }}>
            <img src={image} alt={finger} className="w-full h-auto block object-contain" style={{ maxHeight: isPointMode ? 200 : 160 }} />
            {data.core && (activeTab === 2 || activeTab === 5) && (
              <div className="absolute pointer-events-none" style={{ left: `${data.core.x}%`, top: `${data.core.y}%`, transform: 'translate(-50%,-50%)' }}>
                <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-lg" />
              </div>
            )}
            {data.delta && (activeTab === 3 || activeTab === 5) && (
              <div className="absolute pointer-events-none" style={{ left: `${data.delta.x}%`, top: `${data.delta.y}%`, transform: 'translate(-50%,-50%)' }}>
                <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
              </div>
            )}
          </div>
        </div>
        {isPointMode && (
          <p className="text-[10px] text-muted-foreground">
            {activeTab === 2
              ? `Click to place ${data.core ? `Core → (${data.core.x}, ${data.core.y})` : 'CORE point'}`
              : `Click to place ${data.delta ? `Delta → (${data.delta.x}, ${data.delta.y})` : 'DELTA point'}`}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 flex-shrink-0">
        {ANALYSIS_TABS.map((tab, i) => (
          <button key={tab} onClick={() => onTabChange(i)}
            className={`px-2 py-1.5 text-[11px] font-medium rounded-lg transition-colors text-center ${
              activeTab === i ? 'bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto bg-muted/30 rounded-xl p-3 border border-border min-h-0">

        {activeTab === 0 && (
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pattern Type</label>
            <select className={selectCls} value={data.pattern}
              onChange={e => onChange({ pattern: e.target.value as Pattern, subPattern: '' })}>
              <option value="">Select Pattern</option>
              <option>Whorl</option><option>Loop</option><option>Arch</option>
            </select>
            {data.pattern && (
              <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-xs text-primary font-medium">Selected: {data.pattern}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 1 && (
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sub Pattern</label>
            {!data.pattern
              ? <p className="text-xs text-muted-foreground">Select a pattern first.</p>
              : <select className={selectCls} value={data.subPattern}
                  onChange={e => onChange({ subPattern: e.target.value })}>
                  <option value="">Select Sub Pattern</option>
                  {SUB_PATTERNS[data.pattern]?.map(sp => <option key={sp}>{sp}</option>)}
                </select>}
          </div>
        )}

        {activeTab === 2 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground">Click the fingerprint above to place the <span className="text-red-500 font-semibold">CORE</span> point.</p>
            {data.core
              ? <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">Core placed at ({data.core.x}, {data.core.y})</p>
                </div>
              : <div className="p-2 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">No core point set yet.</p></div>}
          </div>
        )}

        {activeTab === 3 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground">Click the fingerprint above to place the <span className="text-blue-500 font-semibold">DELTA</span> point.</p>
            {data.delta
              ? <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Delta placed at ({data.delta.x}, {data.delta.y})</p>
                </div>
              : <div className="p-2 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">No delta point set yet.</p></div>}
          </div>
        )}

        {activeTab === 4 && (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Manual Ridge Count</label>
              <input type="number" className={inputCls + ' mt-1'} placeholder="0"
                value={data.ridgeManual1} onChange={e => onChange({ ridgeManual1: e.target.value })} />
            </div>
            <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Auto Ridge Count</p>
              <p className="text-lg font-bold text-primary">{data.ridgeAuto || '—'}</p>
              <p className="text-[10px] text-muted-foreground">From scanned image</p>
            </div>
            {data.ridgeManual1 && (
              <div className="p-2 bg-muted rounded-lg text-xs">
                <span>Manual: <strong>{data.ridgeManual1}</strong></span>
              </div>
            )}
          </div>
        )}

        {activeTab === 5 && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {[
                ['Pattern', data.pattern || '—'],
                ['Sub Pattern', data.subPattern || '—'],
                ['Core', data.core ? `(${data.core.x}, ${data.core.y})` : '—'],
                ['Delta', data.delta ? `(${data.delta.x}, ${data.delta.y})` : '—'],
                ['Ridge Count', data.ridgeManual1 || '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-background rounded-lg p-1.5 border border-border">
                  <p className="text-muted-foreground text-[10px]">{k}</p>
                  <p className="font-medium text-foreground truncate">{v}</p>
                </div>
              ))}
            </div>
            <button onClick={handleSave}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
              <Save className="w-3.5 h-3.5" /> Save Fingerprint Data
            </button>
            {showSuccess && (
              <div className="flex items-center gap-1.5 p-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                <Check className="w-3.5 h-3.5 text-green-600" />
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">Saved successfully!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
