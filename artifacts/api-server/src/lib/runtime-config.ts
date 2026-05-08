/**
 * runtime-config.ts
 *
 * Stores operator-managed configuration (API keys, provider settings) at runtime.
 * Priority order for each key:
 *   1. In-memory override (set via /api/admin/llm-config)
 *   2. Local PostgreSQL system_config table (persisted across restarts, always available)
 *   3. Environment variable (deploy-time default)
 *
 * DB Bridge is NOT used here — all config lives in Replit local PostgreSQL so
 * the server starts cleanly even when the Mini PC tunnel is offline.
 */

import { localExecute, localQuery, saveLocalDbConfig, deleteLocalDbConfig } from "./local-db";
import { setDbBridgeUrl } from "./bridge";
import { logger } from "./logger";

const memoryConfig = new Map<string, string>();

/** Ensures the system_config table exists in local PostgreSQL. */
async function ensureTable(): Promise<void> {
  await localExecute(`
    CREATE TABLE IF NOT EXISTS system_config (
      key        VARCHAR(128) PRIMARY KEY,
      value      TEXT         NOT NULL,
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
}

/** Loads all config rows from local PostgreSQL into memory on server startup. */
export async function loadConfigFromDb(): Promise<void> {
  try {
    await ensureTable();
    const rows = await localQuery<{ key: string; value: string }>(
      `SELECT key, value FROM system_config`
    );
    for (const row of rows) {
      if (row.key && row.value) memoryConfig.set(row.key, row.value);
    }
    // Also load db_bridge_url from local_config and activate it in the bridge module
    const bridgeRows = await localQuery<{ key: string; value: string }>(
      `SELECT key, value FROM local_config WHERE key = 'db_bridge_url'`
    );
    for (const row of bridgeRows) {
      if (row.key && row.value) {
        memoryConfig.set(row.key, row.value);
        if (row.key === "db_bridge_url") {
          setDbBridgeUrl(row.value);
          logger.info("runtime-config: DB_BRIDGE_URL carregado do banco local");
        }
      }
    }
    logger.info({ count: rows.length }, "runtime-config: configurações carregadas do banco local");
  } catch (err) {
    logger.warn({ err }, "runtime-config: could not load from DB (non-fatal)");
  }
}

/**
 * Gets a config value.
 * Priority: in-memory → env var
 */
export function getConfig(key: string, envFallback?: string): string | null {
  return memoryConfig.get(key) ?? envFallback ?? null;
}

/**
 * Sets a config value in memory and persists to local PostgreSQL.
 * db_bridge_url is routed to local_config for compatibility with the bridge module.
 */
export async function setConfig(key: string, value: string): Promise<void> {
  memoryConfig.set(key, value);

  // db_bridge_url is stored in local_config (shared with bridge module)
  if (key === "db_bridge_url") {
    await saveLocalDbConfig(key, value).catch((err) => {
      logger.warn({ err, key }, "runtime-config: could not persist db_bridge_url to local_config");
    });
    return;
  }

  try {
    await ensureTable();
    await localExecute(
      `INSERT INTO system_config (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value]
    );
  } catch (err) {
    logger.warn({ err, key }, "runtime-config: could not persist to local DB (non-fatal)");
  }
}

/**
 * Deletes a config value from memory and local PostgreSQL.
 */
export async function deleteConfig(key: string): Promise<void> {
  memoryConfig.delete(key);

  if (key === "db_bridge_url") {
    await deleteLocalDbConfig(key).catch(() => {});
    return;
  }

  try {
    await localExecute(`DELETE FROM system_config WHERE key = $1`, [key]);
  } catch (err) {
    logger.warn({ err, key }, "runtime-config: could not delete from local DB (non-fatal)");
  }
}

/** Checks if a user is an admin (for protecting config endpoints). */
export function isAdminUser(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (adminIds.length > 0) return adminIds.includes(userId);

  // Fallback: first user is treated as admin when no ADMIN_USER_IDS is set.
  return true;
}
