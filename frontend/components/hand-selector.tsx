'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface HandSelection {
  hand: 'left' | 'right' | null;
  fingers: Record<string, boolean>;
}

interface HandSelectorProps {
  value: HandSelection;
  onChange: (value: HandSelection) => void;
}

const fingerNames = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];

export function HandSelector({ value, onChange }: HandSelectorProps) {
  const handleHandChange = (hand: 'left' | 'right') => {
    onChange({
      hand,
      fingers: hand === value.hand ? value.fingers : {},
    });
  };

  const handleFingerChange = (finger: string) => {
    const newFingers = { ...value.fingers };
    if (newFingers[finger]) {
      delete newFingers[finger];
    } else {
      newFingers[finger] = true;
    }
    onChange({ ...value, fingers: newFingers });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Button
          variant={value.hand === 'left' ? 'default' : 'outline'}
          onClick={() => handleHandChange('left')}
          className="flex-1"
        >
          Left Hand
        </Button>
        <Button
          variant={value.hand === 'right' ? 'default' : 'outline'}
          onClick={() => handleHandChange('right')}
          className="flex-1"
        >
          Right Hand
        </Button>
      </div>

      {value.hand && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-3">Select fingers to capture:</p>
            <div className="grid grid-cols-5 gap-2">
              {fingerNames.map((finger) => (
                <Button
                  key={finger}
                  variant={value.fingers[finger] ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFingerChange(finger)}
                  className="text-xs"
                >
                  {finger.slice(0, 3)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
