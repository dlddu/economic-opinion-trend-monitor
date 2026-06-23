import { afterEach, describe, expect, it, vi } from "vitest";
import { api, getJSON } from "./client";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(ok: boolean, body: unknown, status = ok ? 200 : 500) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status,
      statusText: ok ? "OK" : "Error",
      json: async () => body,
    })),
  );
}

describe("api client", () => {
  it("parses JSON on a 2xx response", async () => {
    stubFetch(true, { status: "ok" });
    await expect(api.health()).resolves.toEqual({ status: "ok" });
  });

  it("throws with the status code on a non-2xx response", async () => {
    stubFetch(false, {});
    await expect(getJSON("/dashboard")).rejects.toThrow(/500/);
  });
});
