/**
 * Données de démonstration pour les plans d'abonnement.
 * Remplacées par de vraies requêtes API lorsque la gestion des abonnements
 * prestataire sera implémentée (Phase 8).
 */
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
