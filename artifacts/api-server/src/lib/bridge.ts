import { logger } from "./logger";

export type Row = Record<string, unknown>;

export function getDbBridgeUrl(): string | null {
  return process.env.DB_BRIDGE_URL ?? null;
}

export function isDbBridgeConfigured(): boolean {
  return !!process.env.DB_BRIDGE_URL;
}

export async function pingDbBridge(): Promise<boolean> {
  const url = getDbBridgeUrl();
  if (!url) return false;
  try {
    const resp = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5_000) });
    return resp.ok;
  } catch {
    return false;
  }
}

interface BridgeResponse<T> {
  rows?: T[];
  row_count?: number;
}

async function callBridge<T extends Row>(
  sql: string,
  params: unknown[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  const url = getDbBridgeUrl();
  if (!url) throw new Error("DB_BRIDGE_URL não configurado");

  const response = await fetch(`${url}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`DB Bridge /query retornou ${response.status}: ${body}`);
  }

  const data = await response.json() as BridgeResponse<T> | T[];

  if (Array.isArray(data)) {
    return { rows: data as T[], rowCount: (data as T[]).length };
  }

  const rows = (data as BridgeResponse<T>).rows ?? [];
  const rowCount = (data as BridgeResponse<T>).row_count ?? rows.length;
  return { rows, rowCount };
}

export async function bridgeQuery<T extends Row = Row>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const { rows } = await callBridge<T>(sql, params);
  return rows;
}

export async function bridgeQueryOne<T extends Row = Row>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await bridgeQuery<T>(sql, params);
  return rows[0] ?? null;
}

export async function bridgeExecute(
  sql: string,
  params: unknown[] = []
): Promise<{ rowCount: number; rows: Row[] }> {
  return callBridge(sql, params);
}

export function col<T = unknown>(row: Row, name: string): T {
  return row[name] as T;
}

export function toIso(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return new Date(val).toISOString();
  return String(val);
}
