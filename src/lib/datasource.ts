// Datasource resolution for the ledger DB.
//
// Local development uses a SQLite file (`file:./ledger.db`).
// Hosted environments (Vercel) use a remote libSQL database with an auth token,
// because the container filesystem — including `/tmp` — is per-instance and
// ephemeral: writes there do not survive cold starts or instance rotation.
//
// URL:   DATABASE_URL | TURSO_DATABASE_URL
// Token: DATABASE_AUTH_TOKEN | TURSO_AUTH_TOKEN

export const DEFAULT_LOCAL_URL = "file:./ledger.db";

export type DatasourceConfig = {
  url: string;
  authToken?: string;
};

const REMOTE_PROTOCOL = /^(libsql|wss?|https?):/i;

export function isRemoteDatasource(url: string): boolean {
  return REMOTE_PROTOCOL.test(url);
}

/** First defined, non-blank value. An empty env var must not shadow a real one. */
function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined && value.trim() !== "");
}

/**
 * Build the libSQL client config from the environment.
 *
 * A remote URL without a token fails closed with an actionable message rather
 * than surfacing an opaque operator error on the first query.
 */
export function resolveDatasource(
  env: Record<string, string | undefined> = process.env,
): DatasourceConfig {
  // `DATABASE_URL` is this project's name; `TURSO_DATABASE_URL` is what Turso's
  // own quickstart tells you to set, so accept either.
  const url = firstNonEmpty(env.DATABASE_URL, env.TURSO_DATABASE_URL) ?? DEFAULT_LOCAL_URL;
  if (!isRemoteDatasource(url)) {
    return { url };
  }

  // Either name is accepted; Turso's SDK examples use TURSO_AUTH_TOKEN.
  const authToken = firstNonEmpty(env.DATABASE_AUTH_TOKEN, env.TURSO_AUTH_TOKEN);
  if (!authToken) {
    throw new Error(
      `Remote libSQL database at ${url} requires an auth token — set DATABASE_AUTH_TOKEN ` +
        `(or TURSO_AUTH_TOKEN) alongside DATABASE_URL (or TURSO_DATABASE_URL), or use a file: URL ` +
        `locally (see .env.example).`,
    );
  }
  return { url, authToken };
}
