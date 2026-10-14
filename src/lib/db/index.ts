/**
 * Adapter factory: getAdapter() returns the configured DataAdapter singleton.
 *
 *   DATA_ADAPTER=sqlite   (default) → better-sqlite3, ./data/bookings.db
 *   DATA_ADAPTER=supabase           → Supabase Postgres (needs SUPABASE_URL +
 *                                    SUPABASE_SERVICE_ROLE_KEY)
 *
 * The singleton is cached on globalThis so Next.js dev hot-reloads and
 * route handlers share one connection pool / DB handle.
 */

import type { DataAdapter } from "./adapter";
import { SqliteAdapter } from "./sqlite";
import { SupabaseAdapter, SupabaseNotConfiguredError } from "./supabase";

declare global {
  // eslint-disable-next-line no-var
  var __cp_adapter: DataAdapter | undefined;
}

export function getAdapter(): DataAdapter {
  if (globalThis.__cp_adapter) return globalThis.__cp_adapter;
  const which = (process.env.DATA_ADAPTER ?? "sqlite").toLowerCase();
  let adapter: DataAdapter;
  if (which === "supabase") {
    adapter = new SupabaseAdapter(); // throws SupabaseNotConfiguredError when env is missing
  } else if (which === "sqlite") {
    adapter = new SqliteAdapter();
  } else {
    throw new Error(
      `Unknown DATA_ADAPTER="${process.env.DATA_ADAPTER}". Use "sqlite" or "supabase".`
    );
  }
  globalThis.__cp_adapter = adapter;
  return adapter;
}

/** For tests: drop the cached adapter so a fresh DB can be opened. */
export function resetAdapter(): void {
  globalThis.__cp_adapter?.close?.();
  globalThis.__cp_adapter = undefined;
}

export { SupabaseNotConfiguredError };
export type { DataAdapter } from "./adapter";
