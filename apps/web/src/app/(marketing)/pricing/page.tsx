import Link from 'next/link';
import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@flowmarket/ui';
import { cn } from '@flowmarket/ui/cn';
import { mockPlans } from '@/lib/mock-data';

export const metadata: Metadata = { title: 'Tarifs' };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight">Des plans pour chaque prestataire</h1>
        <p className="mt-3 text-muted-foreground">
          Commencez gratuitement, évoluez quand votre activité grandit.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {mockPlans.map((plan) => (
          <Card
            key={plan.code}
            className={cn('relative flex flex-col', plan.highlighted && 'border-primary shadow-md')}
          >
            {plan.highlighted && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Le plus populaire</Badge>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <p className="mt-2">
                <span className="text-3xl font-bold">{plan.price.toLocaleString('fr-FR')}</span>
                <span className="text-muted-foreground"> XOF/mois</span>
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <ul className="flex-1 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant={plan.highlighted ? 'default' : 'outline'} asChild>
                <Link href="/register">Choisir {plan.name}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
