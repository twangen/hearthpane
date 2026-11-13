import { classicPreset, normalizeConfig, unsupportedProvider } from "./config";
import { activeZones } from "./layouts";
import type {
  CalendarSource,
  HearthPaneAction,
  HearthPaneConfig,
  HomeAssistantLike,
  WidgetConfig,
  WidgetType,
  ZoneName
} from "./types";
import { deepClone, escapeHtml, humanize } from "./utils";

const WIDGET_TYPES: WidgetType[] = [
  "clock",
  "date",
  "current-weather",
  "forecast",
  "agenda",
  "month-calendar",
  "entity",
  "alerts",
  "action-bar",
  "separator",
  "ha-card",
  "transportation"
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224];
const FONT_WEIGHTS = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semi-bold" },
  { value: "700", label: "Bold" }
];
const FONT_STYLES = [
  { value: "normal", label: "Normal" },
  { value: "italic", label: "Italic" }
];
const TEXT_ALIGNMENTS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" }
];

type DrawerMode = "closed" | "dashboard" | "widget";
type CanvasMode = "design" | "preview";

interface DeletedWidget {
  widget: WidgetConfig;
  zone: ZoneName;
  index: number;
  selectedWidget: string;
  drawerMode: DrawerMode;
}

const editorStyles = `
  :host { display:block; color:var(--primary-text-color,#e8eef6); font-family:var(--paper-font-body1_-_font-family,Roboto,sans-serif); }
  * { box-sizing:border-box; }
  .summary { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:16px; border:1px solid var(--divider-color,rgba(127,127,127,.25)); border-radius:12px; }
  .summary-copy strong { display:block; margin-bottom:4px; }
  .muted { color:var(--secondary-text-color,#9aa7b2); font-size:.84rem; }
  button,select,input,textarea { font:inherit; }
  button { border:0; border-radius:9px; padding:9px 13px; background:var(--primary-color,#03a9f4); color:var(--text-primary-color,#fff); cursor:pointer; }
  button.secondary { background:var(--secondary-background-color,#253240); }
  button.danger { background:#8f3440; }
  .designer { position:fixed; inset:0; z-index:99999; display:grid; width:100vw; height:100vh; max-width:none; max-height:none; margin:0; padding:0; grid-template-rows:auto minmax(0,1fr); border:0; background:#0b1118; color:#eef5ff; }
  .designer::backdrop { background:#0b1118; }
  .toolbar { display:flex; align-items:center; gap:10px; min-height:58px; padding:8px 14px; border-bottom:1px solid #263444; background:#121b25; }
  .brand { font-weight:700; letter-spacing:.02em; margin-right:auto; }
  .toolbar label { display:flex; align-items:center; gap:7px; color:#aebccc; font-size:.8rem; }
  .toolbar select { min-width:150px; border:1px solid #334456; border-radius:8px; padding:7px 10px; background:#0e1720; color:#fff; }
  .mode-toggle { display:flex; padding:3px; border:1px solid #314254; border-radius:10px; background:#0b141d; }
  .mode-toggle button { min-height:34px; padding:6px 11px; background:transparent; color:#8fa2b5; }
  .mode-toggle button.is-active { background:#263849; color:#fff; }
  button:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible,.drag-handle:focus-visible { outline:2px solid #7bc8fa; outline-offset:2px; }
  .workspace { display:grid; grid-template-columns:220px minmax(0,1fr) 0; min-width:0; min-height:0; transition:grid-template-columns .18s ease; }
  .workspace.drawer-open { grid-template-columns:220px minmax(0,1fr) 360px; }
  .palette,.drawer { overflow:auto; background:#111a24; }
  .palette { border-right:1px solid #263444; padding:15px; }
  .drawer { min-width:0; border-left:1px solid #263444; }
  .workspace:not(.drawer-open) .drawer { border-left:0; visibility:hidden; }
  .drawer-head { position:sticky; top:0; z-index:2; display:grid; grid-template-columns:minmax(0,1fr) 40px; gap:10px; align-items:center; min-height:66px; padding:11px 14px; border-bottom:1px solid #263444; background:#111a24; }
  .drawer-title { min-width:0; }
  .drawer-title h2 { overflow:hidden; margin:0 0 3px; font-size:1rem; white-space:nowrap; text-overflow:ellipsis; }
  .drawer-title p { overflow:hidden; margin:0; color:#8394a8; font-size:.7rem; white-space:nowrap; text-overflow:ellipsis; }
  .icon-button { display:grid; min-width:36px; min-height:36px; padding:0; place-items:center; border:1px solid #33485b; border-radius:8px; background:#223242; color:#e8f2fa; }
  .icon-button.danger { border-color:#683842; background:#45262d; color:#ffbdc5; }
  .drawer-body { padding:15px; }
  .inspector-section { margin:0 0 18px; padding:0 0 16px; border-bottom:1px solid #263444; }
  .inspector-section:last-child { border-bottom:0; }
  .inspector-section h3 { margin:0 0 12px; color:#dce8f2; font-size:.76rem; letter-spacing:.08em; text-transform:uppercase; }
  .position-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .position-actions button { min-height:38px; }
  .danger-zone { padding:12px; border:1px solid #54313a; border-radius:9px; background:#25181d; }
  .danger-zone button { width:100%; min-height:40px; }
  .panel-title { margin:4px 0 12px; font-size:.72rem; letter-spacing:.12em; color:#8394a8; text-transform:uppercase; }
  .palette-items { display:grid; gap:7px; }
  .palette-item { display:flex; min-height:40px; align-items:center; justify-content:flex-start; width:100%; border:1px solid #2d3d4f; background:#182430; color:#eef5ff; text-align:left; touch-action:none; }
  .palette-item:hover { border-color:#5aaee8; }
  .canvas-wrap { display:grid; min-width:0; min-height:0; overflow:auto; place-items:center; padding:22px; background:repeating-linear-gradient(45deg,#0d141c,#0d141c 12px,#101923 12px,#101923 24px); }
  .canvas { display:grid; width:min(100%,1280px); aspect-ratio:16/10; margin:auto; gap:10px; padding:12px; border:1px solid #35485b; border-radius:10px; background:#101c26; box-shadow:0 16px 44px rgba(0,0,0,.35); }
  .preview-stage { position:relative; display:block; width:min(100%,1280px); aspect-ratio:16/10; overflow:hidden; border:1px solid #35485b; border-radius:10px; background:#080c12; box-shadow:0 16px 44px rgba(0,0,0,.35); }
  .preview-surface { position:absolute; top:0; left:0; width:1280px; height:800px; transform-origin:top left; }
  .preview-card { display:block; width:1280px; height:800px; pointer-events:none; }
  .preview-shield { position:absolute; inset:0; z-index:5; cursor:default; }
  .preview-badge { position:absolute; top:12px; left:12px; z-index:6; padding:6px 9px; border:1px solid rgba(255,255,255,.2); border-radius:7px; background:rgba(7,13,20,.82); color:#dce8f2; font-size:.7rem; }
  .canvas.format-vertical-2-1,.canvas.format-vertical-1-2 { grid-template-columns:2fr 1fr; grid-template-rows:repeat(3,1fr); }
  .canvas.format-vertical-1-2 { grid-template-columns:1fr 2fr; }
  .canvas.format-horizontal-2-1,.canvas.format-horizontal-1-2 { grid-template-columns:repeat(3,1fr); grid-template-rows:2fr 1fr; }
  .canvas.format-horizontal-1-2 { grid-template-rows:1fr 2fr; }
  .canvas.format-3x3 { grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr); }
  .drop-zone { display:flex; min-width:0; min-height:0; flex-direction:column; gap:6px; padding:8px; border:1px dashed #40556a; border-radius:8px; background:rgba(14,24,34,.72); transition:.15s ease; }
  .drop-zone.is-over { border-color:#63baf4; background:rgba(41,101,139,.35); transform:scale(.99); }
  .zone-name { color:#71869a; font-size:.61rem; letter-spacing:.08em; text-transform:uppercase; }
  .widget-tile { position:relative; display:grid; grid-template-columns:24px minmax(0,1fr) auto; align-items:center; gap:6px; min-height:48px; padding:5px 6px; border:1px solid #2e4154; border-radius:7px; background:#1a2835; font-size:.76rem; }
  .widget-tile.is-selected { border-color:#68bdf5; box-shadow:0 0 0 1px #68bdf5; }
  .drag-handle { display:grid; min-width:24px; min-height:36px; padding:0; place-items:center; border:0; background:transparent; color:#8094a8; cursor:grab; touch-action:none; user-select:none; }
  .tile-label { display:grid; min-width:0; min-height:36px; padding:0 5px; align-content:center; border:0; background:transparent; color:#eef5ff; text-align:left; cursor:pointer; }
  .tile-label strong,.tile-label small { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  .tile-label strong { font-size:.75rem; font-weight:600; }
  .tile-label small { margin-top:2px; color:#7f94a8; font-size:.62rem; }
  .tile-actions { display:flex; gap:4px; }
  .tile-actions button { min-width:36px; min-height:36px; padding:0; border-radius:7px; background:#253747; color:#d8e6f2; font-size:.82rem; }
  .tile-actions button.danger { background:#45262d; color:#ffbdc5; }
  .field { display:grid; gap:6px; margin-bottom:13px; }
  .field > label,.field-label { color:#9eb0c2; font-size:.72rem; }
  .field input,.field select,.field textarea { width:100%; border:1px solid #324457; border-radius:7px; padding:8px 9px; background:#0b141d; color:#f4f8fc; }
  .field textarea { min-height:100px; resize:vertical; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:.72rem; }
  .check { display:flex; align-items:center; gap:8px; margin:10px 0; font-size:.78rem; color:#bac7d4; }
  .check input { width:auto; }
  .group { margin:14px 0; padding:10px; border:1px solid #2a3b4d; border-radius:8px; }
  .group-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; font-size:.74rem; font-weight:600; }
  .group-head button { padding:4px 7px; background:#51303a; font-size:.68rem; }
  .warning { margin:0 0 12px; padding:9px; border:1px solid #875d28; border-radius:7px; background:#332610; color:#ffd59c; font-size:.74rem; }
  .help { margin:-4px 0 13px; color:#8394a8; font-size:.7rem; line-height:1.4; }
  .undo-banner { position:fixed; z-index:100000; left:50%; bottom:20px; display:flex; align-items:center; gap:16px; min-width:280px; max-width:min(90vw,520px); padding:11px 13px 11px 16px; border:1px solid #3b5063; border-radius:11px; background:#17232e; box-shadow:0 12px 34px rgba(0,0,0,.55); transform:translateX(-50%); }
  .undo-banner span { overflow:hidden; flex:1; white-space:nowrap; text-overflow:ellipsis; }
  .undo-banner button { min-height:36px; background:#2c6f99; }
  ha-entity-picker { display:block; width:100%; --mdc-theme-surface:#0b141d; }
  @media (max-width:900px) {
    .toolbar { flex-wrap:wrap; }
    .workspace,.workspace.drawer-open { grid-template-columns:170px minmax(320px,1fr); }
    .drawer { position:absolute; z-index:4; top:58px; right:0; bottom:0; width:min(360px,85vw); box-shadow:-12px 0 32px rgba(0,0,0,.45); }
  }
`;

