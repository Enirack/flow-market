'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@flowmarket/ui';
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/lib/api';

const POLL_INTERVAL_MS = 30_000;

function describeNotification(n: NotificationItem): string {
  const p = n.payload as Record<string, string | number | null | undefined>;

  switch (n.type) {
    case 'BOOKING_CREATED':
      return `${p.counterpartName} a réservé « ${p.serviceTitle} »`;
    case 'BOOKING_CONFIRMED':
      return `${p.counterpartName} a confirmé « ${p.serviceTitle} »`;
    case 'BOOKING_CANCELLED':
      return `Réservation annulée : ${p.serviceTitle}`;
    case 'PAYMENT_RECEIVED':
      return `Paiement reçu pour « ${p.serviceTitle} »`;
    case 'PAYMENT_FAILED':
      return `Échec de paiement pour « ${p.serviceTitle} »`;
    case 'REFUND_PROCESSED':
      return `Remboursement traité pour « ${p.serviceTitle} »`;
    case 'NEW_REVIEW':
      return `${p.clientName} a laissé un avis ${p.rating}/5 sur « ${p.serviceTitle} »`;
    case 'PAYOUT_PROCESSED':
      return `Virement ${p.status === 'PAID' ? 'effectué' : p.status === 'FAILED' ? 'échoué' : 'rejeté'}`;
    case 'DISPUTE_OPENED':
      return `Litige ouvert : ${p.serviceTitle}`;
    case 'DISPUTE_RESOLVED':
      return `Litige ${p.status === 'RESOLVED' ? 'résolu' : 'rejeté'} : ${p.serviceTitle}`;
    default:
      return 'Nouvelle notification';
  }
}

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    try {
      const page = await getMyNotifications();
      setNotifications(page.notifications);
      setUnreadCount(page.unreadCount);
    } catch {
      // Silencieux : la cloche n'est pas critique pour le reste de l'interface.
    }
  }

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  async function handleItemClick(notification: NotificationItem) {
    if (notification.readAt) return;
    try {
      await markNotificationRead(notification.id);
      void load();
    } catch {
      // Silencieux : une erreur ici ne doit pas bloquer le reste de l'interface.
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      void load();
    } catch {
      // Silencieux : une erreur ici ne doit pas bloquer le reste de l'interface.
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1 text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:underline"
            >
              Tout marquer lu
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">Aucune notification</p>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              onClick={() => handleItemClick(notification)}
              className="flex flex-col items-start gap-0.5 whitespace-normal"
            >
              <span className={notification.readAt ? 'text-muted-foreground' : 'font-medium'}>
                {describeNotification(notification)}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(notification.createdAt).toLocaleString('fr-FR')}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
