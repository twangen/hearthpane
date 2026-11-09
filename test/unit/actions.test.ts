import { describe, expect, it, vi } from "vitest";
import { performHearthPaneAction } from "../../src/actions";
import type { ActionEnvironment } from "../../src/actions";
import type { HomeAssistantLike } from "../../src/types";

function setup() {
  const host = new EventTarget();
  const callService = vi.fn();
  const hass: HomeAssistantLike = { states: {}, callService };
  const environment: ActionEnvironment = {
    pushState: vi.fn(),
    dispatchLocationChanged: vi.fn(),
    openUrl: vi.fn()
  };
  return { host, hass, callService, environment };
}

describe("action dispatch", () => {
  it("keeps none actions child-safe", async () => {
    const context = setup();
    await performHearthPaneAction(context.host, context.hass, { action: "none" }, context.environment);
    expect(context.callService).not.toHaveBeenCalled();
    expect(context.environment.pushState).not.toHaveBeenCalled();
    expect(context.environment.openUrl).not.toHaveBeenCalled();
  });

  it("dispatches Assist through the native Home Assistant action event", async () => {
    const context = setup();
    const listener = vi.fn();
    context.host.addEventListener("hass-action", listener);
    await performHearthPaneAction(context.host, context.hass, { action: "assist", pipeline_id: "preferred", start_listening: true }, context.environment);
    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail.config.tap_action).toMatchObject({ pipeline_id: "preferred", start_listening: true });
  });

  it("handles navigation, URLs, more-info, toggle, and perform-action", async () => {
    const context = setup();
    const moreInfo = vi.fn();
    context.host.addEventListener("hass-more-info", moreInfo);
    await performHearthPaneAction(context.host, context.hass, { action: "navigate", navigation_path: "/lovelace/home" }, context.environment);
    await performHearthPaneAction(context.host, context.hass, { action: "url", url_path: "https://example.test" }, context.environment);
    await performHearthPaneAction(context.host, context.hass, { action: "more-info", entity: "light.entry" }, context.environment);
    await performHearthPaneAction(context.host, context.hass, { action: "toggle", entity: "light.entry" }, context.environment);
    await performHearthPaneAction(context.host, context.hass, { action: "perform-action", perform_action: "script.arrive_home", data: { mode: "quiet" } }, context.environment);
    expect(context.environment.pushState).toHaveBeenCalledWith("/lovelace/home");
    expect(context.environment.openUrl).toHaveBeenCalledWith("https://example.test");
    expect((moreInfo.mock.calls[0][0] as CustomEvent).detail.entityId).toBe("light.entry");
    expect(context.callService).toHaveBeenNthCalledWith(1, "light", "toggle", { entity_id: "light.entry" });
    expect(context.callService).toHaveBeenNthCalledWith(2, "script", "arrive_home", { mode: "quiet" }, {});
  });
});
