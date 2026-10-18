import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';

/** Accessible modal built on the native <dialog> element (focus trap + Esc handled by the browser). */
export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger, loading, onConfirm, onCancel }: {
  open: boolean; title: string; children: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal(); else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onCancel(); }} onClick={(e) => { if (e.target === ref.current) onCancel(); }}
      className="m-auto w-[min(92vw,28rem)] rounded-xl border border-line p-0 shadow-xl backdrop:bg-navy/40" aria-labelledby="dlg-title">
      <div className="p-6">
        <h2 id="dlg-title" className="text-lg font-semibold text-navy">{title}</h2>
        <div className="mt-2 text-sm text-slate-600">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
}
