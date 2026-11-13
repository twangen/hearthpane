export type LayoutFormat =
  | "3x3"
  | "vertical-2-1"
  | "vertical-1-2"
  | "horizontal-2-1"
  | "horizontal-1-2";

export type ZoneName =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type WidgetType =
  | "clock"
  | "date"
  | "current-weather"
  | "forecast"
  | "agenda"
  | "month-calendar"
  | "entity"
  | "alerts"
  | "action-bar"
  | "separator"
  | "ha-card"
  | "transportation";

export type HearthPaneActionType =
  | "none"
  | "assist"
  | "navigate"
  | "url"
  | "more-info"
  | "toggle"
  | "perform-action";

export interface HearthPaneAction {
  action: HearthPaneActionType;
  label?: string;
  icon?: string;
  entity?: string;
  navigation_path?: string;
  url_path?: string;
  perform_action?: string;
  data?: Record<string, unknown>;
  target?: Record<string, unknown>;
  pipeline_id?: string;
  start_listening?: boolean;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title?: string;
  entity?: string;
  entities?: string[];
  icon?: string;
  attribute?: string;
  fields?: Record<string, string>;
  value?: string;
  format?: string;
  locale?: string;
  timeZone?: string;
  hour12?: boolean;
  showSeconds?: boolean;
  fontSize?: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  animation?: boolean;
  days?: number;
  maxItems?: number;
  forecastType?: "daily" | "hourly" | "twice_daily";
  calendars?: CalendarSource[];
  conditions?: AlertCondition[];
  actions?: HearthPaneAction[];
  tap_action?: HearthPaneAction;
  card?: Record<string, unknown>;
  rowsAttribute?: string;
  emptyText?: string;
  color?: string;
  [key: string]: unknown;
}

export interface CalendarSource {
  entity: string;
  name?: string;
  color?: string;
}

export interface AlertCondition {
  entity: string;
  states?: string[];
  notStates?: string[];
  attribute?: string;
  equals?: unknown;
  label?: string;
  icon?: string;
  color?: string;
}

export interface ZoneConfig {
  widgets: WidgetConfig[];
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "space-between" | "space-around" | "space-evenly";
  direction?: "row" | "column";
  glass?: boolean;
}

export interface HearthPaneLayout {
  format: LayoutFormat;
  preset?: "classic" | "glass" | "none";
  spacing: {
    padding: number;
    zoneGap: number;
    widgetGap: number;
  };
  zones: Partial<Record<ZoneName, ZoneConfig>>;
}

export interface HearthPaneAppearance {
  fontFamily: string;
  fontColor: string;
  accentColor: string;
  textShadow: string;
  locale?: string;
  timeZone?: string;
  scale: number;
  railColor: string;
  glassColor: string;
  scrimColor: string;
}

export interface HearthPaneBackground {
  source: string;
  config?: {
    entity?: string;
    attribute?: string;
    [key: string]: unknown;
  };
  images?: string[];
  url?: string;
  opacity: number;
  rotationInterval: number;
  objectFit: "cover" | "contain" | "fill" | "none" | "scale-down";
  position: string;
  transitionSeconds: number;
}

export interface HearthPaneConfig {
  type: "custom:hearthpane-card";
  name?: string;
  appearance: HearthPaneAppearance;
  background: HearthPaneBackground;
  layout: HearthPaneLayout;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  last_changed?: string;
  attributes: Record<string, unknown>;
}

export interface HomeAssistantLike {
  states: Record<string, HassEntity>;
  locale?: { language?: string; time_format?: string };
  config?: { time_zone?: string };
  callWS?<T = unknown>(message: Record<string, unknown>): Promise<T>;
  callService?(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>
  ): Promise<unknown> | void;
}

export interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  entity: string;
  calendarName: string;
  color: string;
  description?: string;
  location?: string;
}

export interface ForecastItem {
  datetime: string;
  condition: string;
  temperature?: number;
  templow?: number;
  precipitation_probability?: number;
  native_temperature?: number;
  native_templow?: number;
}

export interface LayoutDefinition {
  columns: string;
  rows: string;
  zoneAreas: Record<ZoneName, string>;
  railZones: ZoneName[];
}

declare global {
  interface Window {
    loadCardHelpers?: () => Promise<{
      createCardElement(config: Record<string, unknown>): HTMLElement & {
        hass?: HomeAssistantLike;
        setConfig?: (config: Record<string, unknown>) => void;
      };
    }>;
    customCards?: Array<Record<string, unknown>>;
  }
}
