import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Button, Card, CardDescription, CardHeader, CardTitle } from '@flowmarket/ui';
import { getCategories, searchServices } from '@/lib/api';
import { ServiceCard } from '@/components/service-card';

const VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: 'Prestataires vérifiés',
    description: 'Chaque prestataire est vérifié avant de pouvoir publier ses services.',
  },
  {
    icon: Zap,
    title: 'Réservation rapide',
    description: 'Réservez et payez en ligne en quelques minutes, en toute sécurité.',
  },
  {
    icon: Sparkles,
    title: 'Qualité garantie',
    description: 'Avis vérifiés et politique de remboursement claire sur chaque commande.',
  },
];

export default async function HomePage() {
  const [categories, popularServices] = await Promise.all([
    getCategories(),
    searchServices({ sort: 'rating', limit: 3 }),
  ]);

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Trouvez le bon prestataire pour votre prochain projet
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          FlowMarket connecte des clients à des prestataires de services vérifiés : développement,
          design, rédaction, marketing et plus encore.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/marketplace">
              Explorer les services
              <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/register">Devenir prestataire</Link>
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/marketplace?category=${category.slug}`}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className="size-8 text-primary" aria-hidden="true" />
                  <CardTitle className="mt-2">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {popularServices.hits.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Services populaires</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Une sélection de services demandés par la communauté.
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/marketplace">
                Voir tout
                <ArrowRight />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {popularServices.hits.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
