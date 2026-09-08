import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

export function Spinner({ className, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <Loader2
      role="status"
      aria-label="Chargement"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}
