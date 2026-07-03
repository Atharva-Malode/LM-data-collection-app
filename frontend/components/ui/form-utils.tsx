'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const inputCls = "w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors";
export const selectCls = inputCls + " cursor-pointer";

export function AccordionCard({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors">
        <span className="font-semibold text-foreground text-xs tracking-wide">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      <div className="transition-all duration-300 ease-in-out overflow-hidden" style={{ maxHeight: open ? '1000px' : '0px' }}>
        <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
