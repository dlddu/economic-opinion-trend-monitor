import { ApiError } from "./client";

// The screens that read Bronze and Silver ask an index the batch builds after each run; before
// the first build the API answers 503 index_not_ready, which is a wait, not a failure.
export const INDEX_NOT_READY = "index_not_ready";

export function errorText(e: unknown): string {
  return e instanceof ApiError && e.code === INDEX_NOT_READY ? INDEX_NOT_READY : String(e);
}
