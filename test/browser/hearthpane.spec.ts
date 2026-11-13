import { expect, test } from "@playwright/test";

async function openHarness(page: import("@playwright/test").Page, query = "") {
  await page.goto(`/test/harness.html${query}`);
  await page.locator("hearthpane-card .hp-shell").waitFor();
  await page.locator("hearthpane-card .hp-weather-current").waitFor({ state: query.includes("unavailable") ? "hidden" : "visible" });
  await page.waitForTimeout(40);
}

test.describe("HearthPane Classic", () => {
  test("matches the canonical 1280×800 geometry", async ({ page }) => {
    await openHarness(page);
    const geometry = await page.locator("hearthpane-card").evaluate((card) => {
      const root = card.shadowRoot!;
      const rect = (selector: string) => root.querySelector(selector)!.getBoundingClientRect();
      const rail = rect(".hp-rail");
      const clock = rect(".hp-clock");
      const date = rect(".hp-date");
      const weather = rect(".hp-weather-current");
      const clockStyle = getComputedStyle(root.querySelector(".hp-clock-time")!);
      const dateStyle = getComputedStyle(root.querySelector(".hp-date")!);
      return {
        railLeft: rail.left,
        railWidth: rail.width,
        clockCenterX: clock.left + clock.width / 2,
        clockCenterY: clock.top + clock.height / 2,
        clockGroupCenterY: (clock.top + date.bottom) / 2,
        weatherLeft: weather.left,
        clockFont: Number.parseFloat(clockStyle.fontSize),
        dateFont: Number.parseFloat(dateStyle.fontSize)
      };
    });
    expect(geometry.railLeft).toBeCloseTo(1280 * 2 / 3, 0);
    expect(geometry.railWidth).toBeCloseTo(1280 / 3, 0);
    expect(geometry.clockCenterX).toBeCloseTo(1280 / 3, 0);
    expect(geometry.clockCenterY).toBeCloseTo(375, 0);
    expect(geometry.clockGroupCenterY).toBeCloseTo(400, 0);
    expect(geometry.weatherLeft).toBeCloseTo(1280 * 2 / 3 + 28, 0);
    expect(geometry.clockFont).toBeCloseTo(144, 0);
    expect(geometry.dateFont).toBeCloseTo(32, 0);
    await expect(page).toHaveScreenshot("classic-1280x800.png");
  });

  for (const layout of ["vertical-1-2", "horizontal-2-1", "horizontal-1-2", "3x3"]) {
    test(`renders the ${layout} layout`, async ({ page }) => {
      await openHarness(page, `?layout=${layout}`);
      await expect(page).toHaveScreenshot(`${layout}-1280x800.png`);
    });
  }

  test("rotates local backgrounds and crossfades without external requests", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await openHarness(page, "?rotation=0.08");
    const before = await page.locator("hearthpane-card .hp-background img").getAttribute("src");
    await page.waitForTimeout(120);
    const after = await page.locator("hearthpane-card .hp-background img").getAttribute("src");
    expect(before).toContain("scenic-background.svg");
    expect(after).toContain("scenic-background-two.svg");
    expect(requests.filter((url) => url.startsWith("http")).every((url) => ["127.0.0.1", "localhost"].includes(new URL(url).hostname))).toBe(true);
  });

  test("honors reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openHarness(page);
    const animation = await page.locator("hearthpane-card .hp-rays").first().evaluate((element) => getComputedStyle(element).animationName);
    expect(animation).toBe("none");
  });

  test("animates only current conditions and preserves the animation across unrelated state updates", async ({ page }) => {
    await openHarness(page);
    const current = page.locator("hearthpane-card .hp-weather-current .hp-weather-icon");
    const forecastIcons = page.locator("hearthpane-card .hp-forecast-row .hp-weather-icon");
    await expect(current).toHaveClass(/is-animated/);
    await expect(forecastIcons).toHaveCount(3);
    expect(await forecastIcons.evaluateAll((icons) => icons.every((icon) => !icon.classList.contains("is-animated")))).toBe(true);
    await current.evaluate((element) => element.setAttribute("data-animation-probe", "stable"));
    await page.evaluate(() => {
      const harness = (window as unknown as { harness: { card: HTMLElement & { hass: unknown }; hass: any } }).harness;
      harness.hass.states["sensor.unrelated"] = { entity_id: "sensor.unrelated", state: "changed", attributes: {} };
      harness.card.hass = harness.hass;
    });
    await expect(current).toHaveAttribute("data-animation-probe", "stable");
  });

  test("none actions are inert and child-safe", async ({ page }) => {
    await openHarness(page);
    const buttons = page.locator("hearthpane-card .hp-action");
    await expect(buttons).toHaveCount(2);
    await expect(buttons.first()).toBeDisabled();
    await buttons.first().click({ force: true });
    expect(await page.evaluate(() => (window as unknown as { harness: { serviceCalls: unknown[] } }).harness.serviceCalls.length)).toBe(0);
  });
});

