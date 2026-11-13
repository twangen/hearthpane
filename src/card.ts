import { performHearthPaneAction } from "./actions";
import {
  backgroundCandidates,
  classicPreset,
  isAlertVisible,
  mergeCalendarEvents,
  normalizeConfig,
  parseForecastResponse,
  unsupportedProvider
} from "./config";
import { activeZones, layoutDefinition } from "./layouts";
import { cardStyles } from "./styles";
import type {
  CalendarEvent,
  CalendarSource,
  ForecastItem,
  HearthPaneConfig,
  HomeAssistantLike,
  WidgetConfig,
  ZoneName
} from "./types";
import {
  escapeHtml,
  formatTemperature,
  fullDate,
  humanize,
  isoRange,
  localeFor,
  timeParts,
  timeZoneFor
} from "./utils";
import { actionIcon, weatherIcon, weatherLabel } from "./weather-icons";

type EmbeddedCard = HTMLElement & { hass?: HomeAssistantLike; setConfig?: (config: Record<string, unknown>) => void };

export class HearthPaneCard extends HTMLElement {
  private _hass?: HomeAssistantLike;
  private _config: HearthPaneConfig = classicPreset();
  private _now = new Date();
  private _clockTimer = 0;
  private _backgroundTimer = 0;
  private _transitionTimer = 0;
  private _backgroundIndex = 0;
  private _previousBackground = "";
  private _resolvedBackgrounds: string[] = [];
  private _mediaCache = new Map<string, string>();
  private _forecasts = new Map<string, ForecastItem[]>();
  private _events = new Map<string, CalendarEvent[]>();
  private _lastFetch = new Map<string, number>();
  private _embeddedCards = new Map<string, EmbeddedCard>();
  private _stateFingerprint = "";

  static getConfigElement(): HTMLElement {
    return document.createElement("hearthpane-card-editor");
  }

  static getStubConfig(): HearthPaneConfig {
    return classicPreset();
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot?.addEventListener("click", (event) => this._handleClick(event));
  }

  connectedCallback(): void {
    this._startClock();
    this._restartBackgroundRotation();
    this._render();
  }

  disconnectedCallback(): void {
    window.clearInterval(this._clockTimer);
    window.clearInterval(this._backgroundTimer);
    window.clearTimeout(this._transitionTimer);
  }

  setConfig(config: unknown): void {
    this._config = normalizeConfig(config);
    this._backgroundIndex = 0;
    this._previousBackground = "";
    this._resolvedBackgrounds = [];
    this._stateFingerprint = "";
    this._resolveBackgrounds();
    this._restartBackgroundRotation();
    this._requestData();
    this._render();
  }

  set hass(value: HomeAssistantLike) {
    this._hass = value;
    this._resolveBackgrounds();
    this._requestData();
    const fingerprint = this._relevantStateFingerprint(value);
    if (fingerprint !== this._stateFingerprint) {
      this._stateFingerprint = fingerprint;
      this._render();
    } else {
      for (const card of this._embeddedCards.values()) card.hass = value;
    }
  }

  getCardSize(): number {
    return 12;
  }

  private _startClock(): void {
    window.clearInterval(this._clockTimer);
    const hasSeconds = Object.values(this._config.layout.zones).some((zone) =>
      zone?.widgets.some((widget) => widget.type === "clock" && widget.showSeconds)
    );
    this._clockTimer = window.setInterval(() => {
      const next = new Date();
      if (hasSeconds || next.getMinutes() !== this._now.getMinutes()) {
        this._now = next;
        this._refreshTimeWidgets();
      }
    }, 1000);
  }

  private _refreshTimeWidgets(): void {
    if (!this.shadowRoot) return;
    for (const zone of Object.values(this._config.layout.zones)) {
      for (const widget of zone?.widgets || []) {
        if (widget.type !== "clock" && widget.type !== "date") continue;
        const container = Array.from(this.shadowRoot.querySelectorAll<HTMLElement>("[data-widget-id]"))
          .find((element) => element.dataset.widgetId === widget.id);
        if (container) container.innerHTML = widget.type === "clock" ? this._renderClock(widget) : this._renderDate(widget);
      }
    }
  }

