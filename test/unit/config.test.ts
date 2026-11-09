import { describe, expect, it } from "vitest";
import {
  backgroundCandidates,
  classicPreset,
  isAlertVisible,
  mergeCalendarEvents,
  normalizeConfig,
  parseForecastResponse,
  unsupportedProvider
} from "../../src/config";
import { layoutDefinition } from "../../src/layouts";
import type { HomeAssistantLike } from "../../src/types";

describe("configuration normalization", () => {
  it("creates the entity-neutral Classic preset", () => {
    const config = classicPreset();
    expect(config.layout.format).toBe("vertical-2-1");
    expect(config.layout.zones["middle-left"]?.widgets.map((widget) => widget.type)).toEqual(["clock", "date"]);
    expect(config.layout.zones["top-right"]?.widgets.every((widget) => !widget.entity)).toBe(true);
    expect(config.layout.zones["bottom-left"]?.widgets[0].actions?.map((action) => action.action)).toEqual(["none", "none"]);
  });

  it("normalizes legacy sensor backgrounds without making provider calls", () => {
    const config = normalizeConfig({
      type: "custom:hearthpane-card",
      background: { source: "picsum", config: { entity: "sensor.backgrounds" } }
    });
    expect(config.background.source).toBe("sensor");
    expect(unsupportedProvider(config)).toBeUndefined();
  });

  it("warns for unsupported external providers", () => {
    const config = normalizeConfig({ type: "custom:hearthpane-card", background: { source: "unsplash" } });
    expect(unsupportedProvider(config)).toBe("unsplash");
  });

  it("assigns deterministic widget IDs and honors partial custom zones", () => {
    const config = normalizeConfig({
      type: "custom:hearthpane-card",
      layout: { format: "3x3", zones: { "top-left": { widgets: [{ type: "sensor", entity: "sensor.test" }] } } }
    });
    expect(config.layout.zones["top-left"]?.widgets[0]).toMatchObject({ id: "top-left-entity-1", type: "entity" });
    expect(config.layout.zones["top-right"]?.widgets).toEqual([]);
  });

  it.each(["3x3", "vertical-2-1", "vertical-1-2", "horizontal-2-1", "horizontal-1-2"] as const)(
    "defines complete %s layout geometry",
    (format) => {
      const definition = layoutDefinition(format);
      expect(definition.columns).toBeTruthy();
      expect(definition.rows).toBeTruthy();
      expect(Object.keys(definition.zoneAreas)).toHaveLength(9);
    }
  );
});

describe("Home Assistant data normalization", () => {
  it("resolves direct, list, and sensor backgrounds without duplicates", () => {
    const config = normalizeConfig({
      type: "custom:hearthpane-card",
      background: {
        source: "sensor",
        url: "/local/one.jpg",
        images: ["/local/two.jpg", "/local/one.jpg"],
        config: { entity: "sensor.backgrounds", attribute: "files" }
      }
    });
    const states = {
      "sensor.backgrounds": { entity_id: "sensor.backgrounds", state: "2", attributes: { files: ["media-source://one", "media-source://two"] } }
    };
    expect(backgroundCandidates(config, states)).toEqual(["/local/one.jpg", "/local/two.jpg", "media-source://one", "media-source://two"]);
  });

  it("parses weather forecast service responses", () => {
    const response = { response: { "weather.home": { forecast: [{ datetime: "2026-11-10T12:00:00Z", condition: "sunny", temperature: 64, templow: 50 }] } } };
    expect(parseForecastResponse(response, "weather.home")).toEqual([{ datetime: "2026-11-10T12:00:00Z", condition: "sunny", temperature: 64, templow: 50, precipitation_probability: undefined, native_temperature: undefined, native_templow: undefined }]);
    expect(parseForecastResponse({}, "weather.home")).toEqual([]);
  });

  it("merges and sorts multiple calendars", () => {
    const events = mergeCalendarEvents({
      "calendar.family": { events: [{ summary: "Dinner", start: { dateTime: "2026-11-10T18:00:00-06:00" }, end: { dateTime: "2026-11-10T19:00:00-06:00" } }] },
      "calendar.bin": { events: [{ summary: "Recycling", start: { date: "2026-11-10" }, end: { date: "2026-11-11" } }] }
    }, [
      { entity: "calendar.family", name: "Family", color: "#42a5f5" },
      { entity: "calendar.bin", name: "Collection", color: "#66bb6a" }
    ]);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ summary: "Recycling", allDay: true, calendarName: "Collection" });
    expect(events[1]).toMatchObject({ summary: "Dinner", allDay: false, calendarName: "Family" });
  });

  it("hides clear/unavailable alerts but honors explicit state conditions", () => {
    const hass: HomeAssistantLike = {
      states: {
        "binary_sensor.door": { entity_id: "binary_sensor.door", state: "off", attributes: {} },
        "alarm_control_panel.home": { entity_id: "alarm_control_panel.home", state: "triggered", attributes: {} },
        "sensor.missing": { entity_id: "sensor.missing", state: "unavailable", attributes: {} }
      }
    };
    expect(isAlertVisible({ entity: "binary_sensor.door" }, hass)).toBe(false);
    expect(isAlertVisible({ entity: "binary_sensor.door", states: ["off"] }, hass)).toBe(true);
    expect(isAlertVisible({ entity: "alarm_control_panel.home", states: ["pending", "triggered"] }, hass)).toBe(true);
    expect(isAlertVisible({ entity: "sensor.missing" }, hass)).toBe(false);
  });
});
