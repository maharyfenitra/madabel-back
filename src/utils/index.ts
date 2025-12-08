import { PrismaClient } from "../../generated/prisma";

export const prisma = new PrismaClient();

// Export all helpers
export * from './helpers';

// Export all services
export * from './services';