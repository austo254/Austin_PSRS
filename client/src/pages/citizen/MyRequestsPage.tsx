import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/ui/Layout';
import { Button } from '../../components/ui/Button';
import { CitizenRequestsTable } from '../../components/CitizenRequestsTable';

export default function MyRequestsPage() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="My requests" description="Everything you have reported, with its latest status."
        actions={<Button onClick={() => navigate('/requests/new')}><Plus className="size-4" />Report an Issue</Button>} />
      <CitizenRequestsTable pageSize={10} title="All requests" />
    </>
  );
}
