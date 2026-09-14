import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { TEST_DATABASE_URL } from "./src/shared/testing/test-db";

export default async function setup() {
  const databaseName = new URL(TEST_DATABASE_URL).pathname.slice(1);
  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = "/postgres";

  const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => {} });
  const [existing] =
    await admin`select 1 from pg_database where datname = ${databaseName}`;
  if (!existing) {
    await admin.unsafe(`create database "${databaseName}"`);
  }
  await admin.end();

  const client = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
}
