import type { LayoutDefinition, LayoutFormat, ZoneName } from "./types";

const zones: ZoneName[] = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right"
];

const baseAreas: Record<ZoneName, string> = {
  "top-left": "1 / 1 / 2 / 2",
  "top-center": "1 / 2 / 2 / 3",
  "top-right": "1 / 3 / 2 / 4",
  "middle-left": "2 / 1 / 3 / 2",
  "middle-center": "2 / 2 / 3 / 3",
  "middle-right": "2 / 3 / 3 / 4",
  "bottom-left": "3 / 1 / 4 / 2",
  "bottom-center": "3 / 2 / 4 / 3",
  "bottom-right": "3 / 3 / 4 / 4"
};

export function layoutDefinition(format: LayoutFormat): LayoutDefinition {
  if (format === "vertical-2-1") {
    return {
      columns: "2fr 1fr",
      rows: "1fr 1fr 1fr",
      zoneAreas: {
        ...baseAreas,
        "top-left": "1 / 1 / 2 / 2",
        "middle-left": "2 / 1 / 3 / 2",
        "bottom-left": "3 / 1 / 4 / 2",
        "top-right": "1 / 2 / 2 / 3",
        "middle-right": "2 / 2 / 3 / 3",
        "bottom-right": "3 / 2 / 4 / 3",
        "top-center": "1 / 1 / 2 / 2",
        "middle-center": "2 / 1 / 3 / 2",
        "bottom-center": "3 / 1 / 4 / 2"
      },
      railZones: ["top-right", "middle-right", "bottom-right"]
    };
  }

  if (format === "vertical-1-2") {
    return {
      columns: "1fr 2fr",
      rows: "1fr 1fr 1fr",
      zoneAreas: {
        ...baseAreas,
        "top-left": "1 / 1 / 2 / 2",
        "middle-left": "2 / 1 / 3 / 2",
        "bottom-left": "3 / 1 / 4 / 2",
        "top-right": "1 / 2 / 2 / 3",
        "middle-right": "2 / 2 / 3 / 3",
        "bottom-right": "3 / 2 / 4 / 3",
        "top-center": "1 / 2 / 2 / 3",
        "middle-center": "2 / 2 / 3 / 3",
        "bottom-center": "3 / 2 / 4 / 3"
      },
      railZones: ["top-left", "middle-left", "bottom-left"]
    };
  }

  if (format === "horizontal-2-1" || format === "horizontal-1-2") {
    const topIsRail = format === "horizontal-1-2";
    return {
      columns: "1fr 1fr 1fr",
      rows: format === "horizontal-2-1" ? "2fr 1fr" : "1fr 2fr",
      zoneAreas: {
        ...baseAreas,
        "top-left": "1 / 1 / 2 / 2",
        "top-center": "1 / 2 / 2 / 3",
        "top-right": "1 / 3 / 2 / 4",
        "middle-left": "1 / 1 / 2 / 2",
        "middle-center": "1 / 2 / 2 / 3",
        "middle-right": "1 / 3 / 2 / 4",
        "bottom-left": "2 / 1 / 3 / 2",
        "bottom-center": "2 / 2 / 3 / 3",
        "bottom-right": "2 / 3 / 3 / 4"
      },
      railZones: topIsRail
        ? ["top-left", "top-center", "top-right"]
        : ["bottom-left", "bottom-center", "bottom-right"]
    };
  }

  return {
    columns: "1fr 1fr 1fr",
    rows: "1fr 1fr 1fr",
    zoneAreas: baseAreas,
    railZones: []
  };
}

export function activeZones(format: LayoutFormat): ZoneName[] {
  if (format.startsWith("vertical")) {
    return ["top-left", "middle-left", "bottom-left", "top-right", "middle-right", "bottom-right"];
  }
  if (format.startsWith("horizontal")) {
    return ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"];
  }
  return zones.slice();
}

export const ALL_ZONES = zones;
