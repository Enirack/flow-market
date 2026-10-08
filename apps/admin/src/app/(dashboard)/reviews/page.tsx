'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Button, Card, CardContent, Skeleton } from '@flowmarket/ui';
import { type AdminReview, getAdminReviews, hideReview } from '@/lib/api';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);

  async function load() {
    const res = await getAdminReviews({});
    setReviews(res.reviews);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleHide(id: string) {
    await hideReview(id);
    await load();
  }

  if (!reviews) return <Skeleton className="h-24 w-full" />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Avis</h1>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun avis pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6">
                <div>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Star className="size-4 fill-current text-amber-500" aria-hidden="true" />
                    {review.rating} · {review.provider.businessName}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {review.client.profile
                      ? `${review.client.profile.firstName} ${review.client.profile.lastName}`
                      : 'Client FlowMarket'}
                  </p>
                  {review.comment && <p className="mt-2 text-sm">{review.comment}</p>}
                </div>
                <Button variant="outline" size="sm" onClick={() => handleHide(review.id)}>
                  Masquer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
