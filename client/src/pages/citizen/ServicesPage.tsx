import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, ErrorState, PageHeader, Skeleton } from '../../components/ui/Layout';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { useCategories } from '../../features/requests/hooks';

export default function ServicesPage() {
  const { data, isLoading, isError, refetch } = useCategories();
  return (
    <>
      <PageHeader title="Services" description="Choose the type of public service issue you want to report." />
      {isError ? <Card><ErrorState message="We couldn't load the services." onRetry={() => refetch()} /></Card> : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? Array.from({ length: 6 }, (_, i) => <li key={i}><Skeleton className="h-32" /></li>) : data!.map((c) => (
            <li key={c.id}>
              <Link to={`/requests/new?category=${c.id}`} className="group flex h-full flex-col rounded-card border border-line bg-white p-5 shadow-card transition hover:border-brand hover:shadow-md">
                <span className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand"><CategoryIcon iconKey={c.iconKey} className="size-6" /></span>
                <h2 className="mt-3 font-semibold text-navy">{c.name}</h2>
                <p className="mt-1 flex-1 text-sm text-muted">{c.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">Report an issue <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
