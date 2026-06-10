import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.ts';

export const createPool = () => {
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    port: Number(process.env.SQL_PORT) || 5432,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : (process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : false),
    connectionTimeoutMillis: 15000,
  });
};

const pool = createPool();

// Prevent unhandled pool-level errors from crashing the application
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });
export { schema };
