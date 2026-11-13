import { activeZones } from "./layouts";
import type {
  AlertCondition,
  CalendarEvent,
  CalendarSource,
  ForecastItem,
  HassEntity,
  HearthPaneConfig,
  HomeAssistantLike,
  LayoutFormat,
  WidgetConfig,
  WidgetType,
  ZoneConfig,
  ZoneName
} from "./types";

export const UNSUPPORTED_BACKGROUND_PROVIDERS = ["openweathermap", "unsplash", "immich"];

const widgetAliases: Record<string, WidgetType> = {
  "weather-current": "current-weather",
  weather: "current-weather",
  "weather-forecast": "forecast",
  calendar: "agenda",
  actions: "action-bar",
  action: "action-bar",
  sensor: "entity",
  transport: "transportation"
};

const defaultAppearance: HearthPaneConfig["appearance"] = {
  fontFamily: "Roboto, system-ui, sans-serif",
  fontColor: "#ffffff",
  accentColor: "#64b5f6",
  textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
  scale: 1,
  railColor: "rgba(8, 11, 16, 0.64)",
  glassColor: "rgba(16, 22, 30, 0.58)",
  scrimColor: "rgba(0, 0, 0, 0.42)"
};

const defaultBackground: HearthPaneConfig["background"] = {
  source: "picsum",
  images: [],
  opacity: 1,
  rotationInterval: 300,
  objectFit: "cover",
  position: "center center",
  transitionSeconds: 1.2
};

function zone(widgets: WidgetConfig[], overrides: Partial<ZoneConfig> = {}): ZoneConfig {
  return { widgets, align: "stretch", justify: "start", direction: "column", ...overrides };
}

export function classicPreset(): HearthPaneConfig {
  return {
    type: "custom:hearthpane-card",
    name: "HearthPane Classic",
    appearance: { ...defaultAppearance },
    background: { ...defaultBackground },
    layout: {
      format: "vertical-2-1",
      preset: "classic",
      spacing: { padding: 28, zoneGap: 18, widgetGap: 12 },
      zones: {
        "top-left": zone([]),
        "middle-left": zone(
          [
            { id: "classic-clock", type: "clock", hour12: true, showSeconds: false, fontSize: "9rem" },
            { id: "classic-date", type: "date", format: "full", fontSize: "2rem" }
          ],
          { align: "center", justify: "center" }
        ),
        "bottom-left": zone(
          [
            {
              id: "classic-actions",
              type: "action-bar",
              actions: [
                { action: "none", label: "Assist", icon: "microphone", pipeline_id: "preferred", start_listening: true },
                { action: "none", label: "Home", icon: "home", navigation_path: "/lovelace/home" }
              ]
            }
          ],
          { align: "stretch", justify: "end" }
        ),
        "top-right": zone([
          { id: "classic-current-weather", type: "current-weather", entity: "", animation: true },
          { id: "classic-forecast", type: "forecast", entity: "", days: 3, forecastType: "daily", animation: false }
        ]),
        "middle-right": zone([{ id: "classic-alerts", type: "alerts", conditions: [] }], {
          justify: "center"
        }),
        "bottom-right": zone(
          [{ id: "classic-agenda", type: "agenda", calendars: [], days: 2, maxItems: 3 }],
          { justify: "end" }
        )
      }
    }
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function finiteNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeWidget(raw: unknown, zoneName: ZoneName, index: number): WidgetConfig {
  const input = asRecord(raw);
  const rawType = String(input.type || "entity").replace(/^hearthpane-/, "");
  const type = (widgetAliases[rawType] || rawType) as WidgetType;
  return {
    ...input,
    id: String(input.id || `${zoneName}-${type}-${index + 1}`),
    type
  } as WidgetConfig;
}

function normalizeZone(raw: unknown, zoneName: ZoneName): ZoneConfig {
  const input = asRecord(raw);
  const widgets = Array.isArray(input.widgets)
    ? input.widgets.map((item, index) => normalizeWidget(item, zoneName, index))
    : [];
  return {
    widgets,
    align: (input.align as ZoneConfig["align"]) || "stretch",
    justify: (input.justify as ZoneConfig["justify"]) || "start",
    direction: (input.direction as ZoneConfig["direction"]) || "column",
    glass: Boolean(input.glass)
  };
}

export function normalizeConfig(raw: unknown): HearthPaneConfig {
  const source = asRecord(raw);
  const preset = classicPreset();
  const appearance = asRecord(source.appearance);
  const background = asRecord(source.background);
  const legacyBackgroundConfig = asRecord(background.config);
  const layout = asRecord(source.layout);
  const spacing = asRecord(layout.spacing);
  const format = String(layout.format || layout.layout || preset.layout.format) as LayoutFormat;
  const validFormat: LayoutFormat = ["3x3", "vertical-2-1", "vertical-1-2", "horizontal-2-1", "horizontal-1-2"].includes(format)
    ? format
    : "vertical-2-1";

  // An explicit source always wins. Older Clock-style configurations only
  // implied the sensor source through background.config.entity.
  const normalizedSource = background.source
    ? String(background.source)
    : legacyBackgroundConfig.entity
      ? "sensor"
      : String(preset.background.source);
  const configuredZones = asRecord(layout.zones);
  const hasConfiguredZones = Object.keys(configuredZones).length > 0;
  const zones: HearthPaneConfig["layout"]["zones"] = {};
  for (const zoneName of activeZones(validFormat)) {
    const fallback = preset.layout.zones[zoneName];
    zones[zoneName] = Object.prototype.hasOwnProperty.call(configuredZones, zoneName)
      ? normalizeZone(configuredZones[zoneName], zoneName)
      : !hasConfiguredZones && fallback
        ? normalizeZone(fallback, zoneName)
        : normalizeZone({}, zoneName);
  }

  return {
    type: "custom:hearthpane-card",
    name: typeof source.name === "string" ? source.name : preset.name,
    appearance: {
      ...defaultAppearance,
      ...appearance,
      scale: finiteNumber(appearance.scale, defaultAppearance.scale)
    },
    background: {
      ...defaultBackground,
      ...background,
      source: normalizedSource,
      config: legacyBackgroundConfig,
      images: Array.isArray(background.images) ? background.images.filter((item): item is string => typeof item === "string") : [],
      opacity: Math.max(0, Math.min(1, finiteNumber(background.opacity, defaultBackground.opacity))),
      rotationInterval: Math.max(0, finiteNumber(background.rotationInterval, defaultBackground.rotationInterval)),
      transitionSeconds: Math.max(0, finiteNumber(background.transitionSeconds, defaultBackground.transitionSeconds))
    },
    layout: {
      format: validFormat,
      preset: (layout.preset as HearthPaneConfig["layout"]["preset"]) || preset.layout.preset,
      spacing: {
        padding: Math.max(0, finiteNumber(spacing.padding, preset.layout.spacing.padding)),
        zoneGap: Math.max(0, finiteNumber(spacing.zoneGap, preset.layout.spacing.zoneGap)),
        widgetGap: Math.max(0, finiteNumber(spacing.widgetGap, preset.layout.spacing.widgetGap))
      },
      zones
    }
  };
}

export function unsupportedProvider(config: HearthPaneConfig): string | undefined {
  const source = config.background.source.toLowerCase();
  return UNSUPPORTED_BACKGROUND_PROVIDERS.includes(source) ? source : undefined;
}

export function backgroundCandidates(config: HearthPaneConfig, states: Record<string, HassEntity>): string[] {
  const background = config.background;
  const result: string[] = [];
  if (background.source === "picsum") {
    // Distinct query keys let Picsum supply a small rotation without making
    // the rest of HearthPane depend on a cloud image SDK.
    for (let index = 1; index <= 8; index += 1) {
      result.push(`https://picsum.photos/1920/1080?random=${index}`);
    }
  }
  if (["url", "media"].includes(background.source) && background.url) result.push(background.url);
  if (background.source === "images" && background.images) result.push(...background.images);
  if (background.source === "sensor") {
    const entity = background.config?.entity || "";
    const attribute = background.config?.attribute || "files";
    const value = states[entity]?.attributes?.[attribute];
    if (Array.isArray(value)) result.push(...value.filter((item): item is string => typeof item === "string"));
  }
  return Array.from(new Set(result.filter(Boolean)));
}

export function parseForecastResponse(response: unknown, entity: string): ForecastItem[] {
  const root = asRecord(response);
  const serviceResponse = asRecord(root.response || root);
  const entityResponse = asRecord(serviceResponse[entity]);
  const forecast = entityResponse.forecast;
  if (!Array.isArray(forecast)) return [];
  return forecast
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      datetime: String(item.datetime || ""),
      condition: String(item.condition || "exceptional"),
      temperature: typeof item.temperature === "number" ? item.temperature : undefined,
      templow: typeof item.templow === "number" ? item.templow : undefined,
      precipitation_probability: typeof item.precipitation_probability === "number" ? item.precipitation_probability : undefined,
      native_temperature: typeof item.native_temperature === "number" ? item.native_temperature : undefined,
      native_templow: typeof item.native_templow === "number" ? item.native_templow : undefined
    }));
}

