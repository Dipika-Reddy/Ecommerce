import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Load environment variables immediately to avoid ES module import execution ordering bugs
dotenv.config();

// Use the DIRECT_URL (session-mode pooler, port 5432) which is fully compatible
// with Prisma's prepared statements. The transaction-mode pgBouncer pooler (port 6543)
// breaks Prisma because it doesn't support prepared statements across pool hops.
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

// Create connection pool with keep-alive and retry settings
const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  // Keep connections warm — prevents "can't reach database" on cold connections
  min: 1,
  max: 10,
  idleTimeoutMillis: 30000,       // close idle connections after 30s
  connectionTimeoutMillis: 10000, // fail fast if no connection in 10s
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Log pool errors so they don't crash the process silently
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Establishes and verifies connection to PostgreSQL (Supabase)
// Retries up to 3 times with exponential back-off before giving up.
const connectDB = async (retries = 3, delayMs = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      const host = client.host || 'supabase';
      client.release();
      console.log(`PostgreSQL Connected (attempt ${attempt}): ${host}`);
      return; // success
    } catch (error) {
      console.error(`[DB] Connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * attempt)); // exponential back-off
      } else {
        console.error('[DB] All connection attempts failed. Exiting.');
        process.exit(1);
      }
    }
  }
};

export { prisma };
export default connectDB;
