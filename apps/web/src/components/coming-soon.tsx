import { Sparkles } from 'lucide-react';
import { EmptyState } from '@flowmarket/ui';

export function ComingSoon({ title }: { title: string }) {
  return (
    <EmptyState
      icon={<Sparkles />}
      title={title}
      description="Cette fonctionnalité arrive dans une prochaine phase de développement."
    />
  );
}