export function mergeCalendarEvents(
  responses: Record<string, unknown>,
  calendars: CalendarSource[]
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const calendar of calendars) {
    const response = asRecord(responses[calendar.entity]);
    const rawEvents = Array.isArray(response.events) ? response.events : [];
    for (const raw of rawEvents) {
      const item = asRecord(raw);
      const startObject = asRecord(item.start);
      const endObject = asRecord(item.end);
      const start = String(startObject.dateTime || startObject.date || item.start || "");
      const end = String(endObject.dateTime || endObject.date || item.end || "");
      if (!start) continue;
      events.push({
        summary: String(item.summary || "Untitled event"),
        start,
        end,
        allDay: Boolean(startObject.date && !startObject.dateTime) || /^\d{4}-\d{2}-\d{2}$/.test(start),
        entity: calendar.entity,
        calendarName: calendar.name || calendar.entity.replace(/^calendar\./, ""),
        color: calendar.color || "#64b5f6",
        description: typeof item.description === "string" ? item.description : undefined,
        location: typeof item.location === "string" ? item.location : undefined
      });
    }
  }
  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function isAlertVisible(condition: AlertCondition, hass: HomeAssistantLike): boolean {
  const entity = hass.states[condition.entity];
  if (!entity || ["unavailable", "unknown"].includes(entity.state)) return false;
  if (condition.states?.length && !condition.states.includes(entity.state)) return false;
  if (!condition.states?.length && ["none", "clear", "off", "idle", "disarmed", "closed", "locked"].includes(entity.state)) return false;
  if (condition.notStates?.includes(entity.state)) return false;
  if (condition.attribute) return entity.attributes[condition.attribute] === condition.equals;
  return true;
}