  private _relevantStateFingerprint(hass: HomeAssistantLike): string {
    const entityIds = new Set<string>();
    if (this._config.background.source === "sensor" && this._config.background.config?.entity) {
      entityIds.add(this._config.background.config.entity);
    }
    for (const zone of Object.values(this._config.layout.zones)) {
      for (const widget of zone?.widgets || []) {
        if (widget.entity) entityIds.add(widget.entity);
        for (const entity of widget.entities || []) entityIds.add(entity);
        for (const condition of widget.conditions || []) entityIds.add(condition.entity);
      }
    }
    return JSON.stringify(Array.from(entityIds).sort().map((entityId) => {
      const entity = hass.states[entityId];
      return entity ? [entityId, entity.state, entity.attributes] : [entityId, null];
    }));
  }

  private _restartBackgroundRotation(): void {
    window.clearInterval(this._backgroundTimer);
    const seconds = this._config.background.rotationInterval;
    if (seconds <= 0) return;
    this._backgroundTimer = window.setInterval(() => this._rotateBackground(), seconds * 1000);
  }

  private _rotateBackground(): void {
    if (this._resolvedBackgrounds.length < 2) return;
    this._previousBackground = this._currentBackground();
    this._backgroundIndex = (this._backgroundIndex + 1) % this._resolvedBackgrounds.length;
    this._render();
    window.clearTimeout(this._transitionTimer);
    this._transitionTimer = window.setTimeout(() => {
      this._previousBackground = "";
      this._render();
    }, this._config.background.transitionSeconds * 1000 + 40);
  }

  private _currentBackground(): string {
    if (!this._resolvedBackgrounds.length) return "";
    return this._resolvedBackgrounds[this._backgroundIndex % this._resolvedBackgrounds.length] || "";
  }

  private async _resolveBackgrounds(): Promise<void> {
    const raw = backgroundCandidates(this._config, this._hass?.states || {});
    const resolved = await Promise.all(raw.map((item) => this._resolveMedia(item)));
    const next = resolved.filter(Boolean);
    if (JSON.stringify(next) !== JSON.stringify(this._resolvedBackgrounds)) {
      this._resolvedBackgrounds = next;
      this._backgroundIndex %= Math.max(next.length, 1);
      this._render();
    }
  }

  private async _resolveMedia(value: string): Promise<string> {
    if (!value.startsWith("media-source://")) return value;
    const cached = this._mediaCache.get(value);
    if (cached) return cached;
    if (!this._hass?.callWS) return "";
    try {
      const response = await this._hass.callWS<{ url?: string }>({
        type: "media_source/resolve_media",
        media_content_id: value,
        expires: 60 * 60 * 24
      });
      const url = response?.url || "";
      if (url) this._mediaCache.set(value, url);
      return url;
    } catch {
      return "";
    }
  }

  private _requestData(): void {
    if (!this._hass?.callWS) return;
    for (const zone of Object.values(this._config.layout.zones)) {
      for (const widget of zone?.widgets || []) {
        if (widget.type === "forecast" && widget.entity) void this._requestForecast(widget);
        if ((widget.type === "agenda" || widget.type === "month-calendar") && widget.calendars?.length) {
          void this._requestCalendar(widget);
        }
      }
    }
  }

  private _shouldFetch(key: string, interval = 300_000): boolean {
    const last = this._lastFetch.get(key) || 0;
    if (Date.now() - last < interval) return false;
    this._lastFetch.set(key, Date.now());
    return true;
  }

  private async _requestForecast(widget: WidgetConfig): Promise<void> {
    const entity = widget.entity || "";
    const key = `forecast:${entity}:${widget.forecastType || "daily"}`;
    if (!this._shouldFetch(key)) return;
    try {
      const response = await this._hass!.callWS!({
        type: "call_service",
        domain: "weather",
        service: "get_forecasts",
        target: { entity_id: entity },
        service_data: { type: widget.forecastType || "daily" },
        return_response: true
      });
      this._forecasts.set(widget.id, parseForecastResponse(response, entity));
      this._render();
    } catch {
      this._forecasts.set(widget.id, []);
      this._render();
    }
  }

