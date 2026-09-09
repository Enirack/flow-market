'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@flowmarket/ui';
import { ApiError, createBooking, getAvailableSlots } from '@/lib/api';

interface BookingDialogProps {
  serviceId: string;
  serviceTitle: string;
  options: { id: string; name: string; priceDelta: string }[];
}

export function BookingDialog({ serviceId, serviceTitle, options }: BookingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<string[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function loadSlots(nextDate: string) {
    setDate(nextDate);
    setSelectedSlot(null);
    setSlots(null);
    setError(null);
    if (!nextDate) return;

    try {
      setSlots(await getAvailableSlots(serviceId, nextDate));
    } catch {
      setError('Impossible de charger les disponibilités pour cette date.');
    }
  }

  function toggleOption(optionId: string) {
    setSelectedOptions((current) =>
      current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId],
    );
  }

  async function handleConfirm() {
    if (!selectedSlot) return;
    setPending(true);
    setError(null);
    try {
      await createBooking({ serviceId, scheduledAt: selectedSlot, optionIds: selectedOptions });
      setOpen(false);
      router.push('/dashboard/bookings');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'La réservation a échoué.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          Réserver ce service
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réserver « {serviceTitle} »</DialogTitle>
          <DialogDescription>Choisissez une date pour voir les créneaux disponibles.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="booking-date">Date</Label>
          <Input
            id="booking-date"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={date}
            onChange={(event) => void loadSlots(event.target.value)}
          />
        </div>

        {slots && (
          <div>
            <Label>Créneaux disponibles</Label>
            {slots.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Aucun créneau disponible ce jour-là.</p>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    variant={selectedSlot === slot ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {new Date(slot).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {options.length > 0 && (
          <div>
            <Label>Options</Label>
            <div className="mt-2 space-y-2">
              {options.map((option) => (
                <label key={option.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option.id)}
                    onChange={() => toggleOption(option.id)}
                    className="size-4 rounded border-input"
                  />
                  {option.name} (+{Number(option.priceDelta).toLocaleString('fr-FR')})
                </label>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button disabled={!selectedSlot || pending} onClick={handleConfirm}>
            {pending ? 'Réservation…' : 'Confirmer la réservation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
