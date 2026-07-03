import { useState, useRef, useEffect } from 'react';
import { Scan, RotateCcw, CheckCircle, Loader2, AlertCircle, Camera } from 'lucide-react';

interface InlineScannerViewProps {
  onCapture: (img: string) => void;
}

export function InlineScannerView({ onCapture }: InlineScannerViewProps) {
  const [phase, setPhase] = useState<'connecting' | 'previewing' | 'frozen' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const previewImageRef = useRef<string | null>(null);
  previewImageRef.current = previewImage;
  
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;

  const connectScanner = () => {
    setPhase('connecting');
    setErrorMessage('');
    
    const wsProto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = typeof window !== 'undefined' && window.location.port === '3000' ? 'localhost:8000' : (typeof window !== 'undefined' ? window.location.host : 'localhost:8000');
    const ws = new WebSocket(`${wsProto}//${wsHost}/ws/scanner`);
    socketRef.current = ws;

    ws.onopen = () => {
      setPhase('previewing');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'preview') {
          // Update preview only if we are currently in previewing state
          setPhase(currentPhase => {
            if (currentPhase === 'previewing') {
              setPreviewImage(data.image);
            }
            return currentPhase;
          });
        } else if (data.status === 'error') {
          setPhase('error');
          setErrorMessage(data.message || 'Scanner error');
          ws.close();
        }
      } catch (err) {
        console.error('Failed to parse socket message:', err);
        setPhase('error');
        setErrorMessage('Invalid response from scanner server');
        ws.close();
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket connection error:', err);
      setPhase('error');
      setErrorMessage('Could not connect to scanner server');
    };

    ws.onclose = () => {
      socketRef.current = null;
    };
  };

  useEffect(() => {
    connectScanner();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const triggerCapture = () => {
    if (previewImageRef.current) {
      // 1. Freeze preview UI
      setPhase('frozen');
      
      // 2. Save captured image
      onCaptureRef.current(previewImageRef.current);
      
      // 3. Resume live feed after 1.5 seconds
      setTimeout(() => {
        setPhase(currentPhase => {
          if (currentPhase === 'frozen') {
            return 'previewing';
          }
          return currentPhase;
        });
      }, 1500);
    } else {
      setPhase('error');
      setErrorMessage('No frame available to capture');
    }
  };

  const retry = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    setPreviewImage(null);
    connectScanner();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Live Preview Window */}
      <div className="relative w-44 h-56 bg-slate-900 rounded-2xl border-2 border-slate-700 flex flex-col items-center justify-center overflow-hidden shadow-xl group transition-all duration-300 hover:border-primary/50">
        {/* Background Grids */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,#fff 0px,transparent 1px,transparent 20px)' }} />

        {phase === 'connecting' && (
          <div className="flex flex-col items-center gap-2 text-slate-400 p-4 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-[10px] font-medium tracking-wide">Initializing scanner...</span>
          </div>
        )}

        {(phase === 'previewing' || phase === 'frozen') && previewImage && (
          <div className="relative w-full h-full">
            <img 
              src={previewImage} 
              alt="Live Scanner Preview" 
              className={`w-full h-full object-cover transition-all duration-200 ${phase === 'frozen' ? 'brightness-50 filter blur-[1px]' : ''}`} 
            />
            {/* Live Feed overlay indicator */}
            {phase === 'previewing' && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                <span className="text-[8px] text-white font-semibold uppercase tracking-wider">Live</span>
              </div>
            )}
            {/* Frozen captured state overlay */}
            {phase === 'frozen' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/30 backdrop-blur-[2px] animate-fade-in">
                <CheckCircle className="w-8 h-8 text-green-500 animate-scale-up" />
                <span className="text-[11px] font-bold text-green-500 tracking-wide bg-black/60 px-2 py-0.5 rounded-full">CAPTURED</span>
              </div>
            )}
          </div>
        )}

        {(phase === 'previewing' || phase === 'frozen') && !previewImage && (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Scan className="w-10 h-10 opacity-30 animate-pulse" />
            <span className="text-[10px]">Awaiting scan feed...</span>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center gap-2 text-center px-3">
            <AlertCircle className="w-8 h-8 text-destructive animate-bounce" />
            <span className="text-[10px] text-destructive font-medium line-clamp-3" title={errorMessage}>
              {errorMessage}
            </span>
            <button 
              onClick={retry}
              className="mt-2 px-3 py-1 bg-destructive/20 text-destructive text-[10px] rounded-lg hover:bg-destructive/30 transition-colors font-semibold"
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
        {phase === 'previewing' && (
          <button
            onClick={triggerCapture}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-green-900/20 active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" /> Scan Finger
          </button>
        )}
        
        {phase === 'frozen' && (
          <button
            disabled
            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-700 text-slate-400 text-xs font-semibold rounded-lg cursor-not-allowed"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Freezing...
          </button>
        )}
      </div>
    </div>
  );
}