  private async _requestCalendar(widget: WidgetConfig): Promise<void> {
    const calendars = widget.calendars || [];
    const range = isoRange(Number(widget.days || (widget.type === "month-calendar" ? 42 : 2)));
    const key = `calendar:${calendars.map((item) => item.entity).sort().join(",")}:${range.start.slice(0, 10)}:${widget.days || 2}`;
    if (!this._shouldFetch(key)) return;
    try {
      const responses: Record<string, unknown> = {};
      await Promise.all(calendars.map(async (calendar) => {
        const response = await this._hass!.callWS!<Record<string, unknown>>({
          type: "call_service",
          domain: "calendar",
          service: "get_events",
          target: { entity_id: calendar.entity },
          service_data: { start_date_time: range.start, end_date_time: range.end },
          return_response: true
        });
        const root = (response?.response || response) as Record<string, unknown>;
        responses[calendar.entity] = root?.[calendar.entity] || { events: [] };
      }));
      this._events.set(widget.id, mergeCalendarEvents(responses, calendars));
      this._render();
    } catch {
      this._events.set(widget.id, []);
      this._render();
    }
  }

  private _render(): void {
    if (!this.shadowRoot) return;
    const config = this._config;
    const layout = layoutDefinition(config.layout.format);
    const appearance = config.appearance;
    const currentBackground = this._currentBackground();
    const previousBackground = this._previousBackground;
    const providerWarning = unsupportedProvider(config);
    const zones = activeZones(config.layout.format).map((zoneName) => this._renderZone(zoneName, layout.zoneAreas[zoneName])).join("");
    const variables = [
      `--hp-font:${appearance.fontFamily}`,
      `--hp-text:${appearance.fontColor}`,
      `--hp-accent:${appearance.accentColor}`,
      `--hp-shadow:${appearance.textShadow}`,
      `--hp-rail:${appearance.railColor}`,
      `--hp-glass:${appearance.glassColor}`,
      `--hp-scrim:${appearance.scrimColor}`,
      `--hp-scale:${appearance.scale}`,
      `--hp-padding:${config.layout.spacing.padding}px`,
      `--hp-zone-gap:${config.layout.spacing.zoneGap}px`,
      `--hp-widget-gap:${config.layout.spacing.widgetGap}px`,
      `--hp-object-fit:${config.background.objectFit}`,
      `--hp-object-position:${config.background.position}`,
      `--hp-bg-transition:${config.background.transitionSeconds}s`
    ].join(";");
    const backgroundOpacity = config.background.opacity;

    this.shadowRoot.innerHTML = `
      <style>${cardStyles}</style>
      <ha-card style="${escapeHtml(variables)}" aria-label="${escapeHtml(config.name || "HearthPane")}">
        <div class="hp-shell format-${escapeHtml(config.layout.format)}">
          <div class="hp-background" style="opacity:${backgroundOpacity}">
            ${previousBackground
              ? `<img src="${escapeHtml(previousBackground)}" alt="" />`
              : currentBackground
                ? `<img src="${escapeHtml(currentBackground)}" alt="" />`
                : `<div class="hp-empty-background"></div>`}
          </div>
          ${previousBackground && currentBackground ? `<div class="hp-background-next is-visible" style="opacity:${backgroundOpacity}"><img src="${escapeHtml(currentBackground)}" alt="" /></div>` : ""}
          <div class="hp-scrim"></div>
          <div class="hp-rail"></div>
          <div class="hp-grid" style="grid-template-columns:${escapeHtml(layout.columns)};grid-template-rows:${escapeHtml(layout.rows)}">
            ${zones}
          </div>
          ${providerWarning ? `<div class="hp-warning">${escapeHtml(humanize(providerWarning))} backgrounds are not supported. Choose Home Assistant media, a local URL, an image list, or a sensor files attribute.</div>` : ""}
        </div>
      </ha-card>`;

    void this._hydrateEmbeddedCards();
  }

  private _renderZone(zoneName: ZoneName, area: string): string {
    const zone = this._config.layout.zones[zoneName] || { widgets: [] };
    const widgets = zone.widgets.map((widget) => this._renderWidget(widget)).filter(Boolean).join("");
    const classes = ["hp-zone", widgets ? "" : "is-empty", zone.glass ? "is-glass" : ""].filter(Boolean).join(" ");
    const padding = this._zonePadding(zoneName);
    return `<section class="${classes}" data-zone="${zoneName}" style="grid-area:${escapeHtml(area)};padding:${padding};align-items:${zone.align || "stretch"};justify-content:${zone.justify || "start"};flex-direction:${zone.direction || "column"}">${widgets}</section>`;
  }

