/**
 * Données de démonstration pour la foundation UI (Phase 4).
 * Remplacées par de vraies requêtes API en Phase 5 (marketplace).
 */

export interface MockService {
  slug: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  provider: { slug: string; name: string; avatarInitials: string };
}

export interface MockProvider {
  slug: string;
  name: string;
  bio: string;
  avatarInitials: string;
  rating: number;
  reviewCount: number;
  servicesCount: number;
  memberSince: string;
}

export const mockCategories = [
  'Développement web',
  'Design graphique',
  'Rédaction & traduction',
  'Marketing digital',
  'Vidéo & audio',
];

export const mockServices: MockService[] = [
  {
    slug: 'creation-site-vitrine-karim-studio',
    title: 'Création de site vitrine professionnel',
    description: 'Un site vitrine moderne et responsive, livré en 5 jours ouvrés.',
    category: 'Développement web',
    price: 150000,
    currency: 'XOF',
    rating: 4.8,
    reviewCount: 12,
    provider: { slug: 'karim-studio', name: 'Karim Studio', avatarInitials: 'KS' },
  },
  {
    slug: 'creation-logo-karim-studio',
    title: 'Création de logo et identité visuelle',
    description: '3 propositions de logo avec charte graphique complète.',
    category: 'Design graphique',
    price: 50000,
    currency: 'XOF',
    rating: 4.9,
    reviewCount: 8,
    provider: { slug: 'karim-studio', name: 'Karim Studio', avatarInitials: 'KS' },
  },
  {
    slug: 'redaction-articles-blog',
    title: 'Rédaction d’articles de blog optimisés SEO',
    description: 'Articles engageants et optimisés pour le référencement naturel.',
    category: 'Rédaction & traduction',
    price: 25000,
    currency: 'XOF',
    rating: 4.7,
    reviewCount: 21,
    provider: { slug: 'plume-digitale', name: 'Plume Digitale', avatarInitials: 'PD' },
  },
  {
    slug: 'campagne-reseaux-sociaux',
    title: 'Gestion de campagne réseaux sociaux',
    description: 'Stratégie et gestion mensuelle de vos réseaux sociaux.',
    category: 'Marketing digital',
    price: 90000,
    currency: 'XOF',
    rating: 4.6,
    reviewCount: 15,
    provider: { slug: 'growth-lab', name: 'Growth Lab', avatarInitials: 'GL' },
  },
];

export const mockProviders: Record<string, MockProvider> = {
  'karim-studio': {
    slug: 'karim-studio',
    name: 'Karim Studio',
    bio: 'Développeur web freelance spécialisé en sites vitrines et e-commerce. Plus de 8 ans d’expérience.',
    avatarInitials: 'KS',
    rating: 4.8,
    reviewCount: 12,
    servicesCount: 2,
    memberSince: '2024',
  },
};

export const mockPlans = [
  {
    code: 'FREE',
    name: 'Free',
    price: 0,
    description: 'Pour démarrer et tester la plateforme.',
    features: ['3 services publiés', 'Profil public', 'Support communautaire'],
  },
  {
    code: 'PRO',
    name: 'Pro',
    price: 15000,
    description: 'Pour les prestataires qui veulent grandir.',
    features: [
      '20 services publiés',
      'Mise en avant dans les recherches',
      'Statistiques avancées',
      'Support prioritaire',
    ],
    highlighted: true,
  },
  {
    code: 'BUSINESS',
    name: 'Business',
    price: 40000,
    description: 'Pour les équipes et volumes importants.',
    features: [
      'Services illimités',
      'Mise en avant premium',
      'Statistiques avancées',
      'Support dédié',
    ],
  },
];
