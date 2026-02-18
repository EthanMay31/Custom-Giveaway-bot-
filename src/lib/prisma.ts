import { PrismaClient } from '@prisma/client';
import { container } from '@sapphire/framework';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

declare module '@sapphire/pieces' {
  interface Container {
    prisma: PrismaClient;
  }
}

container.prisma = prisma;
