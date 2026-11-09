const svgOpen = (condition: string, animated: boolean, label: string) =>
  `<svg class="hp-weather-icon hp-weather-${condition} ${animated ? "is-animated" : ""}" viewBox="0 0 96 96" role="img" aria-label="${label}">`;

const sun = `
  <g class="hp-sun">
    <g class="hp-rays" fill="none" stroke="var(--hp-sun, #ffc83d)" stroke-width="4" stroke-linecap="round">
      <path d="M48 6v10M48 80v10M6 48h10M80 48h10M18.3 18.3l7.1 7.1M70.6 70.6l7.1 7.1M77.7 18.3l-7.1 7.1M25.4 70.6l-7.1 7.1"/>
    </g>
    <circle cx="48" cy="48" r="18" fill="var(--hp-sun, #ffc83d)"/>
    <circle cx="42" cy="42" r="8" fill="rgba(255,255,255,.23)"/>
  </g>`;

const moon = `
  <g class="hp-moon">
    <path d="M63 16c-17 4-27 21-22 37 5 17 22 27 38 22-7 10-18 16-31 15-22-2-38-21-36-43 2-20 18-35 38-36 5 0 9 2 13 5Z" fill="var(--hp-moon, #dce8ff)"/>
    <circle class="hp-star hp-star-a" cx="70" cy="22" r="3" fill="#fff"/>
    <circle class="hp-star hp-star-b" cx="80" cy="37" r="2" fill="#fff"/>
  </g>`;

const cloud = `
  <g class="hp-cloud">
    <path d="M27 70h42c10 0 18-8 18-18s-8-18-18-18c-2 0-4 0-6 1-4-11-14-18-26-18-15 0-27 12-28 27C2 46-2 52 0 59c2 7 9 11 17 11h10Z" fill="var(--hp-cloud, #eef4fb)"/>
    <path d="M8 59c2 6 8 9 15 9h45c8 0 14-5 16-12-8 5-20 7-36 7-17 0-30-2-40-4Z" fill="var(--hp-cloud-shade, #b8c7d8)" opacity=".72"/>
  </g>`;

const smallCloud = `
  <g class="hp-cloud hp-cloud-small" transform="translate(25 29) scale(.72)">
    <path d="M27 70h42c10 0 18-8 18-18s-8-18-18-18c-2 0-4 0-6 1-4-11-14-18-26-18-15 0-27 12-28 27C2 46-2 52 0 59c2 7 9 11 17 11h10Z" fill="var(--hp-cloud, #eef4fb)"/>
    <path d="M8 59c2 6 8 9 15 9h45c8 0 14-5 16-12-8 5-20 7-36 7-17 0-30-2-40-4Z" fill="var(--hp-cloud-shade, #b8c7d8)" opacity=".72"/>
  </g>`;

const rain = (heavy = false) => `
  <g class="hp-rain" fill="none" stroke="var(--hp-rain, #56b7ff)" stroke-width="5" stroke-linecap="round">
    <path d="M25 72l-5 ${heavy ? 14 : 11}"/><path d="M47 72l-5 ${heavy ? 17 : 12}"/><path d="M69 72l-5 ${heavy ? 14 : 11}"/>
    ${heavy ? '<path d="M36 72l-5 14"/><path d="M58 72l-5 16"/><path d="M80 70l-5 13"/>' : ""}
  </g>`;

const snow = `
  <g class="hp-snow" fill="none" stroke="var(--hp-snow, #d9f2ff)" stroke-width="3" stroke-linecap="round">
    <path d="M20 74v16M12 82h16M14 76l12 12M26 76L14 88"/>
    <path d="M48 70v18M39 79h18M41 72l14 14M55 72L41 86"/>
    <path d="M76 74v16M68 82h16M70 76l12 12M82 76L70 88"/>
  </g>`;

const lightning = `
  <g class="hp-lightning">
    <path d="M54 62H40L31 84h14l-3 12 24-28H51l3-6Z" fill="var(--hp-lightning, #ffd43b)" stroke="#f4a900" stroke-width="1.5" stroke-linejoin="round"/>
  </g>`;

const fog = `
  <g class="hp-fog" fill="none" stroke="var(--hp-fog, #d5dee8)" stroke-width="4" stroke-linecap="round">
    <path d="M14 65h60"/><path d="M24 77h58"/><path d="M10 89h55"/>
  </g>`;

const wind = `
  <g class="hp-wind" fill="none" stroke="var(--hp-wind, #dce8f4)" stroke-width="4" stroke-linecap="round">
    <path d="M9 34h50c12 0 12-18 1-18-6 0-9 4-9 8"/>
    <path d="M8 50h67c15 0 15 22 2 22-7 0-11-5-11-10"/>
    <path d="M14 66h34"/>
  </g>`;

