import { Skeleton } from './Layout';

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3 p-5" role="status" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
  </div>
);
export const CardsSkeleton = ({ n = 4 }: { n?: number }) => (
  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" role="status" aria-label="Loading">
    {Array.from({ length: n }, (_, i) => <Skeleton key={i} className="h-24" />)}
  </div>
);
