import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'navy';
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; loading?: boolean; size?: 'sm' | 'md' | 'lg' }

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark active:bg-brand-dark',
  navy: 'bg-navy text-white hover:bg-[#1b2270]',
  secondary: 'bg-white text-slate-800 border border-line hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-rejected text-white hover:bg-[#98353d]',
};
const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className, children, ...rest }, ref,
) {
  return (
    <button
      ref={ref} disabled={disabled || loading} aria-busy={loading || undefined}
      className={clsx('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed', variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
