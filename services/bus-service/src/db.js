import { PrismaClient } from '../generated/client/index.js';

const globalForPrisma = globalThis;

/** Singleton — required for Vercel/serverless to avoid exhausting the pool. */
export const prisma =
  globalForPrisma.__nhpaowaBusPrisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === 'true' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__nhpaowaBusPrisma = prisma;
}
