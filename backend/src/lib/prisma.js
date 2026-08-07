import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance across the app (recommended by Prisma docs)
const prisma = new PrismaClient();

export default prisma;
