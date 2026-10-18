import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Layout';
import { Button } from '../../components/ui/Button';
import { useRequest } from '../../features/requests/hooks';

export default function SubmittedPage() {
  const { id = '' } = useParams();
  const state = useLocation().state as { reference?: string } | null;
  const { data } = useRequest(id);
  const reference = state?.reference ?? data?.trackingReference ?? '…';
  return (
    <div className="mx-auto max-w-xl py-8">
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto size-14 text-brand" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-navy">Request submitted</h1>
        <p className="mt-2 text-muted">Thank you. Your report is now <strong>Pending</strong> and awaiting review. Keep this reference to follow up.</p>
        <div className="mt-6 flex items-center justify-between gap-3 rounded-lg border border-dashed border-brand bg-brand-soft px-4 py-3">
          <span className="font-mono text-lg font-bold tracking-wide text-navy" aria-label={`Tracking reference ${reference}`}>{reference}</span>
          <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard?.writeText(reference); toast.success('Reference copied'); }}><Copy className="size-4" />Copy</Button>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={`/requests/${id}`}><Button>View request details</Button></Link>
          <Link to="/requests/new"><Button variant="secondary">Report another issue</Button></Link>
        </div>
      </Card>
    </div>
  );
}
