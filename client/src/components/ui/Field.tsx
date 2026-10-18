import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

const control = 'w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed';
const ring = (err?: string) => (err ? 'border-rejected' : 'border-line hover:border-slate-400');

interface FieldShellProps { label: string; error?: string; hint?: string; required?: boolean; children: (p: { id: string; describedBy?: string; invalid: boolean }) => ReactNode }
export function FieldShell({ label, error, hint, required, children }: FieldShellProps) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}{required && <span className="text-rejected" aria-hidden> *</span>}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {error ? <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-rejected">{error}</p>
        : hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

type Common = { label: string; error?: string; hint?: string };

export const TextField = forwardRef<HTMLInputElement, Common & InputHTMLAttributes<HTMLInputElement> & { trailing?: ReactNode }>(
  function TextField({ label, error, hint, trailing, className, required, ...rest }, ref) {
    return (
      <FieldShell label={label} error={error} hint={hint} required={required}>
        {({ id, describedBy, invalid }) => (
          <div className="relative">
            <input ref={ref} id={id} aria-invalid={invalid} aria-describedby={describedBy} className={clsx(control, 'h-11', ring(error), trailing && 'pr-11', className)} {...rest} />
            {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-2">{trailing}</div>}
          </div>
        )}
      </FieldShell>
    );
  });

export const TextArea = forwardRef<HTMLTextAreaElement, Common & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ label, error, hint, className, required, ...rest }, ref) {
    return (
      <FieldShell label={label} error={error} hint={hint} required={required}>
        {({ id, describedBy, invalid }) => (
          <textarea ref={ref} id={id} aria-invalid={invalid} aria-describedby={describedBy} className={clsx(control, 'py-2.5 min-h-28', ring(error), className)} {...rest} />
        )}
      </FieldShell>
    );
  });

export const SelectField = forwardRef<HTMLSelectElement, Common & SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectField({ label, error, hint, className, required, children, ...rest }, ref) {
    return (
      <FieldShell label={label} error={error} hint={hint} required={required}>
        {({ id, describedBy, invalid }) => (
          <select ref={ref} id={id} aria-invalid={invalid} aria-describedby={describedBy} className={clsx(control, 'h-11', ring(error), className)} {...rest}>{children}</select>
        )}
      </FieldShell>
    );
  });

/** Compact select/input for filter bars (visually hidden label keeps it accessible). */
export function FilterSelect({ label, className, children, ...rest }: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select aria-label={label} className={clsx(control, 'h-10 border-line hover:border-slate-400', className)} {...rest}>{children}</select>
    </label>
  );
}
