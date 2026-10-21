import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

/** Singleton — required for Vercel/serverless to avoid exhausting the pool. */
export const prisma =
  globalForPrisma.__nhpaowaInventoryPrisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === 'true' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__nhpaowaInventoryPrisma = prisma;
}

/** Derive item stock status — never accept client-written status. */
export function deriveItemStatus(currentStock, minStockLevel) {
  const stock = Number(currentStock);
  const min = Number(minStockLevel);
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= min) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function withItemStatus(item) {
  if (!item) return item;
  const { currentStock, minStockLevel, ...rest } = item;
  return {
    ...rest,
    currentStock,
    minStockLevel,
    unitPrice: item.unitPrice,
    status: deriveItemStatus(currentStock, minStockLevel),
  };
}

export function decimal(n) {
  return Number(n);
}

export function serializeDecimals(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'object' && typeof obj.toNumber === 'function') {
    return obj.toNumber();
  }
  if (Array.isArray(obj)) return obj.map(serializeDecimals);
  if (typeof obj === 'object' && obj instanceof Date) return obj;
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeDecimals(v);
    }
    return out;
  }
  return obj;
}
