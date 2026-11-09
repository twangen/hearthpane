import type { HearthPaneAction, HomeAssistantLike } from "./types";

export interface ActionEnvironment {
  pushState(path: string): void;
  dispatchLocationChanged(): void;
  openUrl(url: string): void;
}

function browserEnvironment(): ActionEnvironment {
  return {
    pushState(path) {
      history.pushState(null, "", path);
    },
    dispatchLocationChanged() {
      window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
    },
    openUrl(url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
}

export async function performHearthPaneAction(
  host: EventTarget,
  hass: HomeAssistantLike,
  action: HearthPaneAction,
  environment: ActionEnvironment = browserEnvironment()
): Promise<void> {
  if (action.action === "none") return;
  if (action.action === "assist") {
    host.dispatchEvent(new CustomEvent("hass-action", {
      bubbles: true,
      composed: true,
      detail: { action: "tap", config: { tap_action: action } }
    }));
    return;
  }
  if (action.action === "navigate" && action.navigation_path) {
    environment.pushState(action.navigation_path);
    environment.dispatchLocationChanged();
    return;
  }
  if (action.action === "url" && action.url_path) {
    environment.openUrl(action.url_path);
    return;
  }
  if (action.action === "more-info" && action.entity) {
    host.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId: action.entity }
    }));
    return;
  }
  if (action.action === "toggle" && action.entity) {
    const domain = action.entity.split(".")[0];
    await hass.callService?.(domain, "toggle", { entity_id: action.entity });
    return;
  }
  if (action.action === "perform-action" && action.perform_action) {
    const [domain, service] = action.perform_action.split(".", 2);
    if (domain && service) await hass.callService?.(domain, service, action.data || {}, action.target || {});
  }
}
