import { describe, expect, it } from "vitest";
import { weatherIcon } from "../../src/weather-icons";

const conditions = [
  "sunny",
  "clear-night",
  "partlycloudy",
  "cloudy",
  "fog",
  "rainy",
  "pouring",
  "hail",
  "lightning",
  "lightning-rainy",
  "snowy",
  "snowy-rainy",
  "windy",
  "exceptional"
];

describe("original inline weather artwork", () => {
  it.each(conditions)("renders %s without external assets", (condition) => {
    const icon = weatherIcon(condition, true);
    expect(icon).toContain("<svg");
    expect(icon).toContain("is-animated");
    expect(icon).not.toMatch(/https?:\/\//);
    expect(icon).not.toContain("<image");
  });

  it("can disable animation per widget", () => {
    expect(weatherIcon("sunny", false)).not.toContain("is-animated");
  });
});
