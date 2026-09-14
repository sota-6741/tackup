import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/tackup_test";

const client = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });

export const testDb = drizzle(client);

export async function resetTestDb(): Promise<void> {
  const tables = await testDb.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  if (tables.length === 0) return;
  const names = tables.map(({ tablename }) => `"${tablename}"`).join(", ");
  await testDb.execute(sql.raw(`truncate table ${names} cascade`));
}

export async function closeTestDb(): Promise<void> {
  await client.end();
}
