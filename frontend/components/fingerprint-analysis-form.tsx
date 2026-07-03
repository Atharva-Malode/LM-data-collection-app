import { FingerData, Pattern } from '@/lib/types';
import { SUB_PATTERNS, PATTERNS } from '@/lib/constants';
import type { PointMode } from '@/components/point-mode-pill';

interface FingerprintAnalysisFormProps {
  data: FingerData;
  onChange: (patch: Partial<FingerData>) => void;
  pointMode: PointMode;
}

const inputCls =
  'w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground ' +
  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors';
const selectCls = inputCls + ' cursor-pointer';

export function FingerprintAnalysisForm({
  data,
  onChange,
  pointMode,
}: FingerprintAnalysisFormProps) {
  const subOptions = data.pattern ? SUB_PATTERNS[data.pattern as string] ?? [] : [];

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
      {/* Pattern */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Pattern
        </label>
        <select
          className={selectCls}
          value={data.pattern}
          onChange={e => onChange({ pattern: e.target.value as Pattern, subPattern: '' })}
        >
          <option value="">— select —</option>
          {PATTERNS.map(p => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Sub Pattern */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Sub Pattern
        </label>
        <select
          className={selectCls}
          value={data.subPattern}
          disabled={!data.pattern}
          onChange={e => onChange({ subPattern: e.target.value })}
        >
          <option value="">— select —</option>
          {subOptions.map(sp => (
            <option key={sp}>{sp}</option>
          ))}
        </select>
      </div>

      {/* Core */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Core Point
          {pointMode === 'core' && (
            <span className="text-[9px] text-red-400 font-normal ml-1">click image ↑</span>
          )}
        </label>
        <div className="flex gap-1.5">
          <input
            type="number"
            className={inputCls}
            placeholder="X"
            value={data.core?.x ?? ''}
            onChange={e =>
              onChange({ core: { x: Number(e.target.value), y: data.core?.y ?? 50 } })
            }
          />
          <input
            type="number"
            className={inputCls}
            placeholder="Y"
            value={data.core?.y ?? ''}
            onChange={e =>
              onChange({ core: { x: data.core?.x ?? 50, y: Number(e.target.value) } })
            }
          />
        </div>
      </div>

      {/* Delta */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          Delta Point
          {pointMode === 'delta' && (
            <span className="text-[9px] text-blue-400 font-normal ml-1">click image ↑</span>
          )}
        </label>
        <div className="flex gap-1.5">
          <input
            type="number"
            className={inputCls}
            placeholder="X"
            value={data.delta?.x ?? ''}
            onChange={e =>
              onChange({ delta: { x: Number(e.target.value), y: data.delta?.y ?? 50 } })
            }
          />
          <input
            type="number"
            className={inputCls}
            placeholder="Y"
            value={data.delta?.y ?? ''}
            onChange={e =>
              onChange({ delta: { x: data.delta?.x ?? 50, y: Number(e.target.value) } })
            }
          />
        </div>
      </div>

      {/* Ridge count — full width */}
      <div className="col-span-2 flex gap-3">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Ridge Count (Auto)
          </label>
          <div className="px-2.5 py-1.5 bg-primary/5 border border-primary/20 rounded-lg text-xs font-bold text-primary">
            {data.ridgeAuto || '—'}
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Ridge Count (Manual)
          </label>
          <input
            type="number"
            className={inputCls}
            placeholder="Override"
            value={data.ridgeManual1}
            onChange={e => onChange({ ridgeManual1: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
