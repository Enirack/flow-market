'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button, Input } from '@flowmarket/ui';
import { parseSearchQuery } from '@/lib/api';

export function AiSearchBar({
  defaultQuery,
  category,
}: {
  defaultQuery?: string | undefined;
  category?: string | undefined;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultQuery ?? '');
  const [loading, setLoading] = useState(false);

  function buildParams(overrides: {
    q?: string | undefined;
    category?: string | undefined;
    maxPrice?: string | undefined;
  }): URLSearchParams {
    const params = new URLSearchParams();
    const resolvedCategory = overrides.category ?? category;
    if (resolvedCategory) params.set('category', resolvedCategory);
    if (overrides.q) params.set('q', overrides.q);
    if (overrides.maxPrice) params.set('maxPrice', overrides.maxPrice);
    return params;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    router.push(`/marketplace?${buildParams({ q: value || undefined }).toString()}`);
  }

  async function handleAiSearch() {
    if (!value.trim()) return;
    setLoading(true);
    try {
      const parsed = await parseSearchQuery(value);
      const params = buildParams({
        q: parsed.q,
        category: parsed.category,
        maxPrice: parsed.maxPrice ? String(parsed.maxPrice) : undefined,
      });
      router.push(`/marketplace?${params.toString()}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center" onSubmit={handleSubmit}>
      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Rechercher un service… (ex. « un logo pas cher et rapide »)"
          className="pl-9"
          aria-label="Rechercher un service"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="outline">
          Rechercher
        </Button>
        <Button type="button" disabled={loading} onClick={handleAiSearch}>
          {loading ? 'Analyse…' : 'Recherche IA ✨'}
        </Button>
      </div>
    </form>
  );
}
