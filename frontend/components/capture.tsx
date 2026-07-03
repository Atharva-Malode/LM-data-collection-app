'use client';

import { useState, useRef, useEffect } from 'react';
import { Fingerprint, CheckCircle, RotateCcw, Camera } from 'lucide-react';
import { FINGERS } from '@/lib/constants';
import { FingerName } from '@/lib/types';



const FP_SVGS = [
  `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#4a5568" stroke-width="1.5" opacity="0.85"><ellipse cx="100" cy="120" rx="8" ry="10"/><ellipse cx="100" cy="120" rx="16" ry="20"/><ellipse cx="100" cy="120" rx="24" ry="30"/><ellipse cx="100" cy="120" rx="32" ry="40"/><ellipse cx="100" cy="120" rx="40" ry="50"/><ellipse cx="100" cy="120" rx="48" ry="60"/><ellipse cx="100" cy="120" rx="56" ry="70"/><ellipse cx="100" cy="120" rx="64" ry="80"/><ellipse cx="100" cy="120" rx="72" ry="90"/><ellipse cx="100" cy="120" rx="80" ry="100"/></g></svg>`,
  `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#4a5568" stroke-width="1.5" opacity="0.85"><path d="M100,30 Q140,60 140,120 Q140,180 100,210 Q60,180 60,120 Q60,60 100,30"/><path d="M100,45 Q130,70 130,120 Q130,170 100,195 Q70,170 70,120 Q70,70 100,45"/><path d="M100,60 Q120,80 120,120 Q120,160 100,180 Q80,160 80,120 Q80,80 100,60"/><path d="M100,75 Q115,90 115,120 Q115,150 100,165 Q85,150 85,120 Q85,90 100,75"/><path d="M100,90 Q110,100 110,120 Q110,140 100,150 Q90,140 90,120 Q90,100 100,90"/></g></svg>`,
];

export function getFpSvg(finger: FingerName): string {
  const idx = FINGERS.indexOf(finger) % FP_SVGS.length;
  return `data:image/svg+xml;utf8,${encodeURIComponent(FP_SVGS[idx])}`;
}

export function ScannerView({ onCapture }: { onCapture: (img: string) => void }) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [scanPos, setScanPos] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Keep a ref so the interval always calls the latest onCapture
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;

  // Ensure timer is cleaned up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startScan = () => {
    setPhase('scanning'); 
    setScanPos(0);
    let pos = 0;
    timerRef.current = setInterval(() => {
      pos += 2; 
      setScanPos(pos);
      if (pos >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('done');
        onCaptureRef.current(getFpSvg('Right Thumb'));
      }
    }, 30);
  };

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('idle');
    setScanPos(0);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-44 h-44 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border-2 border-slate-600 flex items-center justify-center overflow-hidden shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,#fff 0px,transparent 1px,transparent 20px)' }} />
        {phase === 'idle' && (
          <div className="flex flex-col items-center gap-1.5 text-slate-400">
            <Fingerprint className="w-12 h-12 opacity-40" />
            <span className="text-[10px]">Place finger on sensor</span>
          </div>
        )}
        {phase === 'scanning' && (
          <>
            <Fingerprint className="w-12 h-12 text-primary opacity-70 animate-pulse" />
            <div className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_2px] shadow-primary/60" style={{ top: `${scanPos}%` }} />
            <div className="absolute bottom-2 left-0 right-0 flex justify-center">
              <span className="text-[10px] text-primary animate-pulse">Scanning…</span>
            </div>
          </>
        )}
        {phase === 'done' && (
          <div className="flex flex-col items-center gap-1.5">
            <CheckCircle className="w-10 h-10 text-green-400" />
            <span className="text-[10px] text-green-400">Captured</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {phase === 'idle' && (
          <button onClick={startScan} className="px-4 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 transition-colors font-medium">
            Start Scan
          </button>
        )}
        {(phase === 'scanning' || phase === 'done') && (
          <button onClick={reset} className="flex items-center gap-1 px-3 py-1.5 bg-muted text-muted-foreground text-xs rounded-lg hover:bg-muted/70 transition-colors">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>
    </div>
  );
}

export function CameraView({ onCapture }: { onCapture: (img: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { 
        videoRef.current.srcObject = stream; 
        videoRef.current.play(); 
        setStreaming(true); 
      }
    } catch { 
      setError('Camera access denied.'); 
    }
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    onCaptureRef.current(canvasRef.current.toDataURL('image/jpeg'));
    (videoRef.current.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
    setStreaming(false);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-44 h-44 bg-slate-900 rounded-2xl border-2 border-slate-600 overflow-hidden flex items-center justify-center shadow-xl">
        {streaming
          ? <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
          : <div className="flex flex-col items-center gap-1.5 text-slate-400">
              <Camera className="w-12 h-12 opacity-40" />
              {error ? <span className="text-[10px] text-red-400 px-2 text-center">{error}</span> : <span className="text-[10px]">Open camera to capture</span>}
            </div>}
        {streaming && (
          <div className="absolute inset-0 border-2 border-primary/50 rounded-2xl pointer-events-none">
            <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl" />
            <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr" />
            <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl" />
            <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br" />
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {!streaming
        ? <button onClick={startCamera} className="px-4 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 transition-colors font-medium">Open Camera</button>
        : <button onClick={capture} className="flex items-center gap-1 px-4 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors font-medium"><Camera className="w-3.5 h-3.5" /> Capture</button>}
    </div>
  );
}
