import { Pool } from "pg";

declare global {
  var _pgPool: Pool | undefined;
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres connection string in your environment variables."
    );
  }
  if (!global._pgPool) {
    global._pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return global._pgPool;
}

export const pool = {
  query: (text: string, params?: unknown[]) => getPool().query(text, params),
};

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool
      .query(`
        CREATE TABLE IF NOT EXISTS submissions (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          rep_name TEXT NOT NULL,
          sales_team TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          customer_address TEXT NOT NULL,
          down_payment_amount NUMERIC(12,2) NOT NULL,
          deposit_date DATE NOT NULL,
          check_photo_url TEXT NOT NULL,
          deposit_slip_url TEXT NOT NULL,
          notes TEXT
        );
      `)
      .then(() => undefined)
      .catch((err) => {
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

export type Submission = {
  id: number;
  created_at: string;
  rep_name: string;
  sales_team: string;
  customer_name: string;
  customer_address: string;
  down_payment_amount: string;
  deposit_date: string;
  check_photo_url: string;
  deposit_slip_url: string;
  notes: string | null;
};
