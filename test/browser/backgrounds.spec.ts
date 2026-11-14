import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";

const collectionPrefix = "https://raw.githubusercontent.com/twangen/hearthpane/v0.7.0/assets/backgrounds/";
const files = ["misty-mountain-lake.webp", "autumn-woodland.webp", "coastal-sunset.webp", "snow-covered-forest.webp"];

async function open(page: Page) {
  await page.goto("/test/harness.html");
  await expect(page.locator("hearthpane-card .hp-background img")).toHaveAttribute("src", "/test/scenic-background.svg");
}

async function background(page: Page, value: Record<string, unknown>) {
  await page.evaluate((settings) => {
    const harness = (window as any).harness;
    harness.config.background = { ...harness.config.background, rotationInterval: 0, transitionSeconds: 0, ...settings };
    harness.card.setConfig(harness.config);
    harness.card.hass = harness.hass;
  }, value);
}

async function mockCollection(page: Page) {
  await page.route(`${collectionPrefix}*`, (route) => route.fulfill({
    path: join(process.cwd(), "assets/backgrounds", new URL(route.request().url()).pathname.split("/").pop()!),
    contentType: "image/webp",
    headers: { "cache-control": "public, max-age=3600" }
  }));
}

test.describe("hosted backgrounds", () => {
  test("loads the version-pinned collection and rotates without restarting weather", async ({ page }) => {
    await mockCollection(page);
    await open(page);
    await background(page, { source: "collection", rotationInterval: .15, transitionSeconds: .02 });
    const current = page.locator("hearthpane-card .hp-background img");
    await expect(current).toHaveAttribute("src", new RegExp("raw.githubusercontent.com/twangen/hearthpane/v0.7.0/assets/backgrounds/"));
    const first = await current.getAttribute("src");
    const icon = page.locator("hearthpane-card .hp-weather-current .hp-weather-icon");
    await icon.evaluate((element) => element.setAttribute("data-probe", "stable"));
    await expect(current).not.toHaveAttribute("src", first!);
    await expect(icon).toHaveAttribute("data-probe", "stable");
  });

  test("falls back from failed Picsum without changing configuration", async ({ page }) => {
    await mockCollection(page);
    await page.route("https://picsum.photos/**", (route) => route.abort());
    await open(page);
    await background(page, { source: "picsum" });
    await expect(page.locator("hearthpane-card .hp-background img")).toHaveAttribute("src", new RegExp("raw.githubusercontent.com"));
    expect(await page.evaluate(() => (window as any).harness.config.background.source)).toBe("picsum");
  });

  test("preloads before crossfade and ignores stale image responses", async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/delayed-photo.webp", async (route) => {
      await gate;
      await route.fulfill({ path: join(process.cwd(), "assets/backgrounds/coastal-sunset.webp"), contentType: "image/webp" });
    });
    await open(page);
    await background(page, { source: "images", images: ["/test/scenic-background.svg", "/delayed-photo.webp"], rotationInterval: .1, transitionSeconds: .1 });
    await page.waitForTimeout(200);
    await expect(page.locator("hearthpane-card .hp-background img")).toHaveAttribute("src", "/test/scenic-background.svg");
    await expect(page.locator("hearthpane-card .hp-background-next")).toHaveCount(0);
    await background(page, { source: "url", url: "/test/scenic-background-two.svg" });
    await expect(page.locator("hearthpane-card .hp-background img")).toHaveAttribute("src", "/test/scenic-background-two.svg");
    release();
    await page.waitForTimeout(100);
    await expect(page.locator("hearthpane-card .hp-background img")).toHaveAttribute("src", "/test/scenic-background-two.svg");
  });

  test("shows the local gradient on a fresh load when all photo sources fail", async ({ page }) => {
    await page.route(`${collectionPrefix}*`, (route) => route.abort());
    await page.route("**/test/scenic-background.svg", (route) => route.abort());
    await page.goto("/test/harness.html");
    await expect(page.locator("hearthpane-card .hp-background img")).toHaveCount(0);
    await expect(page.locator("hearthpane-card .hp-empty-background")).toBeVisible();
    await expect(page.locator("hearthpane-card .hp-clock-time")).toBeVisible();
  });

  test("recovers from partial collection failure and retains the last photo on total failure", async ({ page }) => {
    await page.route(`${collectionPrefix}*`, (route) => {
      if (route.request().url().endsWith(files[0])) return route.fulfill({ path: join(process.cwd(), "assets/backgrounds", files[0]), contentType: "image/webp" });
      return route.abort();
    });
    await open(page);
    await background(page, { source: "collection", rotationInterval: .1 });
    await expect(page.locator("hearthpane-card .hp-background img")).toHaveAttribute("src", `${collectionPrefix}${files[0]}`);
    await page.route("**/failed-custom.webp", (route) => route.abort());
    await background(page, { source: "url", url: "/failed-custom.webp" });
    await page.waitForTimeout(100);
    await expect(page.locator("hearthpane-card .hp-background img")).toHaveAttribute("src", `${collectionPrefix}${files[0]}`);
  });

  test("times out a stalled primary image and loads the collection", async ({ page }) => {
    await mockCollection(page);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/stalled.webp", async (route) => { await gate; await route.abort(); });
    await open(page);
    await background(page, { source: "url", url: "/stalled.webp" });
    await expect(page.locator("hearthpane-card .hp-background img")).toHaveAttribute("src", new RegExp("raw.githubusercontent.com"), { timeout: 13_000 });
    release();
  });

  test("reconnects cleanly after removal during a crossfade", async ({ page }) => {
    await open(page);
    await background(page, { source: "images", images: ["/test/scenic-background.svg", "/test/scenic-background-two.svg"], rotationInterval: .1, transitionSeconds: .2 });
    await expect(page.locator("hearthpane-card .hp-background-next")).toHaveCount(1);
    await page.evaluate(() => {
      const card = (window as any).harness.card;
      card.remove();
      document.body.appendChild(card);
    });
    await expect(page.locator("hearthpane-card .hp-background img")).toHaveAttribute("src", "/test/scenic-background-two.svg");
    await expect(page.locator("hearthpane-card .hp-background-next")).toHaveCount(0);
  });

  for (const file of files) {
    test(`Classic readability over ${file}`, async ({ page }) => {
      await open(page);
      await background(page, { source: "images", images: [`/assets/backgrounds/${file}`] });
      await expect(page.locator("hearthpane-card .hp-background img")).toHaveAttribute("src", `/assets/backgrounds/${file}`);
      await expect(page).toHaveScreenshot(`collection-${file.replace(".webp", "")}.png`);
    });
  }
});
