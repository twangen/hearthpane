# HearthPane

HearthPane is a self-contained ambient dashboard card for Home Assistant. It recreates a cinematic clock-and-photo display as one configurable panel card without a runtime dependency on another custom card or network-hosted weather artwork.

The included **HearthPane Classic** preset uses a two-thirds photo stage and one-third translucent information rail, a large clock and date, animated weather, conditional alerts, a short agenda, and child-safe actions that default to `none`.

> HearthPane is currently pre-1.0 software. The existing Clock dashboard does not need to be changed to try it.

## Highlights

- One self-contained `hearthpane.js` runtime bundle
- Native Web Component and Shadow DOM
- Full-screen contextual widget designer with direct edit/delete controls, Undo, and a safe live preview
- Five layouts and nine named drop zones
- Original inline SVG artwork for every Home Assistant weather condition, with smooth animation for current conditions
- Home Assistant weather, calendar, media source, entity, action, and service APIs
- Picsum backgrounds by default, with simple Home Assistant file, media, URL, and image-list alternatives
- No external fonts, runtime imports, or custom-card dependencies
- Android 8.1-era WebView build target; readability does not depend on `backdrop-filter`

## Install

### HACS custom repository

1. Open HACS in Home Assistant.
2. Open the three-dot menu and choose **Custom repositories**.
3. Add `https://github.com/twangen/hearthpane` as a **Dashboard** repository.
4. Install HearthPane and reload the frontend.

After a release exists, you can also use the Home Assistant My link:

[![Open your Home Assistant instance and add this repository](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=twangen&repository=hearthpane&category=plugin)

Catalog submission is intentionally deferred until the card reaches visual and device parity.

### Manual single-file install

1. Download `hearthpane.js` from the latest release.
2. Copy it to `/config/www/hearthpane/hearthpane.js`.
3. Add `/local/hearthpane/hearthpane.js` as a JavaScript module under **Settings → Dashboards → Resources**.
4. Reload the frontend.

## Add the card

1. Open the dashboard you want to use and edit its view.
2. Select **Panel (single card)**.
3. Add **HearthPane**.
4. Open the full designer, choose a preset, and select your own entities. Use Design mode to arrange widgets and Preview mode to inspect the real card with actions safely disabled.

The shortest YAML configuration is:

```yaml
type: custom:hearthpane-card
```

That opens the entity-neutral Classic preset. Assist and Home are visible but inert until you deliberately select actions for them. A complete portable example is in [examples/classic.yaml](examples/classic.yaml).

## Backgrounds

HearthPane uses free random 1920×1080 photos from Picsum by default. You can instead select a Home Assistant path such as `/local/backgrounds/photo.jpg`, an authenticated `media-source://` identifier, any image URL, or a list of images:

```yaml
background:
  source: media
  url: /local/backgrounds/photo.jpg
  rotationInterval: 300
  objectFit: cover
```

The default `picsum` source makes image requests to `picsum.photos`. Legacy sensor-backed backgrounds remain readable for existing dashboards, but are no longer needed for new configurations. OpenWeatherMap, Unsplash, and Immich provider configurations show a clear warning and make no request. See the [configuration reference](docs/configuration.md) for every widget and action.

## Development

```bash
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

`npm run build` emits the complete runtime as `hearthpane.js`. CI checks TypeScript, unit tests, browser interactions, golden screenshots, bundle isolation, and HACS validation.

## Privacy and independence

The public presets contain no household entity IDs. HearthPane reads only the Home Assistant entities selected in the dashboard configuration. The runtime has no imports; the default background source contacts Picsum unless you select a local or Home Assistant-hosted source.

## License

MIT
