import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Card, EmptyState, ErrorState, PageHeader } from '../../components/ui/Layout';
import { Button } from '../../components/ui/Button';
import { SelectField, TextArea, TextField } from '../../components/ui/Field';
import { CategoryIcon, ICON_KEYS } from '../../components/ui/CategoryIcon';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeletons';
import { useAdminCategories, useSaveCatalog } from '../../features/admin/hooks';
import { ApiError } from '../../services/api';
import type { Category } from '../../types';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().trim().max(300, 'Keep it under 300 characters'),
  iconKey: z.string().min(1),
});
type Form = z.infer<typeof schema>;

export default function AdminCategoriesPage() {
  const { data, isLoading, isError, refetch } = useAdminCategories();
  const save = useSaveCatalog('categories');
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [toggle, setToggle] = useState<Category | null>(null);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const open = (c: Category | 'new') => { reset(c === 'new' ? { name: '', description: '', iconKey: 'circle-help' } : { name: c.name, description: c.description, iconKey: c.iconKey }); setEditing(c); };
  const onSubmit = handleSubmit((v) => save.mutate({ ...(editing !== 'new' && editing ? { id: editing.id } : {}), ...v }, {
    onSuccess: () => { toast.success(editing === 'new' ? 'Category created' : 'Category updated'); setEditing(null); },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) setError('name', { message: 'A category with this name already exists' });
      else toast.error(e instanceof ApiError ? e.message : 'Could not save category');
    },
  }));

  return (
    <>
      <PageHeader title="Service categories" description="Categories citizens can choose when reporting an issue. Deactivate rather than delete so history stays intact."
        actions={<Button onClick={() => open('new')}><Plus className="size-4" />New category</Button>} />
      <Card>
        {isLoading ? <TableSkeleton /> : isError ? <ErrorState message="We couldn't load categories." onRetry={() => refetch()} /> : data!.length === 0 ? <EmptyState title="No categories yet" /> : (
          <ul className="divide-y divide-line">
            {data!.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand"><CategoryIcon iconKey={c.iconKey} className="size-5" /></span>
                <div className="min-w-0 flex-1"><p className="font-semibold text-navy">{c.name}</p><p className="truncate text-sm text-muted">{c.description || 'No description'}</p></div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.isActive ? 'bg-resolved-soft text-resolved' : 'bg-slate-100 text-slate-600'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
                <Button variant="secondary" size="sm" onClick={() => open(c)} aria-label={`Edit ${c.name}`}><Pencil className="size-4" />Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setToggle(c)}>{c.isActive ? 'Deactivate' : 'Activate'}</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true" aria-label={editing === 'new' ? 'New category' : 'Edit category'}>
          <form onSubmit={onSubmit} noValidate className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-navy">{editing === 'new' ? 'New category' : 'Edit category'}</h2>
            <TextField label="Name" required autoFocus error={errors.name?.message} {...register('name')} />
            <TextArea label="Description" rows={3} error={errors.description?.message} {...register('description')} />
            <SelectField label="Icon" {...register('iconKey')}>{ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</SelectField>
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
          </form>
        </div>
      )}

      <ConfirmDialog open={!!toggle} danger={!!toggle?.isActive} loading={save.isPending} title={toggle?.isActive ? 'Deactivate category?' : 'Activate category?'}
        confirmLabel={toggle?.isActive ? 'Deactivate' : 'Activate'} onCancel={() => setToggle(null)}
        onConfirm={() => toggle && save.mutate({ id: toggle.id, isActive: !toggle.isActive }, { onSuccess: () => { toast.success('Category updated'); setToggle(null); }, onError: () => toast.error('Could not update category') })}>
        {toggle?.isActive ? 'Citizens will no longer be able to choose this category. Existing requests are not affected.' : 'Citizens will be able to choose this category again.'}
      </ConfirmDialog>
    </>
  );
}
