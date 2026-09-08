import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Hash de mot de passe simplifié pour les données de démonstration uniquement.
 * Le module d'authentification (Phase 3) définira le hashing de production (Argon2).
 * Mot de passe pour tous les comptes de seed : "Password123!"
 */
function seedPasswordHash(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = seedPasswordHash('Password123!');

  // --- Catégories ---
  const webDev = await prisma.category.create({
    data: { name: 'Développement web', slug: 'developpement-web' },
  });
  const design = await prisma.category.create({
    data: { name: 'Design graphique', slug: 'design-graphique' },
  });
  await prisma.category.create({
    data: {
      name: 'Sites e-commerce',
      slug: 'sites-ecommerce',
      parentId: webDev.id,
    },
  });

  // --- Plans d'abonnement ---
  const [freePlan, proPlan] = await Promise.all([
    prisma.subscriptionPlan.create({
      data: {
        code: 'FREE',
        name: 'Free',
        priceMonthly: 0,
        features: { maxServices: 3, featuredListing: false, analytics: false },
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        code: 'PRO',
        name: 'Pro',
        priceMonthly: 15000,
        features: { maxServices: 20, featuredListing: true, analytics: true },
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        code: 'BUSINESS',
        name: 'Business',
        priceMonthly: 40000,
        features: {
          maxServices: -1,
          featuredListing: true,
          analytics: true,
          prioritySupport: true,
        },
      },
    }),
  ]);

  // --- Admin ---
  await prisma.user.create({
    data: {
      email: 'admin@flowmarket.dev',
      passwordHash,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
      profile: { create: { firstName: 'Admin', lastName: 'FlowMarket' } },
    },
  });

  // --- Client ---
  const client = await prisma.user.create({
    data: {
      email: 'client@flowmarket.dev',
      passwordHash,
      role: 'CLIENT',
      emailVerifiedAt: new Date(),
      profile: { create: { firstName: 'Aïcha', lastName: 'Diallo', country: 'BJ' } },
    },
  });

  // --- Prestataire ---
  const providerUser = await prisma.user.create({
    data: {
      email: 'provider@flowmarket.dev',
      passwordHash,
      role: 'PROVIDER',
      emailVerifiedAt: new Date(),
      profile: { create: { firstName: 'Karim', lastName: 'Traoré', country: 'BJ' } },
      provider: {
        create: {
          businessName: 'Karim Studio',
          slug: 'karim-studio',
          bio: 'Développeur web freelance spécialisé en sites vitrines et e-commerce.',
          ratingAvg: 4.8,
          ratingCount: 12,
          verification: {
            create: { status: 'APPROVED', documents: [], reviewedAt: new Date() },
          },
          subscription: {
            create: { planId: proPlan.id, currentPeriodEnd: new Date(Date.now() + 30 * 86400_000) },
          },
          balance: { create: { availableAmount: 45000, pendingAmount: 15000 } },
          availabilities: {
            create: [
              { type: 'RECURRING', weekday: 1, startTime: '09:00', endTime: '18:00' },
              { type: 'RECURRING', weekday: 2, startTime: '09:00', endTime: '18:00' },
              { type: 'RECURRING', weekday: 3, startTime: '09:00', endTime: '18:00' },
            ],
          },
        },
      },
    },
    include: { provider: true },
  });

  const provider = providerUser.provider!;

  const service = await prisma.service.create({
    data: {
      providerId: provider.id,
      categoryId: webDev.id,
      title: 'Création de site vitrine',
      slug: 'creation-site-vitrine-karim-studio',
      description: 'Un site vitrine professionnel livré en 5 jours ouvrés.',
      priceType: 'FIXED',
      basePrice: 150000,
      durationMinutes: 120,
      status: 'PUBLISHED',
      images: { create: [{ url: 'https://placehold.co/800x600', position: 0 }] },
      options: { create: [{ name: 'Livraison express (48h)', priceDelta: 25000 }] },
    },
  });

  await prisma.service.create({
    data: {
      providerId: provider.id,
      categoryId: design.id,
      title: 'Création de logo',
      slug: 'creation-logo-karim-studio',
      description: 'Identité visuelle et logo professionnel avec 3 propositions.',
      priceType: 'PACKAGE',
      basePrice: 50000,
      status: 'PUBLISHED',
    },
  });

  // --- Réservation + commande + paiement + avis (scénario complet) ---
  const booking = await prisma.booking.create({
    data: {
      clientId: client.id,
      providerId: provider.id,
      scheduledAt: new Date(Date.now() - 7 * 86400_000),
      durationMinutes: 120,
      status: 'COMPLETED',
      items: {
        create: [{ serviceId: service.id, quantity: 1, unitPrice: 150000, subtotal: 150000 }],
      },
    },
    include: { items: true },
  });

  const order = await prisma.order.create({
    data: {
      bookingId: booking.id,
      clientId: client.id,
      subtotalAmount: 150000,
      platformFeeAmount: 15000,
      providerAmount: 135000,
      totalAmount: 150000,
      status: 'COMPLETED',
      items: {
        create: booking.items.map((item) => ({
          bookingItemId: item.id,
          description: 'Création de site vitrine',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
      },
    },
  });

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: 'STRIPE',
      providerPaymentId: 'pi_seed_demo_1',
      amount: 150000,
      status: 'SUCCEEDED',
      idempotencyKey: 'seed-demo-payment-1',
      transactions: {
        create: [
          {
            type: 'CAPTURED',
            providerEventId: 'evt_seed_demo_1',
            amount: 150000,
            rawPayload: { source: 'seed' },
          },
        ],
      },
    },
  });

  await prisma.review.create({
    data: {
      bookingId: booking.id,
      clientId: client.id,
      providerId: provider.id,
      rating: 5,
      comment: 'Travail impeccable et livré dans les délais, je recommande.',
    },
  });

  console.log('Seed terminé.');
  console.log(`Utilisateurs créés — mot de passe pour tous : "Password123!"`);
  console.log(`  admin@flowmarket.dev / client@flowmarket.dev / provider@flowmarket.dev`);
  console.log(`Paiement de démonstration : ${payment.id}`);
  console.log(`Plans créés : ${[freePlan.code, proPlan.code].join(', ')}, BUSINESS`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
