import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  CORS_ORIGINS: z.string().default(''),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  MEILI_HOST: z.string().default('http://localhost:7700'),
  MEILI_MASTER_KEY: z.string().min(1, 'MEILI_MASTER_KEY is required'),
  API_PUBLIC_URL: z.string().default('http://localhost:4000'),
  WEB_PUBLIC_URL: z.string().default('http://localhost:3000'),
  // 'mock' (defaut) route les paiements vers le provider factice pour le developpement
  // et les tests, sans jamais appeler de vraie API de paiement. 'live' l'interdit.
  PAYMENT_PROVIDER_MODE: z.enum(['mock', 'live']).default('mock'),
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  FLUTTERWAVE_SECRET_KEY: z.string().default(''),
  FLUTTERWAVE_WEBHOOK_HASH: z.string().default(''),
  CINETPAY_API_KEY: z.string().default(''),
  CINETPAY_SITE_ID: z.string().default(''),
  CINETPAY_TRANSFER_LOGIN: z.string().default(''),
  CINETPAY_TRANSFER_PASSWORD: z.string().default(''),
  PAYDUNYA_MASTER_KEY: z.string().default(''),
  PAYDUNYA_PRIVATE_KEY: z.string().default(''),
  PAYDUNYA_TOKEN: z.string().default(''),
  PAYDUNYA_STORE_NAME: z.string().default('FlowMarket'),
  // SMTP_HOST vide (defaut) => mode dev : les emails sont loggues au lieu
  // d'etre envoyes, sans jamais appeler de vrai serveur SMTP.
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  // z.coerce.boolean() transformerait la chaine "false" en true (non-vide) ;
  // on compare explicitement a la chaine attendue.
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  MAIL_FROM: z.string().default('FlowMarket <no-reply@flowmarket.dev>'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }

  return result.data;
}