function widgetDefaults(type: WidgetType, id: string): WidgetConfig {
  const common = { id, type } as WidgetConfig;
  switch (type) {
    case "clock": return { ...common, hour12: true, showSeconds: false, fontSize: "9rem" };
    case "date": return { ...common, format: "full", fontSize: "2rem" };
    case "current-weather": return { ...common, entity: "", animation: true };
    case "forecast": return { ...common, entity: "", days: 3, forecastType: "daily", animation: false };
    case "agenda": return { ...common, calendars: [], days: 2, maxItems: 3 };
    case "month-calendar": return { ...common, calendars: [], days: 42 };
    case "entity": return { ...common, entity: "" };
    case "alerts": return { ...common, conditions: [] };
    case "action-bar": return { ...common, actions: [{ action: "none", label: "Action", icon: "circle" }] };
    case "ha-card": return { ...common, card: { type: "markdown", content: "HearthPane embedded card" } };
    case "transportation": return { ...common, entity: "", rowsAttribute: "departures", fields: { name: "name", time: "time" }, maxItems: 4 };
    default: return common;
  }
}

export class HearthPaneCardEditor extends HTMLElement {
  private _hass?: HomeAssistantLike;
  private _config: HearthPaneConfig = classicPreset();
  private _open = false;
  private _drawerMode: DrawerMode = "closed";
  private _canvasMode: CanvasMode = "design";
  private _selectedWidget = "";
  private _emitTimer = 0;
  private _undoTimer = 0;
  private _deletedWidget?: DeletedWidget;
  private _drag?: { widgetId?: string; paletteType?: WidgetType; over?: ZoneName };
  private _boundPointerMove = (event: PointerEvent) => this._pointerMove(event);
  private _boundPointerUp = () => this._pointerUp();

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot?.addEventListener("click", (event) => this._click(event));
    this.shadowRoot?.addEventListener("change", (event) => this._change(event));
    this.shadowRoot?.addEventListener("input", (event) => this._input(event));
    this.shadowRoot?.addEventListener("pointerdown", (event) => this._pointerDown(event as PointerEvent));
  }

  disconnectedCallback(): void {
    document.removeEventListener("pointermove", this._boundPointerMove);
    document.removeEventListener("pointerup", this._boundPointerUp);
    window.clearTimeout(this._undoTimer);
  }

  setConfig(config: unknown): void {
    this._config = normalizeConfig(config);
    this._render();
  }

  set hass(value: HomeAssistantLike) {
    this._hass = value;
    this._hydrateEntityPickers();
    this._syncPreview();
  }

  private _render(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `<style>${editorStyles}</style>${this._open ? this._renderDesigner() : this._renderSummary()}`;
    if (this._open) {
      const dialog = this.shadowRoot.querySelector<HTMLDialogElement>("dialog.designer");
      if (dialog && typeof dialog.showModal === "function" && !dialog.open) {
        dialog.showModal();
        dialog.addEventListener("cancel", (event) => {
          event.preventDefault();
          if (this._drawerMode !== "closed") this._drawerMode = "closed";
          else this._open = false;
          this._render();
        }, { once: true });
      } else if (dialog) {
        dialog.setAttribute("open", "");
      }
    }
    this._hydrateEntityPickers();
    this._syncPreview();
  }

  private _renderSummary(): string {
    const count = this._widgetLocations().length;
    return `<div class="summary"><div class="summary-copy"><strong>HearthPane</strong><div class="muted">${escapeHtml(humanize(this._config.layout.format))} · ${count} widget${count === 1 ? "" : "s"}</div></div><button data-command="open">Open full designer</button></div>`;
  }

  private _renderDesigner(): string {
    return `<dialog class="designer">
      <div class="toolbar">
        <div class="brand">HearthPane Designer</div>
        <div class="mode-toggle" role="group" aria-label="Canvas mode">
          <button data-command="canvas-design" class="${this._canvasMode === "design" ? "is-active" : ""}" aria-pressed="${this._canvasMode === "design"}">Design</button>
          <button data-command="canvas-preview" class="${this._canvasMode === "preview" ? "is-active" : ""}" aria-pressed="${this._canvasMode === "preview"}">Preview</button>
        </div>
        <label>Layout <select data-layout>${["vertical-2-1", "vertical-1-2", "horizontal-2-1", "horizontal-1-2", "3x3"].map((format) => `<option value="${format}" ${format === this._config.layout.format ? "selected" : ""}>${escapeHtml(humanize(format))}</option>`).join("")}</select></label>
        <button class="secondary" data-command="dashboard-settings" aria-pressed="${this._drawerMode === "dashboard"}">⚙ Dashboard settings</button>
        <button class="secondary" data-command="classic">HearthPane Classic</button>
        <button class="secondary" data-command="close">Done</button>
      </div>
      <div class="workspace ${this._drawerMode === "closed" ? "" : "drawer-open"}">
        <aside class="palette"><div class="panel-title">Widget palette</div><div class="palette-items">${WIDGET_TYPES.map((type) => `<button class="palette-item" data-palette-type="${type}" title="Drag or click to add">＋ ${escapeHtml(humanize(type))}</button>`).join("")}</div></aside>
        <main class="canvas-wrap">${this._renderCanvas()}</main>
        ${this._renderDrawer()}
      </div>
      ${this._renderUndoBanner()}
    </dialog>`;
  }

  private _renderCanvas(): string {
    if (this._canvasMode === "preview") {
      return `<div class="preview-stage"><div class="preview-surface"><hearthpane-card class="preview-card" aria-label="HearthPane preview"></hearthpane-card></div><div class="preview-shield" aria-hidden="true"></div><div class="preview-badge">Preview · actions disabled</div></div>`;
    }
    return `<div class="canvas format-${escapeHtml(this._config.layout.format)}">${this._renderZones()}</div>`;
  }

  private _renderDrawer(): string {
    if (this._drawerMode === "dashboard") {
      return `<aside class="drawer" aria-label="Dashboard settings"><div class="drawer-head"><div class="drawer-title"><h2>Dashboard settings</h2><p>Background, theme, layout, and spacing</p></div><button class="icon-button" data-command="close-drawer" aria-label="Close dashboard settings">×</button></div><div class="drawer-body">${this._renderDashboardSettings()}</div></aside>`;
    }
    const location = this._drawerMode === "widget" ? this._findWidget(this._selectedWidget) : undefined;
    if (location) {
      const label = location.widget.title || humanize(location.widget.type);
      return `<aside class="drawer" aria-label="Edit ${escapeHtml(label)}"><div class="drawer-head"><div class="drawer-title"><h2>Edit ${escapeHtml(label)}</h2><p>${escapeHtml(humanize(location.widget.type))} · ${escapeHtml(humanize(location.zone))}</p></div><button class="icon-button" data-command="close-drawer" aria-label="Close widget editor">×</button></div><div class="drawer-body">${this._renderWidgetInspector(location.widget, location.zone, location.index)}</div></aside>`;
    }
    return `<aside class="drawer" aria-hidden="true"></aside>`;
  }

  private _renderUndoBanner(): string {
    if (!this._deletedWidget) return "";
    const label = this._deletedWidget.widget.title || humanize(this._deletedWidget.widget.type);
    return `<div class="undo-banner" role="status"><span>${escapeHtml(label)} removed</span><button data-command="undo-delete">Undo</button></div>`;
  }

  private _renderZones(): string {
    return activeZones(this._config.layout.format).map((zoneName, index) => {
      const zone = this._config.layout.zones[zoneName] || { widgets: [] };
      let style = "";
      if (this._config.layout.format.startsWith("vertical")) {
        const column = zoneName.endsWith("left") ? 1 : 2;
        const row = zoneName.startsWith("top") ? 1 : zoneName.startsWith("middle") ? 2 : 3;
        style = `grid-column:${column};grid-row:${row}`;
      } else if (this._config.layout.format.startsWith("horizontal")) {
        const column = zoneName.endsWith("left") ? 1 : zoneName.endsWith("center") ? 2 : 3;
        const row = zoneName.startsWith("top") ? 1 : 2;
        style = `grid-column:${column};grid-row:${row}`;
      } else {
        style = `grid-column:${index % 3 + 1};grid-row:${Math.floor(index / 3) + 1}`;
      }
      const widgets = zone.widgets.map((widget) => {
        const label = widget.title || humanize(widget.type);
        const selected = widget.id === this._selectedWidget && this._drawerMode === "widget";
        return `<div class="widget-tile ${selected ? "is-selected" : ""}" data-widget-tile="${escapeHtml(widget.id)}"><button class="drag-handle" data-drag-widget="${escapeHtml(widget.id)}" aria-label="Drag ${escapeHtml(label)}" title="Drag ${escapeHtml(label)}">⠿</button><button class="tile-label" data-command="edit-widget" data-widget-id="${escapeHtml(widget.id)}" aria-label="Edit ${escapeHtml(label)}"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(humanize(widget.type))}</small></button><span class="tile-actions"><button title="Edit ${escapeHtml(label)}" aria-label="Edit ${escapeHtml(label)}" data-command="edit-widget" data-widget-id="${escapeHtml(widget.id)}">✎</button><button class="danger" title="Delete ${escapeHtml(label)}" aria-label="Delete ${escapeHtml(label)}" data-command="delete-widget" data-widget-id="${escapeHtml(widget.id)}">×</button></span></div>`;
      }).join("");
      return `<section class="drop-zone" data-drop-zone="${zoneName}" style="${style}"><div class="zone-name">${escapeHtml(humanize(zoneName))}</div>${widgets}</section>`;
    }).join("");
  }

  private _renderDashboardSettings(): string {
    const provider = unsupportedProvider(this._config);
    const backgroundSource = this._config.background.source;
    const backgroundFields = backgroundSource === "sensor"
      ? `${this._field("Sensor entity", "background.config.entity", this._config.background.config?.entity || "", "entity")}${this._field("Sensor attribute", "background.config.attribute", this._config.background.config?.attribute || "files")}`
      : backgroundSource === "images"
        ? this._textAreaField("Images (one path or URL per line)", "background.images", (this._config.background.images || []).join("\n"), true)
        : ["url", "media"].includes(backgroundSource)
          ? this._field(backgroundSource === "media" ? "Home Assistant file or media ID" : "Image URL", "background.url", this._config.background.url || "")
          : `<div class="help">Picsum supplies free random 1920×1080 photos and rotates them at the interval below. This source makes requests to picsum.photos.</div>`;
    return `${provider ? `<div class="warning">${escapeHtml(humanize(provider))} is not a supported background provider and will never make a network request.</div>` : ""}
      <section class="inspector-section"><h3>Background</h3>
        ${this._selectField("Source", "background.source", backgroundSource, ["picsum", "media", "url", "images", ...(backgroundSource === "sensor" ? ["sensor"] : [])])}
        ${backgroundFields}
        ${this._field("Rotation seconds", "background.rotationInterval", this._config.background.rotationInterval, "number", "0", "86400", "1")}
        ${this._field("Opacity", "background.opacity", this._config.background.opacity, "number", "0", "1", "0.05")}
        ${this._selectField("Crop", "background.objectFit", this._config.background.objectFit, ["cover", "contain", "fill", "none", "scale-down"])}
      </section>
      <section class="inspector-section"><h3>Theme</h3>
        ${this._field("Font family", "appearance.fontFamily", this._config.appearance.fontFamily)}
        ${this._field("Text color", "appearance.fontColor", this._config.appearance.fontColor, "color")}
        ${this._field("Accent color", "appearance.accentColor", this._config.appearance.accentColor, "color")}
        ${this._field("Text shadow", "appearance.textShadow", this._config.appearance.textShadow)}
        ${this._field("Information rail", "appearance.railColor", this._config.appearance.railColor)}
        ${this._field("Readability scrim", "appearance.scrimColor", this._config.appearance.scrimColor)}
        ${this._field("Scale", "appearance.scale", this._config.appearance.scale, "number", "0.5", "2", "0.05")}
      </section>
      <section class="inspector-section"><h3>Layout</h3>
        <div class="field"><label>Layout format</label><select data-layout>${["vertical-2-1", "vertical-1-2", "horizontal-2-1", "horizontal-1-2", "3x3"].map((format) => `<option value="${format}" ${format === this._config.layout.format ? "selected" : ""}>${escapeHtml(humanize(format))}</option>`).join("")}</select></div>
      </section>
      <section class="inspector-section"><h3>Spacing</h3>
        ${this._field("Padding", "layout.spacing.padding", this._config.layout.spacing.padding, "number", "0", "100", "1")}
        ${this._field("Zone gap", "layout.spacing.zoneGap", this._config.layout.spacing.zoneGap, "number", "0", "100", "1")}
        ${this._field("Widget gap", "layout.spacing.widgetGap", this._config.layout.spacing.widgetGap, "number", "0", "100", "1")}
      </section>`;
  }

  private _renderWidgetInspector(widget: WidgetConfig, zone: ZoneName, index: number): string {
    let data = "";
    let display = "";
    let actions = "";
    switch (widget.type) {
      case "clock":
        display = `${this._check("12-hour time", "hour12", widget.hour12 !== false, widget.id)}${this._check("Show seconds", "showSeconds", Boolean(widget.showSeconds), widget.id)}${this._typographyFields(widget, 144, 300)}`;
        break;
      case "date":
        display = `${this._selectWidgetField("Date format", "format", String(widget.format || "full"), ["full", "short", "numeric"], widget.id)}${this._typographyFields(widget, 32, 400)}`;
        break;
      case "current-weather":
        data = this._entityField("Weather entity", widget.entity || "", widget.id, "weather");
        display = this._check("Animate current conditions", "animation", widget.animation !== false, widget.id);
        break;
      case "forecast":
        data = `${this._entityField("Forecast entity", widget.entity || "", widget.id, "weather")}${this._selectWidgetField("Forecast type", "forecastType", String(widget.forecastType || "daily"), ["daily", "hourly", "twice_daily"], widget.id)}`;
        display = this._field("Rows", "widget.days", widget.days || 3, "number", "1", "10", "1", widget.id);
        break;
      case "agenda":
      case "month-calendar":
        data = this._renderCalendarSources(widget);
        if (widget.type === "agenda") display = this._field("Maximum events", "widget.maxItems", widget.maxItems || 3, "number", "1", "20", "1", widget.id);
        break;
      case "entity":
        data = `${this._entityField("Entity", widget.entity || "", widget.id)}${this._field("Attribute (optional)", "widget.attribute", widget.attribute || "", "text", "", "", "", widget.id)}`;
        break;
      case "alerts":
        data = `<div class="field"><label>Conditions (JSON)</label><textarea data-widget-json="conditions" data-widget-id="${escapeHtml(widget.id)}">${escapeHtml(JSON.stringify(widget.conditions || [], null, 2))}</textarea></div>`;
        break;
      case "action-bar":
        actions = this._renderActions(widget);
        break;
      case "ha-card":
        data = `<div class="field"><label>Home Assistant card config (JSON)</label><textarea data-widget-json="card" data-widget-id="${escapeHtml(widget.id)}">${escapeHtml(JSON.stringify(widget.card || {}, null, 2))}</textarea></div>`;
        break;
      case "transportation":
        data = `${this._entityField("Departures entity", widget.entity || "", widget.id)}${this._field("Rows attribute", "widget.rowsAttribute", widget.rowsAttribute || "departures", "text", "", "", "", widget.id)}${this._field("Name field", "widget.fields.name", widget.fields?.name || "name", "text", "", "", "", widget.id)}${this._field("Time field", "widget.fields.time", widget.fields?.time || "time", "text", "", "", "", widget.id)}`;
        display = this._field("Maximum rows", "widget.maxItems", widget.maxItems || 4, "number", "1", "20", "1", widget.id);
        break;
      default:
        display = `<div class="help">This widget has no additional display settings.</div>`;
    }
    const widgets = this._config.layout.zones[zone]?.widgets || [];
    const label = widget.title || humanize(widget.type);
    return `<section class="inspector-section"><h3>Basics</h3>${this._field("Widget title", "widget.title", widget.title || "", "text", "", "", "", widget.id)}</section>
      <section class="inspector-section"><h3>Position</h3><div class="field"><label>Zone</label><select data-widget-zone="${escapeHtml(widget.id)}">${activeZones(this._config.layout.format).map((name) => `<option value="${name}" ${name === zone ? "selected" : ""}>${escapeHtml(humanize(name))}</option>`).join("")}</select></div><div class="position-actions"><button class="secondary" data-command="move-up" data-widget-id="${escapeHtml(widget.id)}" ${index === 0 ? "disabled" : ""}>Move earlier</button><button class="secondary" data-command="move-down" data-widget-id="${escapeHtml(widget.id)}" ${index === widgets.length - 1 ? "disabled" : ""}>Move later</button></div></section>
      ${data ? `<section class="inspector-section"><h3>Data</h3>${data}</section>` : ""}
      ${display ? `<section class="inspector-section"><h3>Display</h3>${display}</section>` : ""}
      ${actions ? `<section class="inspector-section"><h3>Actions</h3>${actions}</section>` : ""}
      <section class="inspector-section"><h3>Delete</h3><div class="danger-zone"><button class="danger" data-command="delete-widget" data-widget-id="${escapeHtml(widget.id)}" aria-label="Delete ${escapeHtml(label)}">Delete widget</button></div></section>`;
  }

  private _renderCalendarSources(widget: WidgetConfig): string {
    const calendars = widget.calendars || [];
    return `${calendars.map((calendar, index) => `<div class="group"><div class="group-head"><span>${escapeHtml(calendar.name || humanize(calendar.entity || `Calendar ${index + 1}`))}</span><button data-command="delete-calendar" data-widget-id="${escapeHtml(widget.id)}" data-index="${index}">Remove</button></div>${this._entityField("Calendar entity", calendar.entity, widget.id, "calendar", index)}${this._field("Name", `calendar.name`, calendar.name || "", "text", "", "", "", widget.id, index)}${this._field("Color", `calendar.color`, calendar.color || "#64b5f6", "color", "", "", "", widget.id, index)}</div>`).join("")}<button class="secondary" data-command="add-calendar" data-widget-id="${escapeHtml(widget.id)}">Add calendar</button>`;
  }

  private _renderActions(widget: WidgetConfig): string {
    const actions = widget.actions || [];
    return `${actions.map((action, index) => `<div class="group"><div class="group-head"><span>${escapeHtml(action.label || `Action ${index + 1}`)}</span><button data-command="delete-action" data-widget-id="${escapeHtml(widget.id)}" data-index="${index}">Remove</button></div>${this._selectActionField("Action", "action", action.action, ["none", "assist", "navigate", "url", "more-info", "toggle", "perform-action"], widget.id, index)}${this._field("Label", "action.label", action.label || "", "text", "", "", "", widget.id, index)}${this._field("Icon", "action.icon", action.icon || "circle", "text", "", "", "", widget.id, index)}${["more-info", "toggle"].includes(action.action) ? this._entityField("Entity", action.entity || "", widget.id, undefined, index, true) : ""}${action.action === "navigate" ? this._field("Navigation path", "action.navigation_path", action.navigation_path || "", "text", "", "", "", widget.id, index) : ""}${action.action === "url" ? this._field("URL", "action.url_path", action.url_path || "", "text", "", "", "", widget.id, index) : ""}${action.action === "perform-action" ? this._field("Service (domain.service)", "action.perform_action", action.perform_action || "", "text", "", "", "", widget.id, index) : ""}</div>`).join("")}<button class="secondary" data-command="add-action" data-widget-id="${escapeHtml(widget.id)}">Add action</button>`;
  }

  private _field(label: string, path: string, value: unknown, type = "text", min = "", max = "", step = "", widgetId = "", index?: number): string {
    if (type === "entity") return this._entityField(label, String(value || ""), widgetId);
    return `<div class="field"><label>${escapeHtml(label)}</label><input type="${type}" value="${escapeHtml(value)}" data-path="${escapeHtml(path)}" ${widgetId ? `data-widget-id="${escapeHtml(widgetId)}"` : ""} ${index == null ? "" : `data-index="${index}"`} ${min ? `min="${min}"` : ""} ${max ? `max="${max}"` : ""} ${step ? `step="${step}"` : ""}/></div>`;
  }

  private _textAreaField(label: string, path: string, value: string, lines = false): string {
    return `<div class="field"><label>${escapeHtml(label)}</label><textarea data-path="${escapeHtml(path)}" ${lines ? "data-lines" : ""}>${escapeHtml(value)}</textarea></div>`;
  }

  private _selectField(label: string, path: string, value: string, options: string[]): string {
    return `<div class="field"><label>${escapeHtml(label)}</label><select data-path="${escapeHtml(path)}">${options.map((option) => `<option value="${option}" ${option === value ? "selected" : ""}>${escapeHtml(humanize(option))}</option>`).join("")}</select></div>`;
  }

  private _selectWidgetField(label: string, field: string, value: string, options: string[], widgetId: string): string {
    return `<div class="field"><label>${escapeHtml(label)}</label><select data-widget-field="${escapeHtml(field)}" data-widget-id="${escapeHtml(widgetId)}">${options.map((option) => `<option value="${option}" ${option === value ? "selected" : ""}>${escapeHtml(humanize(option))}</option>`).join("")}</select></div>`;
  }

  private _labeledWidgetSelect(label: string, field: string, value: string, options: Array<{ value: string; label: string }>, widgetId: string, numeric = false): string {
    return `<div class="field"><label>${escapeHtml(label)}</label><select data-widget-field="${escapeHtml(field)}" data-widget-id="${escapeHtml(widgetId)}" ${numeric ? "data-widget-number" : ""}>${options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></div>`;
  }

  private _typographyFields(widget: WidgetConfig, defaultSize: number, defaultWeight: number): string {
    const size = this._fontSizeNumber(widget.fontSize, defaultSize);
    const sizes = FONT_SIZES.includes(size) ? FONT_SIZES : [...FONT_SIZES, size].sort((left, right) => left - right);
    return `${this._labeledWidgetSelect("Font size", "fontSize", String(size), sizes.map((option) => ({ value: String(option), label: String(option) })), widget.id)}
      ${this._labeledWidgetSelect("Weight", "fontWeight", String(widget.fontWeight || defaultWeight), FONT_WEIGHTS, widget.id, true)}
      ${this._labeledWidgetSelect("Style", "fontStyle", widget.fontStyle || "normal", FONT_STYLES, widget.id)}
      ${this._labeledWidgetSelect("Alignment", "textAlign", widget.textAlign || "center", TEXT_ALIGNMENTS, widget.id)}`;
  }

  private _fontSizeNumber(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const match = value.trim().match(/^(\d+(?:\.\d+)?)(px|rem)?$/i);
    if (!match) return fallback;
    const number = Number(match[1]) * (match[2]?.toLowerCase() === "rem" ? 16 : 1);
    return Math.max(8, Math.min(320, Math.round(number)));
  }

  private _selectActionField(label: string, field: string, value: string, options: string[], widgetId: string, index: number): string {
    return `<div class="field"><label>${escapeHtml(label)}</label><select data-action-field="${escapeHtml(field)}" data-widget-id="${escapeHtml(widgetId)}" data-index="${index}">${options.map((option) => `<option value="${option}" ${option === value ? "selected" : ""}>${escapeHtml(humanize(option))}</option>`).join("")}</select></div>`;
  }

  private _entityField(label: string, value: string, widgetId: string, domain?: string, index?: number, action = false): string {
    return `<div class="field"><label>${escapeHtml(label)}</label><ha-entity-picker data-entity-picker data-widget-id="${escapeHtml(widgetId)}" data-value="${escapeHtml(value)}" ${domain ? `data-domain="${escapeHtml(domain)}"` : ""} ${index == null ? "" : `data-index="${index}"`} ${action ? "data-action-entity" : ""}></ha-entity-picker></div>`;
  }

  private _check(label: string, field: string, checked: boolean, widgetId: string): string {
    return `<label class="check"><input type="checkbox" data-widget-field="${escapeHtml(field)}" data-widget-id="${escapeHtml(widgetId)}" ${checked ? "checked" : ""}/> ${escapeHtml(label)}</label>`;
  }

  private _hydrateEntityPickers(): void {
    if (!this.shadowRoot || !this._hass) return;
    for (const picker of Array.from(this.shadowRoot.querySelectorAll<HTMLElement & { hass?: HomeAssistantLike; value?: string; includeDomains?: string[] }>("[data-entity-picker]"))) {
      picker.hass = this._hass;
      picker.value = picker.dataset.value || "";
      if (picker.dataset.domain) picker.includeDomains = [picker.dataset.domain];
      picker.addEventListener("value-changed", (event: Event) => {
        const value = (event as CustomEvent<{ value?: string }>).detail?.value || "";
        const found = this._findWidget(picker.dataset.widgetId || "");
        if (!found) return;
        const index = picker.dataset.index == null ? undefined : Number(picker.dataset.index);
        if (picker.hasAttribute("data-action-entity") && index != null) {
          if (found.widget.actions?.[index]) found.widget.actions[index].entity = value;
        } else if (index != null && found.widget.calendars?.[index]) {
          found.widget.calendars[index].entity = value;
        } else {
          found.widget.entity = value;
        }
        this._changed(false);
      }, { once: true });
    }
  }

  private _syncPreview(): void {
    if (!this.shadowRoot || this._canvasMode !== "preview") return;
    const preview = this.shadowRoot.querySelector<HTMLElement & { setConfig?(config: unknown): void; hass?: HomeAssistantLike }>(".preview-card");
    if (!preview?.setConfig) return;
    const stage = this.shadowRoot.querySelector<HTMLElement>(".preview-stage");
    const surface = this.shadowRoot.querySelector<HTMLElement>(".preview-surface");
    if (stage && surface) {
      const scale = Math.min(stage.clientWidth / 1280, stage.clientHeight / 800);
      surface.style.transform = `scale(${scale || 1})`;
    }
    const config = deepClone(this._config);
    for (const zone of Object.values(config.layout.zones)) {
      for (const widget of zone?.widgets || []) {
        if (widget.actions) widget.actions = widget.actions.map((action) => ({ ...action, action: "none" }));
        if (widget.tap_action) widget.tap_action = { ...widget.tap_action, action: "none" };
      }
    }
    preview.setConfig(config);
    if (this._hass) preview.hass = this._hass;
  }

  private _click(event: Event): void {
    const target = (event.target as Element | null)?.closest<HTMLElement>("[data-command],[data-palette-type]");
    if (!target) return;
    if (target.dataset.paletteType) return;
    const command = target.dataset.command;
    const widgetId = target.dataset.widgetId || "";
    if (command === "open") { this._open = true; this._canvasMode = "design"; this._drawerMode = "closed"; this._render(); }
    if (command === "close") { this._open = false; this._render(); }
    if (command === "close-drawer") { this._drawerMode = "closed"; this._render(); }
    if (command === "dashboard-settings") { this._drawerMode = this._drawerMode === "dashboard" ? "closed" : "dashboard"; this._render(); }
    if (command === "edit-widget" || command === "select-widget") { this._selectedWidget = widgetId; this._drawerMode = "widget"; this._render(); }
    if (command === "canvas-design") { this._canvasMode = "design"; this._render(); }
    if (command === "canvas-preview") { this._canvasMode = "preview"; this._render(); }
    if (command === "classic") this._applyClassic();
    if (command === "move-up") this._reorder(widgetId, -1);
    if (command === "move-down") this._reorder(widgetId, 1);
    if (command === "delete-widget") this._deleteWidget(widgetId);
    if (command === "undo-delete") this._undoDelete();
    if (command === "add-calendar") this._addCalendar(widgetId);
    if (command === "delete-calendar") this._deleteIndexed(widgetId, "calendars", Number(target.dataset.index));
    if (command === "add-action") this._addAction(widgetId);
    if (command === "delete-action") this._deleteIndexed(widgetId, "actions", Number(target.dataset.index));
  }

  private _change(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (target.hasAttribute("data-layout")) {
      this._changeLayout(target.value as HearthPaneConfig["layout"]["format"]);
      return;
    }
    if (target.dataset.widgetZone) {
      this._moveWidget(target.dataset.widgetZone, target.value as ZoneName);
      return;
    }
    if (target.dataset.widgetField) {
      const found = this._findWidget(target.dataset.widgetId || "");
      if (!found) return;
      const field = target.dataset.widgetField;
      const value = target.type === "checkbox"
        ? (target as HTMLInputElement).checked
        : field === "fontSize"
          ? `${target.value}px`
          : target.hasAttribute("data-widget-number")
            ? Number(target.value)
            : this._coerce(target);
      found.widget[field] = value;
      this._changed(true);
      return;
    }
    if (target.dataset.actionField) {
      const found = this._findWidget(target.dataset.widgetId || "");
      const action = found?.widget.actions?.[Number(target.dataset.index)];
      if (action) {
        (action as unknown as Record<string, unknown>)[target.dataset.actionField] = target.value;
        this._changed(true);
      }
      return;
    }
    if (target.dataset.path) {
      this._setPath(target.dataset.path, this._coerce(target), target.dataset.widgetId, target.dataset.index);
      this._changed(target.dataset.path === "background.source");
    }
  }

  private _input(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (target.dataset.widgetJson) {
      try {
        const found = this._findWidget(target.dataset.widgetId || "");
        if (found) {
          found.widget[target.dataset.widgetJson] = JSON.parse(target.value);
          target.setCustomValidity("");
          this._changed(false);
        }
      } catch {
        target.setCustomValidity("Enter valid JSON");
      }
      return;
    }
    if (target.dataset.path && target.type !== "color") {
      const value = target.hasAttribute("data-lines")
        ? target.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
        : this._coerce(target);
      this._setPath(target.dataset.path, value, target.dataset.widgetId, target.dataset.index);
      this._changed(false);
    }
  }

  private _setPath(path: string, value: unknown, widgetId?: string, rawIndex?: string): void {
    const parts = path.split(".");
    let root: Record<string, unknown>;
    if (parts[0] === "widget") {
      const found = this._findWidget(widgetId || "");
      if (!found) return;
      root = found.widget;
      parts.shift();
    } else if (parts[0] === "calendar") {
      const found = this._findWidget(widgetId || "");
      const calendar = found?.widget.calendars?.[Number(rawIndex)];
      if (!calendar) return;
      root = calendar as unknown as Record<string, unknown>;
      parts.shift();
    } else if (parts[0] === "action") {
      const found = this._findWidget(widgetId || "");
      const action = found?.widget.actions?.[Number(rawIndex)];
      if (!action) return;
      root = action as unknown as Record<string, unknown>;
      parts.shift();
    } else {
      root = this._config as unknown as Record<string, unknown>;
    }
    let cursor = root;
    for (const part of parts.slice(0, -1)) {
      if (!cursor[part] || typeof cursor[part] !== "object") cursor[part] = {};
      cursor = cursor[part] as Record<string, unknown>;
    }
    cursor[parts[parts.length - 1]] = value;
  }

  private _coerce(target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): unknown {
    if (target instanceof HTMLInputElement && target.type === "number") return Number(target.value);
    if (target instanceof HTMLInputElement && target.type === "checkbox") return target.checked;
    return target.value;
  }

  private _widgetLocations(): Array<{ zone: ZoneName; index: number; widget: WidgetConfig }> {
    const result: Array<{ zone: ZoneName; index: number; widget: WidgetConfig }> = [];
    for (const [zone, config] of Object.entries(this._config.layout.zones)) {
      config?.widgets.forEach((widget, index) => result.push({ zone: zone as ZoneName, index, widget }));
    }
    return result;
  }

  private _findWidget(id: string): { zone: ZoneName; index: number; widget: WidgetConfig } | undefined {
    return this._widgetLocations().find((item) => item.widget.id === id);
  }

  private _addWidget(type: WidgetType, zone?: ZoneName): void {
    const target = zone || activeZones(this._config.layout.format)[0];
    const id = `hp-${type}-${Date.now().toString(36)}`;
    const config = this._config.layout.zones[target] || { widgets: [] };
    config.widgets.push(widgetDefaults(type, id));
    this._config.layout.zones[target] = config;
    this._selectedWidget = id;
    this._drawerMode = "widget";
    this._changed(true);
  }

  private _deleteWidget(id: string): void {
    const found = this._findWidget(id);
    if (!found) return;
    window.clearTimeout(this._undoTimer);
    this._deletedWidget = {
      widget: deepClone(found.widget),
      zone: found.zone,
      index: found.index,
      selectedWidget: this._selectedWidget,
      drawerMode: this._drawerMode
    };
    this._config.layout.zones[found.zone]!.widgets.splice(found.index, 1);
    if (this._selectedWidget === id) {
      this._selectedWidget = "";
      this._drawerMode = "closed";
    }
    this._undoTimer = window.setTimeout(() => {
      this._deletedWidget = undefined;
      this.shadowRoot?.querySelector(".undo-banner")?.remove();
    }, 6000);
    this._changed(true);
  }

  private _undoDelete(): void {
    const deleted = this._deletedWidget;
    if (!deleted) return;
    window.clearTimeout(this._undoTimer);
    const zone = this._config.layout.zones[deleted.zone] || { widgets: [] };
    zone.widgets.splice(Math.min(deleted.index, zone.widgets.length), 0, deepClone(deleted.widget));
    this._config.layout.zones[deleted.zone] = zone;
    this._selectedWidget = deleted.selectedWidget || deleted.widget.id;
    this._drawerMode = deleted.drawerMode === "widget" ? "widget" : deleted.drawerMode;
    this._deletedWidget = undefined;
    this._changed(true);
  }

  private _reorder(id: string, offset: number): void {
    const found = this._findWidget(id);
    if (!found) return;
    const widgets = this._config.layout.zones[found.zone]!.widgets;
    const next = Math.max(0, Math.min(widgets.length - 1, found.index + offset));
    if (next === found.index) return;
    const [widget] = widgets.splice(found.index, 1);
    widgets.splice(next, 0, widget);
    this._changed(true);
  }

  private _moveWidget(id: string, zone: ZoneName): void {
    const found = this._findWidget(id);
    if (!found || found.zone === zone) return;
    const [widget] = this._config.layout.zones[found.zone]!.widgets.splice(found.index, 1);
    const target = this._config.layout.zones[zone] || { widgets: [] };
    target.widgets.push(widget);
    this._config.layout.zones[zone] = target;
    this._changed(true);
  }

  private _addCalendar(id: string): void {
    const found = this._findWidget(id);
    if (!found) return;
    const calendars = found.widget.calendars || [];
    calendars.push({ entity: "", name: `Calendar ${calendars.length + 1}`, color: "#64b5f6" });
    found.widget.calendars = calendars;
    this._changed(true);
  }

  private _addAction(id: string): void {
    const found = this._findWidget(id);
    if (!found) return;
    const actions = found.widget.actions || [];
    actions.push({ action: "none", label: `Action ${actions.length + 1}`, icon: "circle" });
    found.widget.actions = actions;
    this._changed(true);
  }

  private _deleteIndexed(id: string, field: "calendars" | "actions", index: number): void {
    const found = this._findWidget(id);
    const list = found?.widget[field] as CalendarSource[] | HearthPaneAction[] | undefined;
    if (!list) return;
    list.splice(index, 1);
    this._changed(true);
  }

  private _changeLayout(format: HearthPaneConfig["layout"]["format"]): void {
    if (format === this._config.layout.format) return;
    const oldActive = new Set(activeZones(this._config.layout.format));
    const newActive = activeZones(format);
    const displaced = this._widgetLocations().filter((item) => oldActive.has(item.zone) && !newActive.includes(item.zone));
    if (displaced.length && !window.confirm(`Changing the layout will move ${displaced.length} widget${displaced.length === 1 ? "" : "s"}. Continue?`)) {
      this._render();
      return;
    }
    for (const item of displaced) {
      const [widget] = this._config.layout.zones[item.zone]!.widgets.splice(this._config.layout.zones[item.zone]!.widgets.indexOf(item.widget), 1);
      const fallback = newActive[0];
      const target = this._config.layout.zones[fallback] || { widgets: [] };
      target.widgets.push(widget);
      this._config.layout.zones[fallback] = target;
    }
    for (const zone of newActive) if (!this._config.layout.zones[zone]) this._config.layout.zones[zone] = { widgets: [] };
    this._config.layout.format = format;
    this._changed(true);
  }

  private _applyClassic(): void {
    if (this._widgetLocations().length && !window.confirm("Replace the current arrangement with the HearthPane Classic preset?")) return;
    this._config = classicPreset();
    this._selectedWidget = "classic-clock";
    this._drawerMode = "widget";
    this._canvasMode = "design";
    this._changed(true);
  }

  private _pointerDown(event: PointerEvent): void {
    const target = (event.target as Element | null)?.closest<HTMLElement>("[data-drag-widget],[data-palette-type]");
    if (!target) return;
    this._drag = target.dataset.dragWidget ? { widgetId: target.dataset.dragWidget } : { paletteType: target.dataset.paletteType as WidgetType };
    document.addEventListener("pointermove", this._boundPointerMove);
    document.addEventListener("pointerup", this._boundPointerUp, { once: true });
    event.preventDefault();
  }

  private _pointerMove(event: PointerEvent): void {
    if (!this._drag || !this.shadowRoot) return;
    let over: ZoneName | undefined;
    for (const zone of Array.from(this.shadowRoot.querySelectorAll<HTMLElement>("[data-drop-zone]"))) {
      const rect = zone.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      zone.classList.toggle("is-over", inside);
      if (inside) over = zone.dataset.dropZone as ZoneName;
    }
    this._drag.over = over;
  }

  private _pointerUp(): void {
    document.removeEventListener("pointermove", this._boundPointerMove);
    if (!this._drag) return;
    const { widgetId, paletteType, over } = this._drag;
    this._drag = undefined;
    if (over && widgetId) this._moveWidget(widgetId, over);
    else if (paletteType) this._addWidget(paletteType, over);
    else this._render();
  }

  private _changed(render: boolean): void {
    window.clearTimeout(this._emitTimer);
    this._emitTimer = window.setTimeout(() => {
      this.dispatchEvent(new CustomEvent("config-changed", { bubbles: true, composed: true, detail: { config: deepClone(this._config) } }));
    }, 180);
    if (render) this._render();
    else this._syncPreview();
  }
}
