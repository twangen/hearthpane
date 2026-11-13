export const cardStyles = `
  :host {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    --hp-font: Roboto, system-ui, sans-serif;
    --hp-text: #fff;
    --hp-accent: #64b5f6;
    --hp-shadow: 0 2px 8px rgba(0,0,0,.8);
    --hp-rail: rgba(8,11,16,.64);
    --hp-glass: rgba(16,22,30,.58);
    --hp-scrim: rgba(0,0,0,.42);
    color: var(--hp-text);
  }
  * { box-sizing: border-box; }
  ha-card {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: min(100vh, 800px);
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: #08121a;
    color: var(--hp-text);
    font-family: var(--hp-font);
  }
  .hp-shell { position: absolute; inset: 0; overflow: hidden; background: #08121a; }
  .hp-background,
  .hp-background-next { position: absolute; inset: 0; z-index: 0; }
  .hp-background img,
  .hp-background-next img { width: 100%; height: 100%; display: block; object-fit: var(--hp-object-fit, cover); object-position: var(--hp-object-position, center center); }
  .hp-background-next { opacity: 0; transition: opacity var(--hp-bg-transition, 1.2s) ease; }
  .hp-background-next.is-visible { opacity: 1; }
  .hp-empty-background { width: 100%; height: 100%; background: radial-gradient(circle at 30% 24%, #244b61, transparent 40%), linear-gradient(145deg, #0b2332, #07131c 58%, #090d13); }
  .hp-scrim { position: absolute; inset: 0; z-index: 1; background: var(--hp-scrim); pointer-events: none; }
  .hp-rail { position: absolute; z-index: 2; background: var(--hp-rail); pointer-events: none; }
  .format-vertical-2-1 .hp-rail { top: 0; right: 0; bottom: 0; width: 33.333333%; }
  .format-vertical-1-2 .hp-rail { top: 0; left: 0; bottom: 0; width: 33.333333%; }
  .format-horizontal-2-1 .hp-rail { right: 0; bottom: 0; left: 0; height: 33.333333%; }
  .format-horizontal-1-2 .hp-rail { top: 0; right: 0; left: 0; height: 33.333333%; }
  .format-3x3 .hp-rail { display: none; }
  .hp-grid { position: absolute; inset: 0; z-index: 3; display: grid; transform: scale(var(--hp-scale)); transform-origin: center; width: calc(100% / var(--hp-scale)); height: calc(100% / var(--hp-scale)); left: calc((100% - (100% / var(--hp-scale))) / 2); top: calc((100% - (100% / var(--hp-scale))) / 2); }
  .hp-zone { display: flex; min-width: 0; min-height: 0; gap: var(--hp-widget-gap); overflow: visible; }
  .hp-zone.is-empty { pointer-events: none; }
  .hp-zone.is-glass { background: var(--hp-glass); border-radius: 18px; padding: 18px; }
  .hp-widget { min-width: 0; text-shadow: var(--hp-shadow); }
  .hp-widget-placeholder { padding: 12px 14px; border: 1px dashed rgba(255,255,255,.26); border-radius: 12px; color: rgba(255,255,255,.65); font-size: .88rem; text-align: center; }
  .hp-clock { display: flex; width: 100%; align-items: baseline; justify-content: var(--hp-clock-justify, center); white-space: nowrap; font-weight: var(--hp-clock-weight, 300); font-style: var(--hp-clock-style, normal); line-height: .86; letter-spacing: -.045em; }
  .hp-clock-time { font-size: var(--hp-clock-size, 9rem); }
  .hp-clock-period { margin-left: .18em; font-size: calc(var(--hp-clock-size, 9rem) * .235); letter-spacing: 0; font-weight: inherit; opacity: .92; text-transform: lowercase; }
  .hp-date { width: 100%; text-align: var(--hp-date-align, center); font-size: var(--hp-date-size, 2rem); font-weight: var(--hp-date-weight, 400); font-style: var(--hp-date-style, normal); line-height: 1.2; }
  .hp-weather-current { display: grid; grid-template-columns: 62px minmax(0,1fr) auto; align-items: center; column-gap: 10px; }
  .hp-weather-current .hp-weather-icon { width: 58px; height: 58px; }
  .hp-weather-copy { min-width: 0; }
  .hp-weather-label { font-size: 1.08rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hp-weather-detail { margin-top: 4px; color: rgba(255,255,255,.65); font-size: .78rem; }
  .hp-weather-temp { font-size: 2rem; font-weight: 300; }
  .hp-forecast { display: grid; gap: 2px; margin-top: 12px; }
  .hp-forecast-row { display: grid; grid-template-columns: 3.3rem 42px minmax(0,1fr) auto; align-items: center; gap: 7px; min-height: 44px; }
  .hp-forecast-day { color: rgba(255,255,255,.68); font-size: .73rem; text-transform: uppercase; }
  .hp-forecast-row .hp-weather-icon { width: 38px; height: 38px; }
  .hp-forecast-condition { color: rgba(255,255,255,.73); font-size: .76rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hp-forecast-range { font-size: .84rem; white-space: nowrap; }
  .hp-alerts { display: grid; gap: 8px; }
  .hp-alert { display: grid; grid-template-columns: 26px minmax(0,1fr); gap: 9px; align-items: center; padding: 10px 12px; border-left: 3px solid var(--hp-alert-color, #ffb74d); border-radius: 8px; background: rgba(10,13,18,.58); }
  .hp-alert svg { width: 22px; height: 22px; color: var(--hp-alert-color, #ffb74d); }
  .hp-alert-label { font-size: .86rem; font-weight: 600; }
  .hp-alert-state { margin-top: 2px; color: rgba(255,255,255,.65); font-size: .72rem; }
  .hp-agenda { display: grid; gap: 8px; }
  .hp-agenda-title { font-size: .72rem; text-transform: uppercase; letter-spacing: .1em; color: rgba(255,255,255,.55); }
  .hp-event { display: grid; grid-template-columns: 44px 3px minmax(0,1fr); gap: 10px; min-height: 50px; align-items: stretch; }
  .hp-event-date { display: flex; flex-direction: column; align-items: center; justify-content: center; text-transform: uppercase; }
  .hp-event-weekday { font-size: .58rem; opacity: .7; }
  .hp-event-day { font-size: 1.35rem; line-height: 1; }
  .hp-event-month { font-size: .54rem; opacity: .7; }
  .hp-event-bar { border-radius: 999px; background: var(--hp-event-color, #64b5f6); }
  .hp-event-copy { display: flex; min-width: 0; flex-direction: column; justify-content: center; }
  .hp-event-summary { overflow: hidden; color: var(--hp-event-color, #64b5f6); font-size: .8rem; font-weight: 600; white-space: nowrap; text-overflow: ellipsis; }
  .hp-event-time { display: flex; align-items: center; gap: 4px; margin-top: 3px; color: rgba(255,255,255,.66); font-size: .64rem; }
  .hp-action-bar { display: flex; width: 100%; justify-content: space-around; align-items: end; gap: 18px; }
  .hp-action { appearance: none; display: flex; min-width: 88px; flex-direction: column; align-items: center; gap: 5px; border: 0; border-radius: 0; padding: 8px 12px; background: transparent; color: inherit; font: inherit; text-shadow: var(--hp-shadow); cursor: pointer; }
  .hp-action[disabled] { cursor: default; opacity: 1; }
  .hp-action:not([disabled]):active { transform: scale(.95); }
  .hp-action svg { width: 27px; height: 27px; filter: drop-shadow(0 2px 4px rgba(0,0,0,.7)); }
  .hp-action-label { font-size: .9rem; }
  .hp-entity { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 14px; align-items: center; padding: 10px 0; }
  .hp-entity-name { font-size: .85rem; color: rgba(255,255,255,.73); }
  .hp-entity-value { font-size: 1.1rem; font-weight: 500; }
  .hp-separator { width: 100%; height: 1px; background: rgba(255,255,255,.2); }
  .hp-transport { display: grid; gap: 8px; }
  .hp-transport-row { display: grid; grid-template-columns: 26px minmax(0,1fr) auto; gap: 8px; align-items: center; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,.12); }
  .hp-transport-row:last-child { border-bottom: 0; }
  .hp-transport-row svg { width: 20px; height: 20px; color: var(--hp-accent); }
  .hp-transport-name { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: .8rem; }
  .hp-transport-time { font-size: .82rem; font-weight: 600; }
  .hp-month { display: grid; grid-template-columns: repeat(7,1fr); gap: 3px; font-size: .65rem; }
  .hp-month-heading { grid-column: 1 / -1; margin-bottom: 5px; font-size: .9rem; font-weight: 500; }
  .hp-month-weekday { text-align: center; color: rgba(255,255,255,.52); text-transform: uppercase; }
  .hp-month-day { position: relative; display: grid; min-height: 24px; place-items: center; border-radius: 50%; }
  .hp-month-day.is-today { background: var(--hp-accent); color: #07131d; font-weight: 700; }
  .hp-month-day.has-event::after { content: ""; position: absolute; bottom: 1px; width: 3px; height: 3px; border-radius: 50%; background: currentColor; }
  .hp-embedded-card { text-shadow: none; }
  .hp-warning { margin: 10px; padding: 10px 14px; border: 1px solid rgba(255,183,77,.5); border-radius: 10px; background: rgba(70,42,0,.65); color: #ffd59d; font-size: .8rem; }
  .hp-weather-icon { display: block; overflow: visible; contain: layout paint; filter: drop-shadow(0 2px 4px rgba(0,0,0,.45)); }
  .hp-weather-icon .hp-rays,
  .hp-weather-icon .hp-cloud,
  .hp-weather-icon .hp-rain,
  .hp-weather-icon .hp-snow,
  .hp-weather-icon .hp-fog,
  .hp-weather-icon .hp-wind,
  .hp-weather-icon .hp-moon { transform-box: fill-box; transform-origin: center; }
  .hp-weather-icon.is-animated .hp-rays,
  .hp-weather-icon.is-animated .hp-cloud,
  .hp-weather-icon.is-animated .hp-rain,
  .hp-weather-icon.is-animated .hp-snow,
  .hp-weather-icon.is-animated .hp-fog,
  .hp-weather-icon.is-animated .hp-wind,
  .hp-weather-icon.is-animated .hp-moon,
  .hp-weather-icon.is-animated .hp-star { will-change: transform, opacity; }
  .hp-weather-icon.is-animated .hp-rays { animation: hp-spin 14s linear infinite; }
  .hp-weather-icon.is-animated .hp-cloud:not(.hp-cloud-small) { animation: hp-drift 4.5s ease-in-out infinite; }
  .hp-weather-icon.is-animated .hp-rain { animation: hp-rain 1.35s linear infinite; }
  .hp-weather-icon.is-animated .hp-snow { animation: hp-snow 2.2s ease-in-out infinite; }
  .hp-weather-icon.is-animated .hp-lightning { animation: hp-flash 4s steps(1,end) infinite; }
  .hp-weather-icon.is-animated .hp-fog { animation: hp-fog 4s ease-in-out infinite; }
  .hp-weather-icon.is-animated .hp-wind { animation: hp-wind 2.8s ease-in-out infinite; }
  .hp-weather-icon.is-animated .hp-moon { animation: hp-float 5s ease-in-out infinite; }
  .hp-weather-icon.is-animated .hp-star { animation: hp-twinkle 2s ease-in-out infinite alternate; }
  .hp-weather-icon.is-animated .hp-star-b { animation-delay: -1s; }
  @keyframes hp-spin { to { transform: rotate(360deg); } }
  @keyframes hp-drift { 0%,100% { transform: translate3d(-1px,0,0); } 50% { transform: translate3d(2px,0,0); } }
  @keyframes hp-rain { 0% { opacity: .25; transform: translate3d(0,-3px,0); } 50% { opacity: 1; } 100% { opacity: .25; transform: translate3d(0,6px,0); } }
  @keyframes hp-snow { 0%,100% { transform: translate3d(0,-1px,0); } 50% { transform: translate3d(2px,3px,0); } }
  @keyframes hp-flash { 0%,88%,92%,100% { opacity: 1; } 89%,91% { opacity: .1; } }
  @keyframes hp-fog { 0%,100% { transform: translate3d(-2px,0,0); opacity: .72; } 50% { transform: translate3d(3px,0,0); opacity: 1; } }
  @keyframes hp-wind { 0%,100% { transform: translate3d(-2px,0,0); } 50% { transform: translate3d(3px,0,0); } }
  @keyframes hp-float { 0%,100% { transform: translate3d(0,-1px,0); } 50% { transform: translate3d(0,2px,0); } }
  @keyframes hp-twinkle { from { opacity: .3; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .hp-weather-icon * { animation: none !important; }
    .hp-background-next { transition: none; }
  }
  @media (max-width: 700px), (max-height: 520px) {
    .hp-grid { --hp-padding: 16px !important; --hp-zone-gap: 10px !important; --hp-widget-gap: 8px !important; }
    .hp-clock-time { font-size: min(var(--hp-clock-size, 9rem), 18vw); }
    .hp-date { font-size: min(var(--hp-date-size, 2rem), 4vw); }
    .hp-weather-current { grid-template-columns: 46px minmax(0,1fr) auto; }
    .hp-weather-current .hp-weather-icon { width: 43px; height: 43px; }
    .hp-weather-temp { font-size: 1.45rem; }
    .hp-forecast-condition { display: none; }
    .hp-forecast-row { grid-template-columns: 2.7rem 32px minmax(0,1fr); min-height: 34px; }
    .hp-forecast-row .hp-weather-icon { width: 30px; height: 30px; }
  }
`;
