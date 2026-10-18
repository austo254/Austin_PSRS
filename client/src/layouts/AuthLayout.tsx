import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/ui/Logo';
import { AuthIllustration } from '../components/AuthIllustration';

/** Split screen on desktop (~55% form / ~45% visual); single column on mobile. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[55fr_45fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-20">
        <Link to="/login" aria-label="PSRS home"><Logo /></Link>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">One Portal. Better Public Services.</h1>
          <p className="mt-3 text-muted">Report public service issues and track their resolution in one place.</p>
          <div className="mt-8">{children}</div>
        </main>
        <footer className="text-xs text-muted">
          <p>Academic demonstration project. Not an official government service; please do not enter sensitive real-world data.</p>
          <p className="mt-1"><Link className="underline hover:text-navy" to="/privacy">Privacy notice</Link> · © {new Date().getFullYear()} PSRS</p>
        </footer>
      </div>
      <aside className="relative hidden overflow-hidden lg:block" aria-hidden>
        <AuthIllustration />
        <div className="absolute inset-x-8 bottom-10 rounded-2xl border border-white/20 bg-navy/45 p-6 text-white backdrop-blur-md">
          <p className="text-xl font-bold">See it. Report it. Track it.</p>
          <p className="mt-2 text-sm text-white/85">From potholes to street lights, every report gets a tracking reference and a clear status you can follow until it is resolved.</p>
        </div>
      </aside>
    </div>
  );
}
