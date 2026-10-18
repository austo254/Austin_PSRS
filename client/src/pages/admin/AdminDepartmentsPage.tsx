import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Mail, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Card, EmptyState, ErrorState, PageHeader } from '../../components/ui/Layout';
import { Button } from '../../components/ui/Button';
import { TextArea, TextField } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeletons';
import { useDepartments, useSaveCatalog } from '../../features/admin/hooks';
import { ApiError } from '../../services/api';
import type { Department } from '../../types';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  description: z.string().trim().max(300, 'Keep it under 300 characters'),
  contactEmail: z.string().trim().max(254).refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email address'),
});
type Form = z.infer<typeof schema>;

export default function AdminDepartmentsPage() {
  const { data, isLoading, isError, refetch } = useDepartments();
  const save = useSaveCatalog('departments');
  const [editing, setEditing] = useState<Department | 'new' | null>(null);
  const [toggle, setToggle] = useState<Department | null>(null);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const open = (d: Department | 'new') => { reset(d === 'new' ? { name: '', description: '', contactEmail: '' } : { name: d.name, description: d.description, contactEmail: d.contactEmail ?? '' }); setEditing(d); };
  const onSubmit = handleSubmit((v) => save.mutate({ ...(editing !== 'new' && editing ? { id: editing.id } : {}), ...v, contactEmail: v.contactEmail || null }, {
    onSuccess: () => { toast.success(editing === 'new' ? 'Department created' : 'Department updated'); setEditing(null); },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) setError('name', { message: 'A department with this name already exists' });
      else toast.error(e instanceof ApiError ? e.message : 'Could not save department');
    },
  }));

  return (
    <>
      <PageHeader title="Departments" description="Teams that requests can be assigned to."
        actions={<Button onClick={() => open('new')}><Plus className="size-4" />New department</Button>} />
      <Card>
        {isLoading ? <TableSkeleton /> : isError ? <ErrorState message="We couldn't load departments." onRetry={() => refetch()} /> : data!.length === 0 ? <EmptyState title="No departments yet" /> : (
          <ul className="divide-y divide-line">
            {data!.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-navy"><Building2 className="size-5" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">{d.name}</p><p className="truncate text-sm text-muted">{d.description || 'No description'}</p>
                  {d.contactEmail && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted"><Mail className="size-3" aria-hidden />{d.contactEmail}</p>}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${d.isActive ? 'bg-resolved-soft text-resolved' : 'bg-slate-100 text-slate-600'}`}>{d.isActive ? 'Active' : 'Inactive'}</span>
                <Button variant="secondary" size="sm" onClick={() => open(d)} aria-label={`Edit ${d.name}`}><Pencil className="size-4" />Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setToggle(d)}>{d.isActive ? 'Deactivate' : 'Activate'}</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true" aria-label={editing === 'new' ? 'New department' : 'Edit department'}>
          <form onSubmit={onSubmit} noValidate className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-navy">{editing === 'new' ? 'New department' : 'Edit department'}</h2>
            <TextField label="Name" required autoFocus error={errors.name?.message} {...register('name')} />
            <TextArea label="Description" rows={3} error={errors.description?.message} {...register('description')} />
            <TextField label="Contact email" type="email" hint="Optional. Stored for reference; PSRS does not send email." error={errors.contactEmail?.message} {...register('contactEmail')} />
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
          </form>
        </div>
      )}

      <ConfirmDialog open={!!toggle} danger={!!toggle?.isActive} loading={save.isPending} title={toggle?.isActive ? 'Deactivate department?' : 'Activate department?'}
        confirmLabel={toggle?.isActive ? 'Deactivate' : 'Activate'} onCancel={() => setToggle(null)}
        onConfirm={() => toggle && save.mutate({ id: toggle.id, isActive: !toggle.isActive }, { onSuccess: () => { toast.success('Department updated'); setToggle(null); }, onError: () => toast.error('Could not update department') })}>
        {toggle?.isActive ? 'It can no longer be chosen for new assignments. Requests already assigned keep it.' : 'It can be assigned to requests again.'}
      </ConfirmDialog>
    </>
  );
}
