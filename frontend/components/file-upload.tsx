'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptTypes?: string;
  label?: string;
}

export function FileUpload({
  onFileSelect,
  acceptTypes = 'image/*',
  label = 'Upload Image',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptTypes}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className="w-full"
      >
        <Upload className="w-4 h-4 mr-2" />
        {label}
      </Button>
    </div>
  );
}

interface DragDropUploadProps {
  onFileSelect: (file: File) => void;
  acceptTypes?: string;
}

export function DragDropUpload({ onFileSelect, acceptTypes = 'image/*' }: DragDropUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <Card>
      <CardContent>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept={acceptTypes}
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="font-medium">Drag and drop your fingerprint image here</p>
          <p className="text-sm text-muted-foreground">or click to browse</p>
        </div>
      </CardContent>
    </Card>
  );
}
