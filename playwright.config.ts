import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/browser",
  snapshotPathTemplate: "{testDir}/goldens/{arg}{ext}",
  expect: { toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.01 } },
  use: {
    browserName: "chromium",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: "dark"
  },
  webServer: {
    command: "node test/server.mjs",
    port: 4173,
    reuseExistingServer: true
  }
});
