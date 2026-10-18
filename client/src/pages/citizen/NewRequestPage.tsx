import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ImagePlus, Info, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, PageHeader } from '../../components/ui/Layout';
import { Button } from '../../components/ui/Button';
import { SelectField, TextArea, TextField } from '../../components/ui/Field';
import { useCategories, useConfig, useCreateRequest } from '../../features/requests/hooks';
import { requestSchema, validateImage, type RequestForm } from '../../schemas/request';
import { ApiError } from '../../services/api';

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 text-base font-semibold text-navy"><span className="grid size-7 place-items-center rounded-full bg-brand text-sm text-white">{n}</span>{title}</h2>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: categories } = useCategories();
  const { data: config } = useConfig();
  const create = useCreateRequest();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, setError, formState: { errors } } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema), defaultValues: { categoryId: params.get('category') ?? '', latitude: '', longitude: '' },
  });
  const description = watch('description') ?? '';
  const title = watch('title') ?? '';

  // Re-apply the preselected category once the list has loaded (and only if it is a valid active one).
  useEffect(() => {
    const wanted = params.get('category');
    if (wanted && categories?.some((c) => c.id === wanted)) setValue('categoryId', wanted);
  }, [categories, params, setValue]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f: File | undefined) {
    setImageError(null);
    if (!f) return;
    const err = validateImage(f, config?.uploadMaxBytes ?? 5 * 1024 * 1024);
    if (err) { setImageError(err); if (fileRef.current) fileRef.current.value = ''; return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f); setPreview(URL.createObjectURL(f));
  }
  function clearImage() { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; }

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Location is not available in this browser');
    navigator.geolocation.getCurrentPosition(
      (p) => { setValue('latitude', p.coords.latitude.toFixed(6)); setValue('longitude', p.coords.longitude.toFixed(6)); toast.success('Coordinates added'); },
      () => toast.error('Could not get your location. You can still describe it in words.'),
    );
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    if (create.isPending) return; // guards double-clicks in addition to the disabled button
    const form = new FormData();
    (['categoryId', 'title', 'location', 'description'] as const).forEach((k) => form.append(k, v[k]));
    if (v.latitude) form.append('latitude', v.latitude);
    if (v.longitude) form.append('longitude', v.longitude);
    if (file) form.append('image', file);
    try {
      const r = await create.mutateAsync(form);
      toast.success(`Request submitted: ${r.trackingReference}`);
      navigate(`/requests/${r.id}/submitted`, { replace: true, state: { reference: r.trackingReference } });
    } catch (e) {
      if (e instanceof ApiError) {
        for (const [k, m] of Object.entries(e.fields)) if (k in v) setError(k as keyof RequestForm, { message: String(m) });
        if (e.code === 'UPLOADS_DISABLED') { clearImage(); setImageError(e.message); }
        setFormError(e.message);
      } else setFormError('Something went wrong. Please try again.');
    }
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Report a public service issue" description="Tell us what is wrong and where. You'll get a tracking reference straight away." />
      <form onSubmit={onSubmit} noValidate className="space-y-5" aria-label="Report a public service issue">
        {formError && <div role="alert" className="rounded-lg border border-rejected/30 bg-rejected-soft px-4 py-3 text-sm text-rejected">{formError}</div>}

        <Section n={1} title="What is the issue?">
          <SelectField label="Service category" required error={errors.categoryId?.message} {...register('categoryId')}>
            <option value="">Select a category…</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          <TextField label="Request title" required maxLength={150} placeholder="e.g. Large pothole near the market entrance" error={errors.title?.message} hint={`${title.length}/150`} {...register('title')} />
        </Section>

        <Section n={2} title="Where is it?">
          <TextField label="Location or area affected" required maxLength={200} placeholder="Street, landmark, estate or ward" error={errors.location?.message} {...register('location')} />
          <details className="rounded-lg border border-line bg-slate-50 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-navy">Add map coordinates (optional)</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <TextField label="Latitude" inputMode="decimal" placeholder="-1.286389" error={errors.latitude?.message} {...register('latitude')} />
              <TextField label="Longitude" inputMode="decimal" placeholder="36.817223" error={errors.longitude?.message} {...register('longitude')} />
              <Button type="button" variant="secondary" onClick={useMyLocation} className="h-11"><MapPin className="size-4" />Use my location</Button>
            </div>
            <p className="mt-2 text-xs text-muted">Coordinates are optional and never replace the written location.</p>
          </details>
        </Section>

        <Section n={3} title="Describe the problem">
          <TextArea label="Detailed description" required maxLength={2000} rows={6} placeholder="What happened, since when, and how does it affect people?" error={errors.description?.message} hint={`${description.length}/2000 characters (minimum 20)`} {...register('description')} />
        </Section>

        <Section n={4} title="Add a photo (optional)">
          {config && !config.uploadsEnabled && (
            <p className="flex gap-2 rounded-lg bg-progress-soft p-3 text-sm text-progress"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />Photo uploads aren't enabled on this server, so you can submit your request without an image.</p>
          )}
          <div>
            <input ref={fileRef} id="image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={config ? !config.uploadsEnabled : false} onChange={(e) => pick(e.target.files?.[0])} />
            {preview ? (
              <div className="relative inline-block">
                <img src={preview} alt="Preview of the selected photo" className="max-h-64 rounded-lg border border-line" />
                <button type="button" onClick={clearImage} aria-label="Remove photo" className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-navy text-white shadow"><X className="size-4" /></button>
              </div>
            ) : (
              <label htmlFor="image" className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line px-4 py-8 text-center text-sm text-muted hover:border-brand ${config && !config.uploadsEnabled ? 'cursor-not-allowed opacity-60' : ''}`}>
                <ImagePlus className="size-7" aria-hidden /><span><span className="font-semibold text-brand">Choose a photo</span> · JPEG, PNG or WebP, up to {((config?.uploadMaxBytes ?? 5242880) / 1048576).toFixed(0)} MB</span>
              </label>
            )}
            {imageError && <p role="alert" className="mt-2 text-xs text-rejected">{imageError}</p>}
          </div>
        </Section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link to="/requests" className="text-sm font-medium text-slate-600 hover:underline">Cancel</Link>
          <Button type="submit" size="lg" loading={create.isPending}>{create.isPending ? 'Submitting…' : 'Submit request'}</Button>
        </div>
      </form>
    </div>
  );
}
