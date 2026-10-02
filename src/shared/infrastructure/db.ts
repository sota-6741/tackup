import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";

const globalForDb = globalThis as unknown as { client?: postgres.Sql };

// このモジュールは、開発時の再読み込みや、proxy.ts とページのように別々にまとめられたコードから、同じプロセスの中で何度も読み込まれる。
// 接続を 1 つにそろえないと、読み込まれた数だけ接続プールができる。
const client = globalForDb.client ?? postgres(env.DATABASE_URL);
globalForDb.client = client;

export const db = drizzle(client);

export type Db = typeof db;

type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type DbExecutor = Db | Transaction;
