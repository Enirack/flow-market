'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  LayoutDashboard,
  ShieldCheck,
  ShoppingBag,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { SidebarNav } from '@flowmarket/ui';

const NAV_ITEMS = [
  { href: '/', label: 'Vue d’ensemble', icon: <LayoutDashboard /> },
  { href: '/users', label: 'Utilisateurs', icon: <Users /> },
  { href: '/providers', label: 'Prestataires', icon: <ShieldCheck /> },
  { href: '/services', label: 'Services', icon: <ShoppingBag /> },
  { href: '/finance', label: 'Finance', icon: <Wallet /> },
  { href: '/disputes', label: 'Litiges', icon: <AlertTriangle /> },
  { href: '/reviews', label: 'Avis', icon: <Star /> },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border p-4 md:block">
      <Link href="/" className="mb-6 block text-lg font-semibold">
        FlowMarket <span className="text-muted-foreground">Admin</span>
      </Link>
      <SidebarNav items={NAV_ITEMS} activeHref={pathname} linkComponent={Link} />
    </aside>
  );
}
