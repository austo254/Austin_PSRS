import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { Card } from './ui/Layout';

export function StatCard({ label, value, icon: Icon, tone = 'brand', hint }: { label: string; value: string | number; icon: LucideIcon; tone?: 'brand' | 'pending' | 'progress' | 'resolved' | 'navy'; hint?: string }) {
  const tones = { brand: 'bg-brand-soft text-brand', pending: 'bg-pending-soft text-pending', progress: 'bg-progress-soft text-progress', resolved: 'bg-resolved-soft text-resolved', navy: 'bg-slate-100 text-navy' };
  return (
    <Card className="flex items-center gap-4 p-4">
      <span className={clsx('grid size-11 shrink-0 place-items-center rounded-lg', tones[tone])}><Icon className="size-5" aria-hidden /></span>
      <div className="min-w-0"><p className="text-2xl font-bold leading-none text-navy">{value}</p><p className="mt-1 text-xs font-medium leading-tight text-muted">{label}</p>{hint && <p className="mt-0.5 text-[11px] leading-tight text-muted">{hint}</p>}</div>
    </Card>
  );
}
