import { useState, useRef, useEffect } from 'react';
import { Camera } from 'lucide-react';

interface InlineCameraViewProps {
  onCapture: (img: string) => void;
}

export function InlineCameraView({ onCapture }: InlineCameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;

  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
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
      setError('Camera access denied');
    }
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    onCaptureRef.current(canvasRef.current.toDataURL('image/jpeg'));
    if (videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setStreaming(false);
  };

  return (
    <div className="flex items-center gap-2">
      <canvas ref={canvasRef} className="hidden" />
      {!streaming ? (
        <>
          <button
            onClick={startCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 font-medium transition-colors"
          >
            <Camera className="w-3.5 h-3.5" /> Open Camera
          </button>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </>
      ) : (
        <>
          <video ref={videoRef} className="w-20 h-14 rounded object-cover border border-border" autoPlay muted playsInline />
          <button
            onClick={capture}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 font-medium transition-colors"
          >
            <Camera className="w-3 h-3" /> Capture
          </button>
        </>
      )}
    </div>
  );
}
