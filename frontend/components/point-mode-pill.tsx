export type PointMode = 'none' | 'core' | 'delta';

interface PointModePillProps {
  mode: PointMode;
  onChange: (m: PointMode) => void;
}

export function PointModePill({ mode, onChange }: PointModePillProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 text-[10px] font-medium">
      {(['none', 'core', 'delta'] as PointMode[]).map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(mode === m ? 'none' : m)}
          className={`px-2 py-0.5 rounded-md capitalize transition-colors ${mode === m
              ? m === 'core'
                ? 'bg-red-500 text-white'
                : m === 'delta'
                  ? 'bg-blue-500 text-white'
                  : 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          {m === 'none' ? 'View' : m === 'core' ? '● Core' : '● Delta'}
        </button>
      ))}
    </div>
  );
}
