import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// CI は環境変数を直接渡す。ローカルでは Next.js と同じ .env を読む。
if (!process.env.DATABASE_URL) process.loadEnvFile();

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) throw new Error("e2e には DATABASE_URL が要ります");

/** アプリと同じ DB。ログインの準備と、画面からは見えない登録の結果の確認に使う。 */
export const e2eDb = drizzle(postgres(DATABASE_URL, { max: 1 }));
