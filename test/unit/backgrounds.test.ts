import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundLoader, collectionBackgrounds, shuffledBackgrounds } from "../../src/backgrounds";

class TestImage {
  static instances: TestImage[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 1280;
  src = "";
  constructor() { TestImage.instances.push(this); }
  removeAttribute(): void { this.src = ""; }
}

describe("background loading", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("Image", TestImage);
    TestImage.instances = [];
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("pins collection paths and shuffles without changing its input", () => {
    const urls = collectionBackgrounds("0.7.0");
    expect(urls).toHaveLength(4);
    expect(urls.every((url) => url.startsWith("https://raw.githubusercontent.com/twangen/hearthpane/v0.7.0/assets/backgrounds/"))).toBe(true);
    expect(shuffledBackgrounds(urls, () => 0)).not.toEqual(urls);
    expect(new Set(shuffledBackgrounds(urls))).toEqual(new Set(urls));
    expect(urls[0]).toContain("misty-mountain-lake.webp");
  });

  it("keeps the old image until the next image loads and skips repeats", async () => {
    const show = vi.fn();
    const loader = new BackgroundLoader(async (url) => url, show);
    loader.setSources(["one", "two"], []);
    await vi.advanceTimersByTimeAsync(0);
    expect(show).not.toHaveBeenCalled();
    TestImage.instances[0].onload!();
    await vi.advanceTimersByTimeAsync(0);
    expect(loader.current).toBe("one");
    const advance = loader.advance();
    await vi.advanceTimersByTimeAsync(0);
    expect(loader.current).toBe("one");
    TestImage.instances[1].onload!();
    await advance;
    expect(loader.current).toBe("two");
    expect(show.mock.calls.map(([url]) => url)).toEqual(["one", "two"]);
    loader.stop();
  });

  it("falls back after timeout and suppresses failed URLs for ten minutes", async () => {
    const loader = new BackgroundLoader(async (url) => url, vi.fn());
    loader.setSources(["broken"], ["fallback-one", "fallback-two"]);
    await vi.advanceTimersByTimeAsync(10_001);
    expect(TestImage.instances[0].src).toBe("");
    expect(TestImage.instances[1].src).toBe("fallback-one");
    TestImage.instances[1].onload!();
    await vi.advanceTimersByTimeAsync(0);
    const advance = loader.advance();
    await vi.advanceTimersByTimeAsync(0);
    expect(TestImage.instances[2].src).toBe("fallback-two");
    TestImage.instances[2].onload!();
    await advance;
    await vi.advanceTimersByTimeAsync(600_001);
    const retry = loader.advance();
    await vi.advanceTimersByTimeAsync(0);
    expect(TestImage.instances[3].src).toBe("broken");
    loader.stop();
    await retry;
  });

  it("handles decode errors and total failure without replacing the last success", async () => {
    const show = vi.fn();
    const loader = new BackgroundLoader(async (url) => url, show);
    loader.setSources(["good"], []);
    await vi.advanceTimersByTimeAsync(0);
    TestImage.instances[0].onload!();
    await vi.advanceTimersByTimeAsync(0);
    loader.setSources(["bad"], ["bad-fallback"]);
    await vi.advanceTimersByTimeAsync(0);
    TestImage.instances[1].onerror!();
    await vi.advanceTimersByTimeAsync(0);
    TestImage.instances[2].onerror!();
    await vi.advanceTimersByTimeAsync(0);
    expect(loader.current).toBe("good");
    expect(show).toHaveBeenCalledTimes(1);
    loader.stop();
  });

  it("cancels stale loads and releases pending image resources on stop", async () => {
    const show = vi.fn();
    const loader = new BackgroundLoader(async (url) => url, show);
    loader.setSources(["old"], []);
    await vi.advanceTimersByTimeAsync(0);
    const staleLoad = TestImage.instances[0].onload!;
    loader.setSources(["new"], []);
    await vi.advanceTimersByTimeAsync(0);
    staleLoad();
    expect(show).not.toHaveBeenCalled();
    TestImage.instances[1].onload!();
    await vi.advanceTimersByTimeAsync(0);
    expect(loader.current).toBe("new");
    loader.setSources(["pending"], []);
    await vi.advanceTimersByTimeAsync(0);
    loader.stop();
    expect(TestImage.instances[2].src).toBe("");
    expect(TestImage.instances[2].onload).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