  private _zonePadding(zoneName: ZoneName): string {
    const outer = this._config.layout.spacing.padding;
    const inner = this._config.layout.spacing.zoneGap / 2;
    const top = zoneName.startsWith("top") ? outer : inner;
    const bottom = zoneName.startsWith("bottom") ? outer : inner;
    const left = zoneName.endsWith("left") ? outer : inner;
    const right = zoneName.endsWith("right") ? outer : inner;
    if (this._config.layout.format.startsWith("vertical")) {
      return `${top}px ${outer}px ${bottom}px ${outer}px`;
    }
    if (this._config.layout.format.startsWith("horizontal")) {
      return `${outer}px ${right}px ${outer}px ${left}px`;
    }
    return `${top}px ${right}px ${bottom}px ${left}px`;
  }

  private _renderWidget(widget: WidgetConfig): string {
    let body = "";
    switch (widget.type) {
      case "clock": body = this._renderClock(widget); break;
      case "date": body = this._renderDate(widget); break;
      case "current-weather": body = this._renderCurrentWeather(widget); break;
      case "forecast": body = this._renderForecast(widget); break;
      case "agenda": body = this._renderAgenda(widget); break;
      case "month-calendar": body = this._renderMonth(widget); break;
      case "entity": body = this._renderEntity(widget); break;
      case "alerts": body = this._renderAlerts(widget); break;
      case "action-bar": body = this._renderActionBar(widget); break;
      case "separator": body = `<div class="hp-separator"></div>`; break;
      case "ha-card": body = this._renderEmbedded(widget); break;
      case "transportation": body = this._renderTransportation(widget); break;
      default: body = `<div class="hp-widget-placeholder">Unknown widget: ${escapeHtml(widget.type)}</div>`;
    }
    return body ? `<div class="hp-widget hp-widget-${escapeHtml(widget.type)}" data-widget-id="${escapeHtml(widget.id)}">${body}</div>` : "";
  }

  private _renderClock(widget: WidgetConfig): string {
    const locale = widget.locale || this._config.appearance.locale || localeFor(this._hass);
    const timeZone = widget.timeZone || this._config.appearance.timeZone || timeZoneFor(this._hass);
    const parts = timeParts(this._now, locale, timeZone, widget.hour12 !== false, Boolean(widget.showSeconds));
    return `<div class="hp-clock" style="--hp-clock-size:${escapeHtml(widget.fontSize || "9rem")}"><span class="hp-clock-time">${escapeHtml(parts.time)}</span>${parts.period ? `<span class="hp-clock-period">${escapeHtml(parts.period)}</span>` : ""}</div>`;
  }

  private _renderDate(widget: WidgetConfig): string {
    const locale = widget.locale || this._config.appearance.locale || localeFor(this._hass);
    const timeZone = widget.timeZone || this._config.appearance.timeZone || timeZoneFor(this._hass);
    return `<div class="hp-date" style="--hp-date-size:${escapeHtml(widget.fontSize || "2rem")}">${escapeHtml(fullDate(this._now, locale, timeZone, widget.format || "full"))}</div>`;
  }

  private _renderCurrentWeather(widget: WidgetConfig): string {
    if (!widget.entity) return `<div class="hp-widget-placeholder">Choose a weather entity</div>`;
    const entity = this._hass?.states[widget.entity];
    if (!entity || ["unavailable", "unknown"].includes(entity.state)) return "";
    const temperature = entity.attributes.temperature ?? entity.attributes.native_temperature;
    const humidity = entity.attributes.humidity;
    const unit = String(entity.attributes.temperature_unit || "°");
    const detail = humidity == null ? "" : `Humidity ${humidity}%`;
    return `<div class="hp-weather-current">
      ${weatherIcon(entity.state, widget.animation !== false)}
      <div class="hp-weather-copy"><div class="hp-weather-label">${escapeHtml(weatherLabel(entity.state))}</div>${detail ? `<div class="hp-weather-detail">${escapeHtml(detail)}</div>` : ""}</div>
      <div class="hp-weather-temp">${escapeHtml(formatTemperature(temperature, unit))}</div>
    </div>`;
  }

