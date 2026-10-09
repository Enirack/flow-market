'use client';

import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Skeleton,
  Textarea,
} from '@flowmarket/ui';
import {
  type Category,
  type ProviderService,
  addServiceImage,
  addServiceOption,
  archiveService,
  createService,
  deleteService,
  generateServiceListing,
  getCategories,
  getMyServices,
  publishService,
  removeServiceImage,
  removeServiceOption,
  updateService,
} from '@/lib/api';

const STATUS_LABEL: Record<ProviderService['status'], string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  ARCHIVED: 'Archivé',
};

const STATUS_VARIANT: Record<ProviderService['status'], 'outline' | 'success' | 'secondary'> = {
  DRAFT: 'outline',
  PUBLISHED: 'success',
  ARCHIVED: 'secondary',
};

function flattenCategories(categories: Category[]): { id: string; label: string }[] {
  return categories.flatMap((category) => [
    { id: category.id, label: category.name },
    ...category.children.map((child) => ({ id: child.id, label: `${category.name} — ${child.name}` })),
  ]);
}

interface ServiceFormState {
  categoryId: string;
  title: string;
  description: string;
  priceType: string;
  basePrice: string;
  durationMinutes: string;
}

const EMPTY_FORM: ServiceFormState = {
  categoryId: '',
  title: '',
  description: '',
  priceType: 'FIXED',
  basePrice: '',
  durationMinutes: '60',
};

