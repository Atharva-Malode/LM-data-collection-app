'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Minus, Plus, RotateCcw } from 'lucide-react';

export interface CanvasPoint {
  x: number;
  y: number;
  type: 'core' | 'delta';
}

interface CanvasEditorProps {
  initialImage?: string;
  points: CanvasPoint[];
  onPointsChange: (points: CanvasPoint[]) => void;
  fingerId: string;
}

export function CanvasEditor({
  initialImage,
  points,
  onPointsChange,
  fingerId,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [currentMode, setCurrentMode] = useState<'core' | 'delta'>('core');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw placeholder
    if (!initialImage) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `Fingerprint for ${fingerId}`,
        canvas.width / 2,
        canvas.height / 2 - 10
      );
      ctx.fillText(
        '(Upload image or click to mark points)',
        canvas.width / 2,
        canvas.height / 2 + 10
      );
    } else {
      // Draw image if available
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawPoints();
      };
      img.src = initialImage;
    }

    if (initialImage) {
      drawPoints();
    }

    function drawPoints() {
      if (!ctx) return;
      points.forEach((point) => {
        const screenX = point.x * zoom + panX;
        const screenY = point.y * zoom + panY;

        if (point.type === 'core') {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(screenX, screenY, 7.5 * zoom, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2.5 * zoom;
          ctx.beginPath();
          ctx.arc(screenX, screenY, 10 * zoom, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw label
        ctx.fillStyle = point.type === 'core' ? '#ef4444' : '#3b82f6';
        ctx.font = `bold ${14.5 * zoom}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(point.type.toUpperCase(), screenX + 15 * zoom, screenY - 10 * zoom);
      });
    }
  }, [initialImage, points, zoom, panX, panY, fingerId]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    // Scale client/CSS pixels to internal canvas drawing pixels
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = ((e.clientX - rect.left) * scaleX - panX) / zoom;
    const y = ((e.clientY - rect.top) * scaleY - panY) / zoom;

    const newPoint: CanvasPoint = {
      x: Math.max(0, Math.min(x, canvas.width)),
      y: Math.max(0, Math.min(y, canvas.height)),
      type: currentMode,
    };

    // Enforce a single point of each type by filtering out any existing point of the current mode
    const filteredPoints = points.filter(p => p.type !== currentMode);
    onPointsChange([...filteredPoints, newPoint]);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPanX((prev) => prev + dx);
      setPanY((prev) => prev + dy);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Mark Fingerprint Points - {fingerId}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            variant={currentMode === 'core' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentMode('core')}
            className="bg-red-600 hover:bg-red-700"
          >
            Core (Red)
          </Button>
          <Button
            variant={currentMode === 'delta' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentMode('delta')}
            className="bg-orange-500 hover:bg-orange-600"
          >
            Delta (Orange)
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.2))}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="text-sm min-w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom((prev) => Math.min(2, prev + 0.2))}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setZoom(1);
              setPanX(0);
              setPanY(0);
            }}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onPointsChange([])}
            className="ml-auto"
          >
            Clear All
          </Button>
        </div>

        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={500}
            height={600}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={(e) => e.preventDefault()}
            className="border-2 border-border rounded-lg bg-gray-100 cursor-crosshair w-full max-w-[320px] aspect-[5/6] shadow-sm block"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Click to add points. Right-click drag to pan. Use + / - to zoom.
          {points.length > 0 && ` (${points.length} points marked)`}
        </p>
      </CardContent>
    </Card>
  );
}