  private _renderForecast(widget: WidgetConfig): string {
    if (!widget.entity) return `<div class="hp-widget-placeholder">Choose a forecast entity</div>`;
    const forecast = (this._forecasts.get(widget.id) || []).slice(0, Math.max(1, Number(widget.days || 3)));
    if (!forecast.length) return "";
    const locale = widget.locale || this._config.appearance.locale || localeFor(this._hass);
    const unit = String(this._hass?.states[widget.entity]?.attributes.temperature_unit || "°");
    return `<div class="hp-forecast">${forecast.map((item) => {
      const date = new Date(item.datetime);
      const day = Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
      const high = item.temperature ?? item.native_temperature;
      const low = item.templow ?? item.native_templow;
      return `<div class="hp-forecast-row"><div class="hp-forecast-day">${escapeHtml(day)}</div>${weatherIcon(item.condition, false)}<div class="hp-forecast-condition">${escapeHtml(weatherLabel(item.condition))}</div><div class="hp-forecast-range">${escapeHtml(formatTemperature(low, unit))} · ${escapeHtml(formatTemperature(high, unit))}</div></div>`;
    }).join("")}</div>`;
  }

  private _renderAgenda(widget: WidgetConfig): string {
    const events = (this._events.get(widget.id) || []).slice(0, Math.max(1, Number(widget.maxItems || 3)));
    if (!events.length) return "";
    const locale = widget.locale || this._config.appearance.locale || localeFor(this._hass);
    return `<div class="hp-agenda">${widget.title ? `<div class="hp-agenda-title">${escapeHtml(widget.title)}</div>` : ""}${events.map((event) => this._renderEvent(event, locale)).join("")}</div>`;
  }

