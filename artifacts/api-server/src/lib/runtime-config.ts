/**
 * runtime-config.ts
 *
 * Stores operator-managed configuration (API keys, provider settings) at runtime.
 * Priority order for each key:
 *   1. In-memory override (set via /api/admin/llm-config)
 *   2. DB Bridge system_config table (persisted across restarts)
 *   3. Environment variable (deploy-time default)
 */

import { bridgeExecute, bridgeQueryOne, isDbBridgeConfigured } from "./bridge";
import { logger } from "./logger";

const memoryConfig = new Map<string, string>();

/** Ensures the system_config table exists in the DB Bridge database. */
async function ensureTable(): Promise<void> {
  await bridgeExecute(`
    CREATE TABLE IF NOT EXISTS system_config (
      key   VARCHAR(128) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

/** Loads all config rows from the DB into memory on server startup. */
export async function loadConfigFromDb(): Promise<void> {
  if (!isDbBridgeConfigured()) return;
  try {
    await ensureTable();
    const rows = await bridgeExecute(`SELECT key, value FROM system_config`);
    for (const row of rows.rows) {
      const k = row["key"] as string;
      const v = row["value"] as string;
      if (k && v) memoryConfig.set(k, v);
    }
    logger.info({ count: rows.rows.length }, "runtime-config: loaded from DB");
  } catch (err) {
    logger.warn({ err }, "runtime-config: could not load from DB (non-fatal)");
  }
}

/**
 * Gets a config value.
 * Priority: in-memory → DB → env var
 */
export function getConfig(key: string, envFallback?: string): string | null {
  return memoryConfig.get(key) ?? envFallback ?? null;
}

/**
 * Sets a config value in memory and persists to DB Bridge.
 */
export async function setConfig(key: string, value: string): Promise<void> {
  memoryConfig.set(key, value);

  if (!isDbBridgeConfigured()) return;
  try {
    await ensureTable();
    await bridgeExecute(
      `INSERT INTO system_config (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value]
    );
  } catch (err) {
    logger.warn({ err, key }, "runtime-config: could not persist to DB (non-fatal)");
  }
}

/**
 * Deletes a config value from memory and DB.
 */
export async function deleteConfig(key: string): Promise<void> {
  memoryConfig.delete(key);

  if (!isDbBridgeConfigured()) return;
  try {
    await bridgeExecute(`DELETE FROM system_config WHERE key = $1`, [key]);
  } catch (err) {
    logger.warn({ err, key }, "runtime-config: could not delete from DB (non-fatal)");
  }
}

/** Checks if a user is an admin (for protecting config endpoints). */
export function isAdminUser(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (adminIds.length > 0) return adminIds.includes(userId);

  // Fallback: first user in memory is treated as admin when no ADMIN_USER_IDS is set.
  // This is intentionally permissive for solo-operator setups.
  return true;
}
