'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@flowmarket/ui';
import { ApiError, authedFetch } from '@/lib/api';

export function FavoriteButton({ serviceId }: { serviceId: string }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      if (isFavorite) {
        await authedFetch(`/favorites/${serviceId}`, { method: 'DELETE' });
        setIsFavorite(false);
      } else {
        await authedFetch(`/favorites/${serviceId}`, { method: 'POST' });
        setIsFavorite(true);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = '/login';
        return;
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isFavorite}
    >
      <Heart className={isFavorite ? 'fill-current text-destructive' : undefined} />
      {isFavorite ? 'Ajouté aux favoris' : 'Ajouter aux favoris'}
    </Button>
  );
}