  private _renderEvent(event: CalendarEvent, locale: string): string {
    const date = new Date(event.start);
    const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
    const day = new Intl.DateTimeFormat(locale, { day: "numeric" }).format(date);
    const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
    const time = event.allDay ? "All day" : new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date);
    return `<div class="hp-event" style="--hp-event-color:${escapeHtml(event.color)}"><div class="hp-event-date"><span class="hp-event-weekday">${escapeHtml(weekday)}</span><span class="hp-event-day">${escapeHtml(day)}</span><span class="hp-event-month">${escapeHtml(month)}</span></div><div class="hp-event-bar"></div><div class="hp-event-copy"><div class="hp-event-summary">${escapeHtml(event.summary)}</div><div class="hp-event-time">${escapeHtml(time)}</div></div></div>`;
  }

  private _renderMonth(widget: WidgetConfig): string {
    const locale = widget.locale || this._config.appearance.locale || localeFor(this._hass);
    const date = this._now;
    const year = date.getFullYear();
    const month = date.getMonth();
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    const events = this._events.get(widget.id) || [];
    const eventDays = new Set(events.map((event) => new Date(event.start).getDate()));
    const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2024, 0, 7 + index)));
    const leading = first.getDay();
    const blanks = Array.from({ length: leading }, () => `<div class="hp-month-day"></div>`).join("");
    const cells = Array.from({ length: days }, (_, index) => {
      const value = index + 1;
      const today = value === date.getDate();
      return `<div class="hp-month-day ${today ? "is-today" : ""} ${eventDays.has(value) ? "has-event" : ""}">${value}</div>`;
    }).join("");
    const trailing = Array.from({ length: Math.max(0, 42 - leading - days) }, () => `<div class="hp-month-day"></div>`).join("");
    return `<div class="hp-month"><div class="hp-month-heading">${escapeHtml(new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date))}</div>${weekdays.map((day) => `<div class="hp-month-weekday">${escapeHtml(day)}</div>`).join("")}${blanks}${cells}${trailing}</div>`;
  }

  private _renderEntity(widget: WidgetConfig): string {
    if (!widget.entity) return `<div class="hp-widget-placeholder">Choose an entity</div>`;
    const entity = this._hass?.states[widget.entity];
    if (!entity || ["unavailable", "unknown"].includes(entity.state)) return "";
    const value = widget.attribute ? entity.attributes[widget.attribute] : entity.state;
    const label = widget.title || String(entity.attributes.friendly_name || humanize(widget.entity));
    return `<div class="hp-entity"><div class="hp-entity-name">${escapeHtml(label)}</div><div class="hp-entity-value">${escapeHtml(String(value ?? "—"))}</div></div>`;
  }

  private _renderAlerts(widget: WidgetConfig): string {
    const conditions = (widget.conditions || []).filter((condition) => this._hass && isAlertVisible(condition, this._hass));
    if (!conditions.length) return "";
    return `<div class="hp-alerts">${conditions.map((condition) => {
      const entity = this._hass!.states[condition.entity];
      const label = condition.label || String(entity.attributes.friendly_name || humanize(condition.entity));
      return `<div class="hp-alert" style="--hp-alert-color:${escapeHtml(condition.color || "#ffb74d")}">${actionIcon(condition.icon || "alert")}<div><div class="hp-alert-label">${escapeHtml(label)}</div><div class="hp-alert-state">${escapeHtml(humanize(entity.state))}</div></div></div>`;
    }).join("")}</div>`;
  }

  private _renderActionBar(widget: WidgetConfig): string {
    const actions = widget.actions || [];
    if (!actions.length) return "";
    return `<div class="hp-action-bar">${actions.map((action, index) => `<button class="hp-action" data-action-widget="${escapeHtml(widget.id)}" data-action-index="${index}" ${action.action === "none" ? "disabled" : ""}>${actionIcon(action.icon || "circle")}<span class="hp-action-label">${escapeHtml(action.label || humanize(action.action))}</span></button>`).join("")}</div>`;
  }

  private _renderEmbedded(widget: WidgetConfig): string {
    if (!widget.card || typeof widget.card !== "object") return `<div class="hp-widget-placeholder">Configure a Home Assistant card</div>`;
    return `<div class="hp-embedded-card" data-embedded-id="${escapeHtml(widget.id)}"></div>`;
  }

  private _renderTransportation(widget: WidgetConfig): string {
    if (!widget.entity) return `<div class="hp-widget-placeholder">Choose a departures entity</div>`;
    const entity = this._hass?.states[widget.entity];
    if (!entity || ["unavailable", "unknown"].includes(entity.state)) return "";
    const attribute = widget.rowsAttribute || widget.attribute || "departures";
    const rows = entity.attributes[attribute];
    if (!Array.isArray(rows) || !rows.length) return "";
    const fields = widget.fields || {};
    const nameField = fields.name || "name";
    const timeField = fields.time || "time";
    return `<div class="hp-transport">${rows.slice(0, Number(widget.maxItems || 4)).map((raw) => {
      const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
      return `<div class="hp-transport-row">${actionIcon(widget.icon || "train")}<div class="hp-transport-name">${escapeHtml(row[nameField] ?? "Departure")}</div><div class="hp-transport-time">${escapeHtml(row[timeField] ?? "—")}</div></div>`;
    }).join("")}</div>`;
  }

  private async _hydrateEmbeddedCards(): Promise<void> {
    if (!this.shadowRoot) return;
    const containers = Array.from(this.shadowRoot.querySelectorAll<HTMLElement>("[data-embedded-id]"));
    if (!containers.length) return;
    if (!window.loadCardHelpers) {
      for (const container of containers) container.innerHTML = `<div class="hp-widget-placeholder">Home Assistant card helpers are unavailable</div>`;
      return;
    }
    try {
      const helpers = await window.loadCardHelpers();
      for (const container of containers) {
        const id = container.dataset.embeddedId || "";
        const widget = this._findWidget(id);
        if (!widget?.card) continue;
        try {
          let card = this._embeddedCards.get(id);
          if (!card) {
            card = helpers.createCardElement(widget.card);
            this._embeddedCards.set(id, card);
          }
          card.hass = this._hass;
          container.replaceChildren(card);
        } catch {
          container.innerHTML = `<div class="hp-widget-placeholder">Embedded card is unavailable</div>`;
        }
      }
    } catch {
      for (const container of containers) container.innerHTML = `<div class="hp-widget-placeholder">Embedded card is unavailable</div>`;
    }
  }

  private _findWidget(id: string): WidgetConfig | undefined {
    for (const zone of Object.values(this._config.layout.zones)) {
      const widget = zone?.widgets.find((item) => item.id === id);
      if (widget) return widget;
    }
    return undefined;
  }

  private _handleClick(event: Event): void {
    const target = (event.target as Element | null)?.closest<HTMLElement>("[data-action-widget]");
    if (!target) return;
    const widget = this._findWidget(target.dataset.actionWidget || "");
    const action = widget?.actions?.[Number(target.dataset.actionIndex || 0)];
    if (action && this._hass) void performHearthPaneAction(this, this._hass, action);
  }
}
