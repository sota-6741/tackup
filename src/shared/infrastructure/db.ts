import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";

const globalForDb = globalThis as unknown as { client?: postgres.Sql };

const client = globalForDb.client ?? postgres(env.DATABASE_URL);
if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client);

export type Db = typeof db;

type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type DbExecutor = Db | Transaction;
