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
- HearthPane Collection nature backgrounds by default, with Picsum, Home Assistant file, media, URL, and image-list alternatives
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

HearthPane defaults to the **HearthPane Collection**: four original AI-generated 1280×800 nature images hosted in this repository at the installed card's release tag. The collection shuffles once per card instance and rotates every five minutes. Images load from `raw.githubusercontent.com` and require internet access; HACS still installs only `hearthpane.js`.

Select `collection` in the designer or YAML:

```yaml
background:
  source: collection
  rotationInterval: 300
```

You can instead select Picsum, a Home Assistant path such as `/local/backgrounds/photo.jpg`, an authenticated `media-source://` identifier, any image URL, or a list of images:

```yaml
background:
  source: media
  url: /local/backgrounds/photo.jpg
  rotationInterval: 300
  objectFit: cover
```

Existing selected sources are preserved. Images preload before crossfading; failed images time out after ten seconds and are skipped for ten minutes. If the selected source fails completely, HearthPane tries its collection without changing your configuration. If every source fails, it keeps the last successful photo or shows a local gradient on a fresh load. Picsum makes requests to `picsum.photos`; fallback images make requests to `raw.githubusercontent.com` even when your selected source is local.

Legacy sensor-backed backgrounds remain readable. OpenWeatherMap, Unsplash, and Immich provider configurations show a clear warning and make no request, including fallback requests. See the [configuration reference](docs/configuration.md) for every widget and action. Collection assets and generation prompts are in [assets/backgrounds](assets/backgrounds).

## Development

```bash
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

`npm run build` emits the complete runtime as `hearthpane.js`. CI checks TypeScript, unit tests, browser interactions, golden screenshots, bundle isolation, and HACS validation.

## Privacy and independence

The public presets contain no household entity IDs. HearthPane reads only the Home Assistant entities selected in the dashboard configuration. The runtime has no imports. Collection images and fallback photos contact GitHub's raw content host; optional Picsum backgrounds contact Picsum. No background credentials are sent to either host. The local gradient remains available if image requests fail.

## License

MIT