test.describe("widget states and integrations", () => {
  test("hides unavailable and empty regions cleanly", async ({ page }) => {
    await openHarness(page, "?scenario=unavailable");
    await expect(page.locator("hearthpane-card .hp-weather-current")).toHaveCount(0);
    await expect(page.locator("hearthpane-card .hp-forecast-row")).toHaveCount(0);
    await expect(page.locator("hearthpane-card .hp-event")).toHaveCount(0);
    await expect(page.locator("hearthpane-card .hp-alert")).toHaveCount(0);
  });

  test("keeps partial native data useful without empty calendar or transport chrome", async ({ page }) => {
    await openHarness(page, "?layout=3x3&scenario=partial");
    await expect(page.locator("hearthpane-card .hp-weather-current")).toHaveCount(1);
    await expect(page.locator("hearthpane-card .hp-forecast-row")).toHaveCount(3);
    await expect(page.locator("hearthpane-card .hp-month-day")).toHaveCount(42);
    await expect(page.locator("hearthpane-card .hp-event")).toHaveCount(0);
    await expect(page.locator("hearthpane-card .hp-transport-row")).toHaveCount(0);
  });

  test("renders a conditional alert only while its configured state matches", async ({ page }) => {
    await openHarness(page);
    await expect(page.locator("hearthpane-card .hp-alert")).toHaveCount(0);
    await page.evaluate(() => {
      const harness = (window as unknown as { harness: { card: HTMLElement & { hass: unknown }; hass: any } }).harness;
      harness.hass.states["binary_sensor.front_door"] = { entity_id: "binary_sensor.front_door", state: "on", attributes: { friendly_name: "Front Door" } };
      harness.card.hass = harness.hass;
    });
    await expect(page.locator("hearthpane-card .hp-alert")).toContainText("Front door is open");
  });

  test("renders populated native widgets and unavailable embedded-card placeholders", async ({ page }) => {
    await openHarness(page, "?layout=3x3");
    await expect(page.locator("hearthpane-card .hp-month-day")).toHaveCount(42);
    await expect(page.locator("hearthpane-card .hp-transport-row")).toHaveCount(2);
    await expect(page.locator("hearthpane-card .hp-entity-value")).toHaveText("71");
    await page.evaluate(() => {
      const harness = (window as unknown as { harness: { card: HTMLElement & { setConfig(config: unknown): void; hass: unknown }; config: any; hass: unknown } }).harness;
      const config = structuredClone(harness.config);
      config.layout.format = "3x3";
      config.layout.zones["bottom-center"] = { widgets: [{ id: "missing-card", type: "ha-card", card: { type: "custom:not-installed" } }] };
      (window as unknown as { loadCardHelpers?: () => Promise<unknown> }).loadCardHelpers = undefined;
      harness.card.setConfig(config);
      harness.card.hass = harness.hass;
    });
    await expect(page.locator("hearthpane-card .hp-widget-placeholder")).toContainText("card helpers are unavailable");
  });
});

