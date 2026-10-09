'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, LayoutDashboard, MessageSquare, Settings } from 'lucide-react';
import { SidebarNav } from '@flowmarket/ui';
import { NotificationsBell } from '@/components/notifications-bell';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Vue d’ensemble', icon: <LayoutDashboard /> },
  { href: '/dashboard/bookings', label: 'Réservations', icon: <CalendarDays /> },
  { href: '/dashboard/messages', label: 'Messages', icon: <MessageSquare /> },
  { href: '/dashboard/settings', label: 'Paramètres', icon: <Settings /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl">
      <aside className="hidden w-56 shrink-0 border-r border-border p-4 md:block">
        <Link href="/" className="mb-6 block text-lg font-semibold">
          FlowMarket
        </Link>
        <SidebarNav items={NAV_ITEMS} activeHref={pathname} linkComponent={Link} />
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-end border-b border-border p-4">
          <NotificationsBell />
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
