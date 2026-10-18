import { Card, PageHeader } from '../../components/ui/Layout';

const faqs = [
  ['How do I track my request?', 'Every request gets a reference such as PSRS-2026-000123. Open My Requests and select View to see its status, timeline and any updates from staff.'],
  ['What do the statuses mean?', 'Pending: received and awaiting review. In Progress: reviewed and work is underway. Resolved: the responsible department has finished and recorded a resolution comment. Rejected: closed with an explanation (for example, outside the service scope).'],
  ['How long does a resolution take?', 'Timelines depend on the issue and department. This demonstration does not guarantee service delivery; priorities are used by administrators for triage only.'],
  ['Can I reopen a resolved request?', 'Yes. Within 14 days of resolution, open the request and choose Reopen, then explain what is still wrong. It goes back to staff for review.'],
  ['Who can see my report?', 'Only you and the administrators processing it. Internal staff notes are never shown to citizens.'],
  ['Can I edit a request after submitting?', 'You can edit the title, location and description while the request is still Pending. After staff start work, add a comment instead.'],
  ['Is this an official government service?', 'No. PSRS is an academic demonstration project. Please do not enter sensitive personal information.'],
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Help &amp; FAQs" description="Answers to common questions about reporting and tracking issues." />
      <Card className="divide-y divide-line">
        {faqs.map(([q, a]) => (
          <details key={q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-navy">{q}<span className="text-brand transition group-open:rotate-45" aria-hidden>+</span></summary>
            <p className="mt-2 text-sm text-slate-600">{a}</p>
          </details>
        ))}
      </Card>
    </div>
  );
}
