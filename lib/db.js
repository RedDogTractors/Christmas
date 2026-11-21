import { neon } from '@neondatabase/serverless';

let client;

// Tagged-template SQL helper: sql`SELECT ... WHERE id = ${id}` (values are parameterized).
export function sql(strings, ...values) {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Connect a Neon database in Vercel → Storage.');
    }
    client = neon(process.env.DATABASE_URL);
  }
  return client(strings, ...values);
}

let schemaReady;

// Creates the tables on first use, so there's no separate migration step.
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        name_key TEXT NOT NULL UNIQUE,
        pin_hash TEXT NOT NULL,
        failed_attempts INT NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        url TEXT,
        price NUMERIC(10,2),
        notes TEXT,
        quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
        removed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS claims (
        item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        quantity INT NOT NULL CHECK (quantity >= 1),
        purchased BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (item_id, user_id)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS group_gifts (
        id SERIAL PRIMARY KEY,
        item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        organizer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purchased BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS group_members (
        group_id INT NOT NULL REFERENCES group_gifts(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(10,2),
        joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (group_id, user_id)
      )`;
      await sql`CREATE INDEX IF NOT EXISTS items_owner_idx ON items(owner_id)`;
      await sql`CREATE INDEX IF NOT EXISTS group_gifts_item_idx ON group_gifts(item_id)`;
    })().catch((err) => {
      schemaReady = undefined;
      throw err;
    });
  }
  return schemaReady;
}
