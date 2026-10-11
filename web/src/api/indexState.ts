import { ApiError } from "./client";

export const INDEX_NOT_READY = "index_not_ready";

export function errorText(e: unknown): string {
  return e instanceof ApiError && e.code === INDEX_NOT_READY ? INDEX_NOT_READY : String(e);
}
