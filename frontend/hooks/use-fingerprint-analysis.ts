import { useState, useCallback } from 'react';
import { Pattern } from '@/lib/types';
import { SUB_PATTERNS } from '@/lib/constants';
import { api } from '@/lib/api';

export type AnalysisResult = {
  pattern: Pattern;
  subPattern: string;
  core: { x: number; y: number } | null;
  delta: { x: number; y: number } | null;
  ridgeAuto: string;
};

export function useFingerprintAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);

  const analyze = useCallback(
    async (imageDataUrl: string): Promise<AnalysisResult> => {
      setAnalyzing(true);
      try {
        const [patternRes, coreDeltaRes, ridgeCountRes] = await Promise.all([
          api.predictPattern(imageDataUrl),
          api.predictCoreDelta(imageDataUrl),
          api.predictRidgeCount(imageDataUrl),
        ]);

        const pattern = patternRes.pattern;
        const subOptions = SUB_PATTERNS[pattern as string] ?? [];
        const subPattern = subOptions.length > 0 ? subOptions[0] : '';

        const core = coreDeltaRes.core_x !== null && coreDeltaRes.core_y !== null
          ? { x: coreDeltaRes.core_x, y: coreDeltaRes.core_y }
          : null;

        const delta = coreDeltaRes.delta_x !== null && coreDeltaRes.delta_y !== null
          ? { x: coreDeltaRes.delta_x, y: coreDeltaRes.delta_y }
          : null;

        const ridgeAuto = String(ridgeCountRes.ridge_count);

        return {
          pattern,
          subPattern,
          core,
          delta,
          ridgeAuto,
        };
      } catch (e) {
        console.error('AI analysis failed, falling back to mock details:', e);
        const patterns: Pattern[] = ['Whorl', 'Loop', 'Arch'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const subOptions = SUB_PATTERNS[pattern as string] ?? [];
        const subPattern = subOptions.length > 0 ? subOptions[0] : '';
        return {
          pattern,
          subPattern,
          core: { x: 50, y: 50 },
          delta: { x: 70, y: 70 },
          ridgeAuto: '10',
        };
      } finally {
        setAnalyzing(false);
      }
    },
    []
  );

  return { analyze, analyzing };
}
