'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { SidebarNav } from '@flowmarket/ui';
import { clearAccessToken } from '@/lib/auth-client';

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
  const router = useRouter();

  function handleLogout() {
    clearAccessToken();
    router.push('/login');
  }

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border p-4 md:flex md:flex-col md:justify-between">
      <div>
        <Link href="/" className="mb-6 block text-lg font-semibold">
          FlowMarket <span className="text-muted-foreground">Admin</span>
        </Link>
        <SidebarNav items={NAV_ITEMS} activeHref={pathname} linkComponent={Link} />
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Se déconnecter
      </button>
    </aside>
  );
}
