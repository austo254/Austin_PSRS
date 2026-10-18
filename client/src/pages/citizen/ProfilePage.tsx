import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardHeader, PageHeader } from '../../components/ui/Layout';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { useAuth } from '../../features/auth/AuthContext';
import { api, ApiError } from '../../services/api';
import type { User } from '../../types';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  phoneNumber: z.string().trim().regex(/^(\+?[0-9 ()-]{7,20})?$/, 'Enter a valid phone number'),
});
type Form = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<Form>({
    resolver: zodResolver(schema), defaultValues: { fullName: user!.fullName, phoneNumber: user!.phoneNumber ?? '' },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      const r = await api<{ user: User }>('/auth/me', { method: 'PATCH', body: { fullName: v.fullName, phoneNumber: v.phoneNumber || null } });
      setUser(r.user); toast.success('Profile updated');
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Could not update profile'); }
  });
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="My profile" />
      <Card>
        <CardHeader title="Basic details" />
        <form onSubmit={onSubmit} noValidate className="space-y-4 p-5">
          <TextField label="Full name" required error={errors.fullName?.message} {...register('fullName')} />
          <TextField label="Email address" value={user!.email} disabled readOnly hint="Email cannot be changed in this demonstration." />
          <TextField label="Phone number" type="tel" error={errors.phoneNumber?.message} {...register('phoneNumber')} />
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save changes</Button>
        </form>
      </Card>
    </div>
  );
}