export default function ProviderServicesPage() {
  const [services, setServices] = useState<ProviderService[] | null>(null);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [editing, setEditing] = useState<ProviderService | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [imageUrl, setImageUrl] = useState('');
  const [optionName, setOptionName] = useState('');
  const [optionPrice, setOptionPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiRaw, setAiRaw] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  async function load() {
    const [servicesRes, categoriesRes] = await Promise.all([getMyServices(), getCategories()]);
    setServices(servicesRes);
    setCategories(flattenCategories(categoriesRes));
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setAiRaw('');
    setError(null);
    setCreating(true);
  }

  async function handleGenerateListing() {
    if (!aiRaw.trim()) return;
    setAiLoading(true);
    setError(null);
    try {
      const { title, description } = await generateServiceListing(aiRaw);
      setForm((current) => ({ ...current, title, description }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la génération.");
    } finally {
      setAiLoading(false);
    }
  }

  function openEdit(service: ProviderService) {
    setForm({
      categoryId: service.category.id,
      title: service.title,
      description: service.description,
      priceType: service.priceType,
      basePrice: service.basePrice,
      durationMinutes: service.durationMinutes != null ? String(service.durationMinutes) : '',
    });
    setError(null);
    setEditing(service);
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,
        priceType: form.priceType,
        basePrice: Number(form.basePrice),
        ...(form.durationMinutes ? { durationMinutes: Number(form.durationMinutes) } : {}),
      };

      if (editing) {
        await updateService(editing.id, payload);
      } else {
        await createService(payload);
      }
      setEditing(null);
      setCreating(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(service: ProviderService) {
    try {
      await publishService(service.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publication impossible.');
    }
  }

  async function handleArchive(service: ProviderService) {
    await archiveService(service.id);
    await load();
  }

  async function handleDelete(service: ProviderService) {
    await deleteService(service.id);
    await load();
  }

  async function handleAddImage() {
    if (!editing || !imageUrl) return;
    await addServiceImage(editing.id, imageUrl);
    setImageUrl('');
    const [refreshed] = (await getMyServices()).filter((s) => s.id === editing.id);
    if (refreshed) setEditing(refreshed);
    await load();
  }

  async function handleRemoveImage(imageId: string) {
    if (!editing) return;
    await removeServiceImage(editing.id, imageId);
    const [refreshed] = (await getMyServices()).filter((s) => s.id === editing.id);
    if (refreshed) setEditing(refreshed);
    await load();
  }

  async function handleAddOption() {
    if (!editing || !optionName || !optionPrice) return;
    await addServiceOption(editing.id, { name: optionName, priceDelta: Number(optionPrice) });
    setOptionName('');
    setOptionPrice('');
    const [refreshed] = (await getMyServices()).filter((s) => s.id === editing.id);
    if (refreshed) setEditing(refreshed);
    await load();
  }

  async function handleRemoveOption(optionId: string) {
    if (!editing) return;
    await removeServiceOption(editing.id, optionId);
    const [refreshed] = (await getMyServices()).filter((s) => s.id === editing.id);
    if (refreshed) setEditing(refreshed);
    await load();
  }

  const dialogOpen = creating || editing !== null;

  function closeDialog() {
    setCreating(false);
    setEditing(null);
  }

  if (!services) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mes services</h1>
        <Button onClick={openCreate}>Nouveau service</Button>
      </div>

      {error && !dialogOpen && <p className="text-sm text-destructive">{error}</p>}

      {services.length === 0 ? (
        <EmptyState
          title="Aucun service"
          description="Créez votre premier service pour apparaître sur la marketplace."
          action={<Button onClick={openCreate}>Créer un service</Button>}
        />
      ) : (
        services.map((service) => (
          <Card key={service.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-medium">{service.title}</p>
                <p className="text-sm text-muted-foreground">
                  {service.category.name} · {Number(service.basePrice).toLocaleString('fr-FR')} {service.currency}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANT[service.status]}>{STATUS_LABEL[service.status]}</Badge>
                <Button variant="outline" size="sm" onClick={() => openEdit(service)}>
                  Modifier
                </Button>
                {service.status === 'DRAFT' && (
                  <Button size="sm" onClick={() => handlePublish(service)}>
                    Publier
                  </Button>
                )}
                {service.status === 'PUBLISHED' && (
                  <Button variant="outline" size="sm" onClick={() => handleArchive(service)}>
                    Archiver
                  </Button>
                )}
                {service.status === 'DRAFT' && (
                  <Button variant="outline" size="sm" onClick={() => handleDelete(service)}>
                    Supprimer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le service' : 'Nouveau service'}</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-3">
            {creating && (
              <div className="space-y-2 rounded-md border border-dashed border-input p-3">
                <Label htmlFor="svc-ai-raw">Décrivez votre service en quelques mots (IA)</Label>
                <Textarea
                  id="svc-ai-raw"
                  rows={2}
                  placeholder="ex. création de logo moderne pour petites entreprises, livraison en 3 jours"
                  value={aiRaw}
                  onChange={(e) => setAiRaw(e.target.value)}
                />
                <Button type="button" variant="outline" size="sm" disabled={aiLoading} onClick={handleGenerateListing}>
                  {aiLoading ? 'Génération…' : 'Générer avec l’IA ✨'}
                </Button>
              </div>
            )}
            <div>
              <Label htmlFor="svc-title">Titre</Label>
              <Input
                id="svc-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="svc-category">Catégorie</Label>
              <select
                id="svc-category"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">Sélectionner…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="svc-description">Description</Label>
              <Textarea
                id="svc-description"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="svc-price">Prix de base (XOF)</Label>
                <Input
                  id="svc-price"
                  type="number"
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="svc-duration">Durée (minutes)</Label>
                <Input
                  id="svc-duration"
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                />
              </div>
            </div>

            {editing && (
              <>
                <div>
                  <Label>Images</Label>
                  <ul className="mt-2 space-y-1">
                    {editing.images.map((image) => (
                      <li key={image.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{image.url}</span>
                        <button
                          type="button"
                          className="text-xs text-destructive"
                          onClick={() => handleRemoveImage(image.id)}
                        >
                          Retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="https://…"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <Button type="button" variant="outline" onClick={handleAddImage}>
                      Ajouter
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Options</Label>
                  <ul className="mt-2 space-y-1">
                    {editing.options.map((option) => (
                      <li key={option.id} className="flex items-center justify-between text-sm">
                        <span>
                          {option.name} (+{Number(option.priceDelta).toLocaleString('fr-FR')})
                        </span>
                        <button
                          type="button"
                          className="text-xs text-destructive"
                          onClick={() => handleRemoveOption(option.id)}
                        >
                          Retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="Nom de l'option"
                      value={optionName}
                      onChange={(e) => setOptionName(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="+XOF"
                      className="w-28"
                      value={optionPrice}
                      onChange={(e) => setOptionPrice(e.target.value)}
                    />
                    <Button type="button" variant="outline" onClick={handleAddOption}>
                      Ajouter
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button disabled={saving} onClick={handleSubmit}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
