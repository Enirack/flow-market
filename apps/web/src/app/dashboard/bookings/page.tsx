'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
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
  type BookingSummary,
  cancelBooking,
  createDispute,
  createPaymentIntent,
  createReview,
  draftReview,
  getMyBookings,
  simulateMockPayment,
} from '@/lib/api';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive' | 'success'> = {
  PENDING: 'outline',
  CONFIRMED: 'default',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  DISPUTED: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  DISPUTED: 'Litige',
};

export default function DashboardBookingsPage() {
  const [bookings, setBookings] = useState<BookingSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewKeywords, setReviewKeywords] = useState('');
  const [aiDrafting, setAiDrafting] = useState(false);
  const [disputeBookingId, setDisputeBookingId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [dialogError, setDialogError] = useState<string | null>(null);

  async function load() {
    try {
      setBookings(await getMyBookings());
    } catch {
      setError('Connectez-vous pour voir vos réservations.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCancel(id: string) {
    await cancelBooking(id, 'Annulée par le client');
    void load();
  }

  async function handlePay(orderId: string) {
    setPayingOrderId(orderId);
    try {
      const { clientPayload } = await createPaymentIntent(orderId);
      if (clientPayload.checkoutUrl) {
        window.location.href = clientPayload.checkoutUrl;
        return;
      }
      if (clientPayload.mockPaymentId) {
        // Mode developpement (aucune cle de paiement reelle configuree) : le
        // paiement est confirme immediatement via le webhook simule, ce qui
        // exerce le meme chemin de code qu'un vrai webhook provider.
        await simulateMockPayment(clientPayload.mockPaymentId, 'succeeded');
        await load();
      }
    } finally {
      setPayingOrderId(null);
    }
  }

  function openReview(bookingId: string) {
    setReviewRating(5);
    setReviewComment('');
    setReviewKeywords('');
    setDialogError(null);
    setReviewBookingId(bookingId);
  }

  async function handleDraftReview() {
    setAiDrafting(true);
    setDialogError(null);
    try {
      const { comment } = await draftReview({ rating: reviewRating, ...(reviewKeywords ? { keywords: reviewKeywords } : {}) });
      setReviewComment(comment);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Échec de la génération.");
    } finally {
      setAiDrafting(false);
    }
  }

  async function handleSubmitReview() {
    if (!reviewBookingId) return;
    setSubmitting(true);
    setDialogError(null);
    try {
      await createReview({
        bookingId: reviewBookingId,
        rating: reviewRating,
        ...(reviewComment ? { comment: reviewComment } : {}),
      });
      setReviewedBookingIds((current) => new Set(current).add(reviewBookingId));
      setReviewBookingId(null);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  }

  function openDispute(bookingId: string) {
    setDisputeReason('');
    setDisputeDetails('');
    setDialogError(null);
    setDisputeBookingId(bookingId);
  }

  async function handleSubmitDispute() {
    if (!disputeBookingId || !disputeReason) return;
    setSubmitting(true);
    setDialogError(null);
    try {
      await createDispute({
        bookingId: disputeBookingId,
        reason: disputeReason,
        ...(disputeDetails ? { details: disputeDetails } : {}),
      });
      setDisputeBookingId(null);
      await load();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return <EmptyState title={error} action={<Button asChild><Link href="/login">Se connecter</Link></Button>} />;
  }

  if (!bookings) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="Aucune réservation"
        description="Explorez la marketplace pour réserver votre premier service."
        action={<Button asChild><Link href="/marketplace">Explorer les services</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Mes réservations</h1>
      {bookings.map((booking) => {
        const isPaid = booking.order?.payments?.some((payment) => payment.status === 'SUCCEEDED') ?? false;
        const canPay = booking.status === 'CONFIRMED' && booking.order && !isPaid;

        return (
          <Card key={booking.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-medium">{booking.items[0]?.service.title}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(booking.scheduledAt).toLocaleString('fr-FR')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_VARIANT[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
                {isPaid && <Badge variant="success">Payée</Badge>}
                {booking.order && (
                  <span className="text-sm font-medium">
                    {Number(booking.order.totalAmount).toLocaleString('fr-FR')} {booking.order.currency}
                  </span>
                )}
                {canPay && (
                  <Button
                    size="sm"
                    disabled={payingOrderId === booking.order!.id}
                    onClick={() => handlePay(booking.order!.id)}
                  >
                    {payingOrderId === booking.order!.id ? 'Paiement…' : 'Payer maintenant'}
                  </Button>
                )}
                {['PENDING', 'CONFIRMED'].includes(booking.status) && (
                  <Button variant="outline" size="sm" onClick={() => handleCancel(booking.id)}>
                    Annuler
                  </Button>
                )}
                {booking.status === 'COMPLETED' && !reviewedBookingIds.has(booking.id) && (
                  <Button variant="outline" size="sm" onClick={() => openReview(booking.id)}>
                    Laisser un avis
                  </Button>
                )}
                {['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status) && (
                  <Button variant="outline" size="sm" onClick={() => openDispute(booking.id)}>
                    Signaler un problème
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={reviewBookingId !== null} onOpenChange={(open) => !open && setReviewBookingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laisser un avis</DialogTitle>
          </DialogHeader>
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          <div className="space-y-3">
            <div>
              <Label>Note</Label>
              <div className="mt-1 flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => setReviewRating(value)}>
                    <Star
                      className={`size-6 ${value <= reviewRating ? 'fill-current text-amber-500' : 'text-muted-foreground'}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-keywords">Mots-clés (optionnel)</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="review-keywords"
                  placeholder="ex. rapide, professionnel, prix correct"
                  value={reviewKeywords}
                  onChange={(e) => setReviewKeywords(e.target.value)}
                />
                <Button type="button" variant="outline" size="sm" disabled={aiDrafting} onClick={handleDraftReview}>
                  {aiDrafting ? '…' : 'IA ✨'}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="review-comment">Commentaire (optionnel)</Label>
              <Textarea
                id="review-comment"
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={submitting} onClick={handleSubmitReview}>
              {submitting ? 'Envoi…' : 'Publier l’avis'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disputeBookingId !== null} onOpenChange={(open) => !open && setDisputeBookingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler un problème</DialogTitle>
          </DialogHeader>
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          <div className="space-y-3">
            <div>
              <Label htmlFor="dispute-reason">Motif</Label>
              <Input id="dispute-reason" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dispute-details">Détails (optionnel)</Label>
              <Textarea
                id="dispute-details"
                rows={3}
                value={disputeDetails}
                onChange={(e) => setDisputeDetails(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={submitting || !disputeReason} onClick={handleSubmitDispute}>
              {submitting ? 'Envoi…' : 'Envoyer le signalement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
