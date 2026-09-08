import * as React from 'react';
import { cn } from '../lib/cn';

export interface SidebarNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SidebarNavProps {
  items: SidebarNavItem[];
  activeHref?: string;
  className?: string;
  /** Composant de lien à utiliser (ex: `next/link`). Par défaut, une balise `<a>` native. */
  linkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
    'aria-current'?: 'page' | undefined;
  }>;
}

export function SidebarNav({ items, activeHref, className, linkComponent }: SidebarNavProps) {
  const LinkComp = linkComponent ?? 'a';

  return (
    <nav className={cn('flex flex-col gap-1', className)}>
      {items.map((item) => {
        const isActive = activeHref === item.href;
        return (
          <LinkComp
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4 [&_svg]:shrink-0',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {item.icon}
            {item.label}
          </LinkComp>
        );
      })}
    </nav>
  );
}
