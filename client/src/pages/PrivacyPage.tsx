import { Link } from 'react-router-dom';
import { Logo } from '../components/ui/Logo';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link to="/login" aria-label="Back to PSRS"><Logo /></Link>
      <h1 className="mt-8 text-3xl font-bold text-navy">Privacy notice</h1>
      <div className="prose mt-4 space-y-4 text-slate-700">
        <p><strong>This is an academic demonstration project.</strong> The Public Service Request System (PSRS) is a student project inspired by public-service portals. It is not an official government service and is not affiliated with any government body.</p>
        <h2 className="text-lg font-semibold text-navy">Please do not enter sensitive data</h2>
        <p>Do not submit national ID numbers, bank details, health information, or any other sensitive real-world personal data. Use realistic but fictional information where possible.</p>
        <h2 className="text-lg font-semibold text-navy">What we store</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Your name, email address and optional phone number (used to identify your account and requests).</li>
          <li>Your hashed password (we never store the password itself).</li>
          <li>The service requests you submit, including any optional image, and their status updates and comments.</li>
          <li>Notifications and an audit trail of administrative actions on your requests.</li>
        </ul>
        <h2 className="text-lg font-semibold text-navy">Who can see it</h2>
        <p>Only you can see your own requests. Administrators of this demonstration can see request details and the contact information needed to process them. Internal administrator notes are never shown to citizens.</p>
        <h2 className="text-lg font-semibold text-navy">Cookies</h2>
        <p>One essential, HTTP-only session cookie keeps you signed in. No advertising or analytics cookies are used.</p>
        <h2 className="text-lg font-semibold text-navy">Communications</h2>
        <p>Updates are delivered as in-app notifications only. No email or SMS is sent.</p>
      </div>
    </div>
  );
}
