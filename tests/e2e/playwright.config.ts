import { defineConfig, devices } from "@playwright/test";

// run.sh passes BASE_URL pointing at the port-forwarded in-cluster Service;
// the fallback matches its E2E_PORT default for ad-hoc local runs.
const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:18080";

export default defineConfig({
  testDir: "./specs",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
