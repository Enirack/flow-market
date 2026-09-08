import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

declare global {
  var __flowmarketPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__flowmarketPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__flowmarketPrisma = prisma;
}

export * from './generated/prisma/client';
export * from './generated/prisma/enums';