test.describe("visual designer", () => {
  test.beforeEach(async ({ page }) => {
    await openHarness(page);
    await page.evaluate(() => {
      const harness = (window as unknown as { harness: { config: unknown; hass: unknown } }).harness;
      const editor = document.createElement("hearthpane-card-editor") as HTMLElement & { setConfig(config: unknown): void; hass: unknown };
      editor.setConfig(harness.config);
      editor.hass = harness.hass;
      let changes = 0;
      editor.addEventListener("config-changed", () => changes++);
      (window as unknown as { designerChanges: () => number }).designerChanges = () => changes;
      document.body.replaceChildren(editor);
    });
    await page.getByRole("button", { name: "Open full designer" }).click();
  });

  test("adds, selects, edits, and persists widgets through standard events", async ({ page }) => {
    await page.getByRole("button", { name: /Entity$/ }).click();
    await expect(page.locator("hearthpane-card-editor .widget-tile")).toHaveCount(8);
    await expect(page.getByRole("heading", { name: "Edit Entity" })).toBeVisible();
    await page.locator("hearthpane-card-editor input[data-path='widget.title']").fill("Room temperature");
    await page.waitForTimeout(220);
    expect(await page.evaluate(() => (window as unknown as { designerChanges: () => number }).designerChanges())).toBeGreaterThan(0);
  });

  test("uses explicit dashboard and widget drawer contexts without ambiguous tabs", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Content" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Appearance" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Behavior" })).toHaveCount(0);

    await page.locator("hearthpane-card-editor [data-command='edit-widget'][data-widget-id='clock']").first().click();
    await expect(page.getByRole("heading", { name: "Edit Clock" })).toBeVisible();
    await expect(page.locator("hearthpane-card-editor select[data-widget-field='fontSize']")).toBeVisible();
    await expect(page.locator("hearthpane-card-editor select[data-widget-field='fontWeight']")).toContainText("Bold");
    await expect(page.locator("hearthpane-card-editor select[data-widget-field='fontStyle']")).toContainText("Italic");

    await page.getByRole("button", { name: /Dashboard settings/ }).click();
    await expect(page.getByRole("heading", { name: "Dashboard settings" })).toBeVisible();
    await expect(page.locator("hearthpane-card-editor select[data-widget-field='fontSize']")).toHaveCount(0);
    await expect(page.locator("hearthpane-card-editor select[data-path='background.source']")).toBeVisible();
  });

  test("keeps the selected background source and uses a true full-screen 16:10 canvas", async ({ page }) => {
    const designer = page.locator("hearthpane-card-editor .designer");
    const bounds = await designer.boundingBox();
    expect(bounds?.width).toBeCloseTo(1280, 0);
    expect(bounds?.height).toBeCloseTo(800, 0);

    const canvas = page.locator("hearthpane-card-editor .canvas");
    const canvasBounds = await canvas.boundingBox();
    expect((canvasBounds?.width || 0) / (canvasBounds?.height || 1)).toBeCloseTo(1.6, 1);

    await page.getByRole("button", { name: /Dashboard settings/ }).click();
    const source = page.locator("hearthpane-card-editor select[data-path='background.source']");
    await source.selectOption("url");
    await expect(source).toHaveValue("url");
    await expect(page.locator("hearthpane-card-editor input[data-path='background.url']")).toBeVisible();

    await page.getByRole("button", { name: "Close dashboard settings" }).click();
    await expect(page.locator("hearthpane-card-editor .workspace")).not.toHaveClass(/drawer-open/);
  });

  test("renders a live inert preview and updates it from the widget drawer", async ({ page }) => {
    await page.locator("hearthpane-card-editor [data-command='edit-widget'][data-widget-id='clock']").first().click();
    await page.getByRole("button", { name: "Preview" }).click();
    const preview = page.locator("hearthpane-card-editor .preview-card");
    await expect(preview).toBeVisible();
    await expect(preview.locator(".hp-action")).toHaveCount(2);
    await expect(preview.locator(".hp-action").first()).toBeDisabled();
    await expect(preview.locator(".hp-weather-current .hp-weather-icon")).toHaveClass(/is-animated/);
    expect(await preview.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");

    await page.locator("hearthpane-card-editor select[data-widget-field='fontSize']").selectOption("160");
    await page.locator("hearthpane-card-editor select[data-widget-field='fontWeight']").selectOption("700");
    await page.locator("hearthpane-card-editor select[data-widget-field='fontStyle']").selectOption("italic");
    await page.locator("hearthpane-card-editor select[data-widget-field='textAlign']").selectOption("left");
    await expect(preview.locator(".hp-clock-time")).toHaveCSS("font-size", "160px");
    await expect(preview.locator(".hp-clock")).toHaveCSS("font-weight", "700");
    await expect(preview.locator(".hp-clock")).toHaveCSS("font-style", "italic");
    expect(["flex-start", "flow-start"]).toContain(await preview.locator(".hp-clock").evaluate((element) => getComputedStyle(element).justifyContent));
    expect(await page.evaluate(() => (window as unknown as { harness: { serviceCalls: unknown[] } }).harness.serviceCalls.length)).toBe(0);
  });

  test("deletes directly and restores the exact widget position with Undo", async ({ page }) => {
    const middleLeft = page.locator("hearthpane-card-editor [data-drop-zone='middle-left']");
    await expect(middleLeft.locator("[data-widget-tile]")).toHaveCount(2);
    await page.getByRole("button", { name: "Delete Date" }).click();
    await expect(middleLeft.locator("[data-widget-tile='date']")).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText("Date removed");
    await page.waitForTimeout(220);
    const afterDelete = await page.evaluate(() => (window as unknown as { designerChanges: () => number }).designerChanges());
    expect(afterDelete).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(middleLeft.locator("[data-widget-tile]")).toHaveCount(2);
    await expect(middleLeft.locator("[data-widget-tile]").nth(1)).toHaveAttribute("data-widget-tile", "date");
    await page.waitForTimeout(220);
    expect(await page.evaluate(() => (window as unknown as { designerChanges: () => number }).designerChanges())).toBeGreaterThan(afterDelete);
  });

  test("supports keyboard reorder controls", async ({ page }) => {
    await page.locator("hearthpane-card-editor [data-command='edit-widget'][data-widget-id='clock']").first().click();
    const down = page.locator("hearthpane-card-editor [data-command='move-down']").filter({ visible: true }).first();
    await down.focus();
    await down.press("Enter");
    await page.waitForTimeout(220);
    expect(await page.evaluate(() => (window as unknown as { designerChanges: () => number }).designerChanges())).toBeGreaterThan(0);
  });

  test("supports pointer drag-and-drop between zones", async ({ page }) => {
    const handle = page.locator("hearthpane-card-editor [data-drag-widget='clock']");
    const target = page.locator("hearthpane-card-editor [data-drop-zone='top-right']");
    await handle.dragTo(target);
    await page.waitForTimeout(220);
    await expect(target.locator("[data-widget-tile='clock']")).toHaveCount(1);
    expect(await page.evaluate(() => (window as unknown as { designerChanges: () => number }).designerChanges())).toBeGreaterThan(0);
  });

  test("asks before replacing an arrangement with Classic", async ({ page }) => {
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Replace the current arrangement");
      await dialog.dismiss();
    });
    await page.getByRole("button", { name: "HearthPane Classic" }).click();
    await expect(page.locator("hearthpane-card-editor .designer")).toBeVisible();
  });
});
