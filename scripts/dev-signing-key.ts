import { generateKeyPairSync } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

const DEV_KEY_PATH = "./.gcs-dev-key.json";

/**
 * ローカルとテストで署名付き URL を作るための、使い捨ての鍵を用意する。
 * エミュレーターは署名を検証しないので、この鍵に価値はない。本番は鍵を持たず、Cloud Run のサービスアカウントで署名する。
 * 環境変数に本物の認証情報が入っていても、この鍵で上書きする（エミュレーター相手の処理が、本物の認証情報で署名しないようにするため）。
 */
export function ensureDevSigningKey(): string {
  const keyPath = DEV_KEY_PATH;
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
  if (existsSync(keyPath)) return keyPath;

  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  const credentials = {
    type: "service_account",
    project_id: "tackup-dev",
    private_key_id: "dev",
    private_key: privateKey,
    client_email: "dev@tackup-dev.iam.gserviceaccount.com",
    token_uri: "https://oauth2.googleapis.com/token",
  };
  writeFileSync(keyPath, `${JSON.stringify(credentials, null, 2)}\n`, {
    mode: 0o600,
  });
  return keyPath;
}
