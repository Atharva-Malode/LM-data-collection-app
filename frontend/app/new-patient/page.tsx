'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Fingerprint, Upload, Scan, Camera, Check, X,
  ZoomIn, ZoomOut, Save, ChevronRight, Loader2,
  AlertCircle, CheckCircle, Trash2
} from 'lucide-react';
import { FingerName, FingerData, HandSide, PatientRecord } from '@/lib/types';
import { storage } from '@/lib/storage';
import { api } from '@/lib/api';
import { PatientForm } from '@/components/patient-form';
import { getFpSvg } from '@/components/capture';
import { FINGERS } from '@/lib/constants';
import { useFingerprintAnalysis } from '@/hooks/use-fingerprint-analysis';
import { InlineCameraView } from '@/components/inline-camera-view';
import { PointModePill } from '@/components/point-mode-pill';
import type { PointMode } from '@/components/point-mode-pill';
import { FingerprintAnalysisForm } from '@/components/fingerprint-analysis-form';

export default function NewPatientPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captureMode, setCaptureMode] = useState<'scan' | 'camera'>('scan');
  const [selectedFingerIdx, setSelectedFingerIdx] = useState(0);
  const [pointMode, setPointMode] = useState<PointMode>('none');
  const [zoom, setZoom] = useState(1);
  const [patientData, setPatientData] = useState<Partial<PatientRecord>>({});
  const [saveFlash, setSaveFlash] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { analyze, analyzing } = useFingerprintAnalysis();

  const selectedFinger = FINGERS[selectedFingerIdx];

  const [fingerData, setFingerData] = useState<Record<FingerName, FingerData>>(
    () =>
      Object.fromEntries(
        FINGERS.map(f => [
          f,
          {
            image: null,
            pattern: '',
            subPattern: '',
            core: null,
            delta: null,
            ridgeManual1: '',
            ridgeManual2: '',
            ridgeAuto: '',
            saved: false,
          },
        ])
      ) as Record<FingerName, FingerData>
  );

  const updateFinger = (finger: FingerName, patch: Partial<FingerData>) =>
    setFingerData(prev => ({ ...prev, [finger]: { ...prev[finger], ...patch } }));

  // Automatically reset scanner active state on finger/mode changes
  useEffect(() => {
    setIsScanningActive(false);
    setScannerImage(null);
  }, [selectedFinger, captureMode]);

  // Automatically recalculate the ridge count in real time as the core/delta points change
  useEffect(() => {
    const data = fingerData[selectedFinger];
    if (data.image && data.core && data.delta) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.predictRidgeCount(data.image!, {
            core_x: data.core!.x,
            core_y: data.core!.y,
            delta_x: data.delta!.x,
            delta_y: data.delta!.y,
          });
          if (data.ridgeAuto !== String(res.ridge_count)) {
            updateFinger(selectedFinger, { ridgeAuto: String(res.ridge_count) });
          }
        } catch (err) {
          console.error("Failed to recalculate ridge count", err);
          if (data.ridgeAuto !== "Error: Ridge count failed") {
            updateFinger(selectedFinger, { ridgeAuto: "Error: Ridge count failed" });
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (data.image && (!data.core || !data.delta)) {
      if (data.ridgeAuto !== "Error: Core/Delta not detected") {
        updateFinger(selectedFinger, { ridgeAuto: "Error: Core/Delta not detected" });
      }
    }
  }, [
    selectedFinger,
    fingerData[selectedFinger].core?.x,
    fingerData[selectedFinger].core?.y,
    fingerData[selectedFinger].delta?.x,
    fingerData[selectedFinger].delta?.y,
    fingerData[selectedFinger].image
  ]);

  // Scanner WebSockets and preview streaming state (defined below fingerData state)
  const [scannerPhase, setScannerPhase] = useState<'connecting' | 'previewing' | 'frozen' | 'error'>('connecting');
  const [scannerImage, setScannerImage] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState('');
  const scannerSocketRef = useRef<WebSocket | null>(null);
  const scannerImageRef = useRef<string | null>(null);
  scannerImageRef.current = scannerImage;

  // Auto-connect / disconnect preview scanner when in scan mode AND scanning is activated
  useEffect(() => {
    const currentFpData = fingerData[selectedFinger];
    if (captureMode !== 'scan' || currentFpData?.image || !isScanningActive) {
      if (scannerSocketRef.current) {
        scannerSocketRef.current.close();
      }
      setScannerImage(null);
      return;
    }

    setScannerPhase('connecting');
    setScannerError('');
    setScannerImage(null);

    const wsProto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = typeof window !== 'undefined' && window.location.port === '3000' ? 'localhost:8000' : (typeof window !== 'undefined' ? window.location.host : 'localhost:8000');
    const ws = new WebSocket(`${wsProto}//${wsHost}/ws/scanner`);
    scannerSocketRef.current = ws;

    ws.onopen = () => {
      setScannerPhase('previewing');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'preview') {
          setScannerPhase(curr => {
            if (curr === 'previewing') {
              setScannerImage(data.image);
            }
            return curr;
          });
        } else if (data.status === 'error') {
          setScannerPhase('error');
          setScannerError(data.message || 'Scanner error');
          ws.close();
        }
      } catch (err) {
        console.error('Failed to parse socket message:', err);
        setScannerPhase('error');
        setScannerError('Invalid response from scanner server');
        ws.close();
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket connection error:', err);
      setScannerPhase('error');
      setScannerError('Could not connect to scanner server');
    };

    ws.onclose = () => {
      scannerSocketRef.current = null;
    };

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [captureMode, selectedFinger, fingerData[selectedFinger]?.image, isScanningActive]);

  const handleScan = () => {
    if (scannerImageRef.current) {
      setScannerPhase('frozen');
      handleCapture(scannerImageRef.current);

      setTimeout(() => {
        setScannerPhase(curr => {
          if (curr === 'frozen') {
            return 'previewing';
          }
          return curr;
        });
      }, 1500);
    } else {
      setScannerPhase('error');
      setScannerError('No frame available to capture');
    }
  };

  const currentData = fingerData[selectedFinger];
  const currentImage = currentData.image || getFpSvg(selectedFinger);

  // After any capture, fire the AI analysis hook
  const handleCapture = async (img: string) => {
    updateFinger(selectedFinger, { image: img });
    const result = await analyze(img);
    updateFinger(selectedFinger, {
      pattern: result.pattern,
      subPattern: result.subPattern,
      core: result.core,
      delta: result.delta,
      ridgeAuto: result.ridgeAuto,
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const img = ev.target?.result as string;
      await handleCapture(img);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Click on preview image to place core / delta point
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pointMode === 'none') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    if (pointMode === 'core') updateFinger(selectedFinger, { core: { x, y } });
    else updateFinger(selectedFinger, { delta: { x, y } });
  };

  const handleNextFinger = () => {
    updateFinger(selectedFinger, { saved: true });
    setSelectedFingerIdx(i => (i + 1) % FINGERS.length);
    setPointMode('none');
    setZoom(1);
  };

  const handleSaveFinger = () => {
    updateFinger(selectedFinger, { saved: true });
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  const handleComplete = async () => {
    if (!patientData.patientName) {
      alert('Please enter a patient name');
      return;
    }
    setIsSaving(true);
    const uuid = typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : `pat-${Date.now()}`;
    const record = {
      id: patientData.id || uuid,
      patientName: patientData.patientName || '',
      age: patientData.age || '',
      gender: patientData.gender || '',
      bloodGroup: patientData.bloodGroup || '',
      group: patientData.group || 'B',
      birthDate: patientData.birthDate || '',
      phoneNumber: patientData.phoneNumber || '',
      address: patientData.address || '',
      hba1cLevel: patientData.hba1cLevel || '',
      clinicalAttachmentLevel: patientData.clinicalAttachmentLevel || '',
      probingDepth: patientData.probingDepth || '',
      smoking: patientData.smoking || '',
      alcoholConsumption: patientData.alcoholConsumption || '',
      medicalCondition: patientData.medicalCondition || '',
      chewingHabit: patientData.chewingHabit || '',
      allergies: patientData.allergies || '',
      notes: patientData.notes || '',
      captureDate: new Date().toISOString(),
      fingerprintData: fingerData,
    };
    try {
      await api.savePatient(record);
      await new Promise(resolve => setTimeout(resolve, 1200));
      router.push('/');
    } catch (e) {
      console.error(e);
      setIsSaving(false);
      alert('Failed to save patient to backend. Saving locally as fallback.');
      storage.savePatient(record as PatientRecord);
      router.push('/');
    }
  };

  const isPointMode = pointMode !== 'none';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur border-b border-border px-6 py-3 flex items-center gap-3 shadow-sm flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <Fingerprint className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-sm text-foreground leading-none"></h1>
            <p className="text-[10px] text-muted-foreground">New Patient Registration</p>
          </div>
        </Link>
        <div className="ml-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground">System Online</span>
        </div>
      </header>

      {/* ── Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* COL 1 — Patient details form */}
        <PatientForm
          data={patientData}
          onChange={patch => setPatientData(prev => ({ ...prev, ...patch }))}
        />

        {/* COL 2 — Finger tracker */}
        <div className="w-[200px] flex-shrink-0 border-r border-border bg-background overflow-y-auto p-2 space-y-0.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 py-1.5">
            Fingers
          </p>
          {(['Right', 'Left'] as HandSide[]).map(side => (
            <div key={side}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mt-1">
                {side}
              </p>
              {FINGERS.filter(f => f.startsWith(side)).map(finger => {
                const fd = fingerData[finger];
                const isSel = selectedFinger === finger;
                return (
                  <button
                    key={finger}
                    onClick={() => {
                      setSelectedFingerIdx(FINGERS.indexOf(finger));
                      setPointMode('none');
                      setZoom(1);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${isSel
                      ? 'bg-primary/10 border border-primary/30 text-primary'
                      : 'hover:bg-muted text-foreground border border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Fingerprint
                        className={`w-3 h-3 ${isSel ? 'text-primary' : 'text-muted-foreground'}`}
                      />
                      <span className="text-xs font-medium">{finger.replace(`${side} `, '')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {fd.saved && <Check className="w-3 h-3 text-green-500" />}
                      <div
                        className={`w-2 h-2 rounded-full ${fd.image ? 'bg-green-500 shadow-[0_0_4px] shadow-green-400' : 'bg-muted-foreground/25'}`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* COL 3 — Preview + Analysis */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Top: large preview ── */}
          <div className="flex-shrink-0 border-b border-border bg-background p-4 space-y-3">

            {/* Finger label + point mode + zoom */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-primary" />
                {selectedFinger}
                {currentData.saved && (
                  <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                    Saved
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <PointModePill mode={pointMode} onChange={setPointMode} />
                {isPointMode && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                      className="p-1 bg-muted rounded hover:bg-muted/70 transition-colors"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                      className="p-1 bg-muted rounded hover:bg-muted/70 transition-colors"
                    >
                      <ZoomOut className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-muted-foreground w-8 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Preview image */}
            <div
              className={`relative overflow-auto rounded-xl border-2 bg-slate-50 dark:bg-slate-900 shadow-md transition-colors ${pointMode === 'core'
                ? 'border-red-400/60 cursor-crosshair'
                : pointMode === 'delta'
                  ? 'border-blue-400/60 cursor-crosshair'
                  : 'border-border'
                }`}
              style={{ width: '100%', height: 240 }}
            >
              {/* Analyzing overlay */}
              {analyzing && (
                <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 rounded-xl">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-xs text-primary font-medium">Analysing fingerprint…</span>
                </div>
              )}

              <div
                style={{
                  transform: `scale(${isPointMode ? zoom : 1})`,
                  transformOrigin: 'top left',
                  width: isPointMode ? `${100 / zoom}%` : '100%',
                  height: '100%',
                }}
              >
                {captureMode === 'scan' && !currentData.image ? (
                  !isScanningActive ? (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 text-slate-400 gap-3 text-center px-4">
                      <Scan className="w-10 h-10 text-primary animate-pulse" />
                      <span className="text-[11px] font-medium tracking-wide">Scanner is idle. Click below to start scanning.</span>
                      <button
                        onClick={() => setIsScanningActive(true)}
                        className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/95 transition-all active:scale-95 shadow-sm"
                      >
                        Start Scanner
                      </button>
                    </div>
                  ) : scannerPhase === 'connecting' ? (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 text-slate-400 gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-[11px] font-medium tracking-wide">Initializing scanner...</span>
                    </div>
                  ) : scannerPhase === 'error' ? (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 text-destructive gap-2 text-center px-4">
                      <AlertCircle className="w-8 h-8 text-destructive animate-bounce" />
                      <span className="text-[11px] font-medium line-clamp-2 max-w-[200px]">{scannerError}</span>
                      <button
                        onClick={() => {
                          setIsScanningActive(false);
                          setTimeout(() => setIsScanningActive(true), 100);
                        }}
                        className="mt-1 px-4 py-2 bg-destructive text-white text-xs rounded-lg hover:bg-destructive/90 transition-colors font-semibold shadow-sm"
                      >
                        Refresh & Retry
                      </button>
                    </div>
                  ) : scannerImage ? (
                    <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
                      <img
                        src={scannerImage}
                        alt="Live Scanner Preview"
                        className={`w-full h-full object-contain block transition-all duration-200 ${scannerPhase === 'frozen' ? 'brightness-50 filter blur-[1px]' : ''}`}
                      />
                      {scannerPhase === 'previewing' && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                          <span className="text-[8px] text-white font-semibold uppercase tracking-wider">Live</span>
                        </div>
                      )}
                      {scannerPhase === 'frozen' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/30 backdrop-blur-[2px]">
                          <CheckCircle className="w-8 h-8 text-green-500" />
                          <span className="text-[11px] font-bold text-green-500 tracking-wide bg-black/60 px-2 py-0.5 rounded-full">CAPTURED</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 text-slate-500 gap-2">
                      <Scan className="w-8 h-8 opacity-30 animate-pulse" />
                      <span className="text-[11px]">Awaiting scan feed...</span>
                    </div>
                  )
                ) : (
                  <div
                    className="relative h-full mx-auto flex items-center justify-center cursor-crosshair"
                    onClick={handlePreviewClick}
                  >
                    <img
                      src={currentImage}
                      alt={selectedFinger}
                      className="h-full w-auto object-contain block"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        const parent = img.parentElement;
                        if (parent) {
                          parent.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                        }
                      }}
                    />
                    {/* Core dot */}
                    {currentData.core && (
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: `${currentData.core.x}%`,
                          top: `${currentData.core.y}%`,
                          transform: 'translate(-50%,-50%)',
                        }}
                      >
                        <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg" />
                        <span className="absolute left-5 top-0 text-[9px] text-red-500 font-bold whitespace-nowrap drop-shadow">
                          CORE
                        </span>
                      </div>
                    )}
                    {/* Delta dot */}
                    {currentData.delta && (
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: `${currentData.delta.x}%`,
                          top: `${currentData.delta.y}%`,
                          transform: 'translate(-50%,-50%)',
                        }}
                      >
                        <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
                        <span className="absolute left-5 top-0 text-[9px] text-blue-500 font-bold whitespace-nowrap drop-shadow">
                          DELTA
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom hint */}
              {isPointMode && !analyzing && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm ${pointMode === 'core'
                      ? 'bg-red-500/20 text-red-500'
                      : 'bg-blue-500/20 text-blue-500'
                      }`}
                  >
                    Click to move {pointMode.toUpperCase()} point
                  </span>
                </div>
              )}
            </div>

            {/* Capture controls row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mode toggle */}
              <div className="flex gap-1 bg-muted rounded-xl p-1 shrink-0">
                {(['scan', 'camera'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setCaptureMode(mode)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${captureMode === mode
                      ? 'bg-card shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {mode === 'scan' ? <Scan className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                    {mode === 'scan' ? 'Scan' : 'Camera'}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-w-0">
                {captureMode === 'scan' ? (
                  !currentData.image && isScanningActive && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleScan}
                        disabled={scannerPhase !== 'previewing'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs rounded-lg font-medium transition-all active:scale-95 shadow-sm ${scannerPhase === 'previewing'
                            ? 'hover:bg-primary/90'
                            : 'opacity-50 cursor-not-allowed'
                          }`}
                      >
                        <Scan className="w-3.5 h-3.5" /> Scan Finger
                      </button>
                      <button
                        onClick={() => setIsScanningActive(false)}
                        className="px-3 py-1.5 bg-slate-600 text-white text-xs rounded-lg font-medium hover:bg-slate-700 transition-colors"
                      >
                        Stop Scanner
                      </button>
                      <button
                        onClick={() => {
                          setIsScanningActive(false);
                          setTimeout(() => setIsScanningActive(true), 100);
                        }}
                        className="px-3 py-1.5 border border-border bg-card text-foreground text-xs rounded-lg font-medium hover:bg-muted transition-colors"
                      >
                        Refresh Scanner
                      </button>
                      {scannerPhase === 'connecting' && (
                        <span className="text-[10px] text-muted-foreground animate-pulse font-medium">Initializing...</span>
                      )}
                    </div>
                  )
                ) : (
                  <InlineCameraView key={`cam-${selectedFinger}`} onCapture={handleCapture} />
                )}
              </div>

              {/* Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-muted rounded-lg hover:bg-muted/70 transition-colors border border-border shrink-0"
              >
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

              {/* Clear */}
              {currentData.image && (
                <button
                  onClick={() => updateFinger(selectedFinger, { image: null, ridgeAuto: '' })}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-muted rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors border border-border shrink-0"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Bottom: all analysis fields at once ── */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

            {/* If no image yet, show a gentle prompt */}
            {!currentData.image && !analyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                <Fingerprint className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  Scan, capture, or upload a fingerprint image.<br />
                  Analysis will fill in automatically.
                </p>
              </div>
            ) : (
              <FingerprintAnalysisForm
                data={currentData}
                onChange={patch => updateFinger(selectedFinger, patch)}
                pointMode={pointMode}
              />
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-auto pt-2 border-t border-border flex-shrink-0">
              <button
                onClick={handleNextFinger}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/70 transition-colors border border-border"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-muted-foreground text-[10px]">
                  {FINGERS[(selectedFingerIdx + 1) % FINGERS.length].replace(/Right |Left /, '')}
                </span>
              </button>

              <button
                onClick={handleSaveFinger}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                {saveFlash ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {saveFlash ? 'Saved!' : 'Save'}
              </button>

              <button
                onClick={handleComplete}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Complete
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Visual Save Confirmation Overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4 transition-all duration-300">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <h2 className="text-xl font-bold text-foreground">Your data is successfully being saved...</h2>
          <p className="text-sm text-muted-foreground">Syncing patient profiles and search index spreadsheet</p>
        </div>
      )}
    </div>
  );
}