function normalizeCondition(condition: string): string {
  const value = condition.toLowerCase().replace(/_/g, "-");
  const aliases: Record<string, string> = {
    "clear-night": "clear-night",
    partlycloudy: "partly-cloudy",
    rainy: "rain",
    pouring: "pouring",
    snowy: "snow",
    "snowy-rainy": "snow-rain",
    "lightning-rainy": "lightning-rain",
    windy: "wind",
    "windy-variant": "wind"
  };
  return aliases[value] || value;
}

export function weatherLabel(condition: string): string {
  return normalizeCondition(condition)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function weatherIcon(condition = "exceptional", animated = true): string {
  const normalized = normalizeCondition(condition);
  const label = weatherLabel(normalized);
  let artwork = "";

  switch (normalized) {
    case "sunny": artwork = sun; break;
    case "clear-night": artwork = moon; break;
    case "partly-cloudy": artwork = `<g transform="translate(-12 -10) scale(.8)">${sun}</g>${smallCloud}`; break;
    case "cloudy": artwork = cloud; break;
    case "fog": artwork = `<g transform="translate(5 -16) scale(.9)">${cloud}</g>${fog}`; break;
    case "rain": artwork = `<g transform="translate(5 -13) scale(.9)">${cloud}</g>${rain()}`; break;
    case "pouring": artwork = `<g transform="translate(5 -15) scale(.9)">${cloud}</g>${rain(true)}`; break;
    case "hail": artwork = `<g transform="translate(5 -15) scale(.9)">${cloud}</g><g class="hp-hail" fill="#d8f2ff"><circle cx="25" cy="79" r="4"/><circle cx="48" cy="84" r="4"/><circle cx="72" cy="78" r="4"/></g>`; break;
    case "lightning": artwork = `<g transform="translate(5 -17) scale(.9)">${cloud}</g>${lightning}`; break;
    case "lightning-rain": artwork = `<g transform="translate(5 -17) scale(.9)">${cloud}</g>${rain()}${lightning}`; break;
    case "snow": artwork = `<g transform="translate(5 -16) scale(.9)">${cloud}</g>${snow}`; break;
    case "snow-rain": artwork = `<g transform="translate(5 -17) scale(.9)">${cloud}</g><g transform="translate(-9 0)">${rain()}</g><g transform="translate(39 0) scale(.65)">${snow}</g>`; break;
    case "wind": artwork = wind; break;
    default:
      artwork = `<circle cx="48" cy="48" r="34" fill="none" stroke="var(--hp-exceptional, #ffb74d)" stroke-width="6"/><path d="M48 26v29" stroke="var(--hp-exceptional, #ffb74d)" stroke-width="7" stroke-linecap="round"/><circle cx="48" cy="70" r="4" fill="var(--hp-exceptional, #ffb74d)"/>`;
  }

  return `${svgOpen(normalized, animated, label)}${artwork}</svg>`;
}

export function actionIcon(name = "circle"): string {
  const common = `viewBox="0 0 24 24" aria-hidden="true" focusable="false"`;
  const icons: Record<string, string> = {
    microphone: `<svg ${common}><path fill="currentColor" d="M12 15a4 4 0 0 0 4-4V5a4 4 0 1 0-8 0v6a4 4 0 0 0 4 4Zm-6-4a1 1 0 1 0-2 0 8 8 0 0 0 7 7.94V22H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-3.06A8 8 0 0 0 20 11a1 1 0 1 0-2 0 6 6 0 1 1-12 0Z"/></svg>`,
    home: `<svg ${common}><path fill="currentColor" d="m3 11 9-8 9 8v10h-6v-6H9v6H3V11Zm2 1v7h2v-6h10v6h2v-7l-7-6.22L5 12Z"/></svg>`,
    alert: `<svg ${common}><path fill="currentColor" d="M12 2 1 21h22L12 2Zm0 5 7.5 12h-15L12 7Zm-1 3v5h2v-5h-2Zm0 7v2h2v-2h-2Z"/></svg>`,
    calendar: `<svg ${common}><path fill="currentColor" d="M7 2v2H5a2 2 0 0 0-2 2v15h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7ZM5 9h14v10H5V9Zm2 2v2h2v-2H7Zm4 0v2h2v-2h-2Zm4 0v2h2v-2h-2Z"/></svg>`,
    train: `<svg ${common}><path fill="currentColor" d="M7 2h10a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4l2 3h-3l-2-3h-4l-2 3H5l2-3a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Zm0 3a1 1 0 0 0-1 1v5h12V6a1 1 0 0 0-1-1H7Zm1 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/></svg>`,
    circle: `<svg ${common}><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
  };
  return icons[name] || icons.circle;
}
