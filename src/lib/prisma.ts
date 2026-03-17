import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;

// Optymalizacja connection pool dla VPS
const pool = new Pool({
  connectionString,
  max: parseInt(process.env.DB_POOL_MAX || '10'), // Maksymalna liczba połączeń
  min: parseInt(process.env.DB_POOL_MIN || '2'), // Minimalna liczba połączeń
  idleTimeoutMillis: 30000, // Zamknij bezczynne połączenia po 30s
  connectionTimeoutMillis: 10000, // Timeout przy nawiązywaniu połączenia
  maxUses: 7500, // Maksymalna liczba użyć połączenia przed recyclingiem
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Graceful shutdown - zamknij połączenia przy wyłączaniu
if (process.env.NODE_ENV === "production") {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });
}

export default prisma;

