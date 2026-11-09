import { HearthPaneCard } from "./card";
import { HearthPaneCardEditor } from "./designer";

declare const __HEARTHPANE_VERSION__: string;

if (!customElements.get("hearthpane-card")) {
  customElements.define("hearthpane-card", HearthPaneCard);
}

if (!customElements.get("hearthpane-card-editor")) {
  customElements.define("hearthpane-card-editor", HearthPaneCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "hearthpane-card")) {
  window.customCards.push({
    type: "hearthpane-card",
    name: "HearthPane",
    description: "An independent ambient dashboard card with a visual widget designer.",
    preview: true,
    documentationURL: "https://github.com/twangen/hearthpane"
  });
}

console.info(`%c HearthPane %c v${__HEARTHPANE_VERSION__} `, "background:#172a38;color:#fff;padding:3px 6px;border-radius:4px 0 0 4px", "background:#64b5f6;color:#07131d;padding:3px 6px;border-radius:0 4px 4px 0");
