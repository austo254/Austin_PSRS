import clsx from 'clsx';

/** Original PSRS mark: a rounded green tile with a stylised "P" and a service-pin dot. */
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 40 40" className="size-9" aria-hidden>
        <rect width="40" height="40" rx="10" fill="#16A34A" />
        <path d="M13 29V11h9a5.5 5.5 0 010 11h-4" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="27.5" cy="28.5" r="3" fill="#11164A" /><circle cx="27.5" cy="28.5" r="1.1" fill="#fff" />
      </svg>
      <span className="leading-tight">
        <span className={clsx('block text-lg font-extrabold tracking-tight', light ? 'text-white' : 'text-navy')}>PSRS</span>
        <span className={clsx('block text-[10px] font-medium uppercase tracking-widest', light ? 'text-white/70' : 'text-muted')}>Public Service Requests</span>
      </span>
    </span>
  );
}
