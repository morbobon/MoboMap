# MoboMap – Map Design Studio

Single-file, offline-capable generator for stylised maps with highlighted units, in your own design system. Start from **the world (176 countries)** and drill down via **Focus** into any country's **regions/states/provinces** (Natural Earth admin-1, ~240 countries) – or **Denmark's 98 municipalities** in full detail.

- **Design systems / company profiles** as JSON: colours, fonts, logo, partners, footer. Built in, loaded from a sidecar file, or imported in the app. The UI re-themes itself from the active profile.
- **28 map styles** – flat, silhouette, atlas, paper cut, glass, neon, blueprint, halftone, 3D block, slate, poster, retro, topographic, doodle, typographic, vintage, word map, midnight, **flag sticker**, **network**, **pixel mosaic**, **stone relief** …
- **Focus / drill-down** – World → continent (zoom) → country (switches to its regions, local equal-area projection, major cities, neighbouring countries in grey for context) → region (zoom). Small far-away islands (e.g. Bouvet, overseas departments) are left out of country views.
- **Highlight groups** – several groups at once, each with its own colour and modes (solid, hatched, dots, tint, glow, outline, raised, pin, label, callout, dim others).
- **Attributes** – colour every unit by region, continent, UN region, economy, income group, population, GDP per capita, majority religion, EU/NATO/G20/Nordic membership, hemisphere, area … or turn an attribute into highlight groups with one click.
- **Projections**: Local (Lambert azimuthal equal-area, default for countries), Robinson, Equal Earth, Natural Earth, Mollweide, Winkel Tripel, Mercator, Plate carrée, Miller.
- **Layouts** (landscape, portrait/A4, square, 16:9), footer with partner logos, legend.
- **Export** PNG / JPG (3×) and PDF (A4, clickable partner links). **Projects** save/open as `.mobomap.json`.
- **UI in 10 languages** – English (default), Danish, German, French, Spanish, Swedish, Norwegian, Finnish, Dutch, Italian.

Everything ships as one `index.html` (~3.7 MB) that works from `file://` without a server.

## Quick start

```bash
npm install
npm run build        # -> index.html
npm run release      # -> release/MoboMap-<version>-<date>.zip (+ a -public variant)
node tools/serve.mjs . 8787   # optional local server for development
```

Open `index.html` in a browser. To prepare geodata from scratch (only needed if the source files change): `npm run geo`.

## Design systems

A design system is one JSON document. Three ways to add one – same schema:

1. **Build in** – put `name.json` (plus logo/font files) in `designsystems/` and run the build. File names control the order; the first *public* profile is the default. `designsystems/private/` is gitignored for client-specific brands and is tagged "Private" in the app.
2. **Sidecar, no build** – put `designsystems.js` next to `index.html` containing `window.DESIGN_SYSTEMS = [ ... ]`. It loads automatically, also from `file://`. The app can generate this file from your imported profiles.
3. **In the app** – "Import" (or drop a `.json` on the page), or "Edit / new" → JSON editor with logo picker → "Save". Stored in localStorage; "Export JSON" shares it.

Because a `file://` page cannot `fetch()` files from its own folder, logos and fonts in sidecar/imported profiles must be data URIs (the editor and the build do this for you). In `designsystems/`, `src` may be a relative path.

### Schema

```jsonc
{
  "id": "acme",                        // unique key (required)
  "name": "ACME",                      // shown in the dropdown
  "note": "brand guide 2026",          // optional
  "fonts": {
    "heading": "Arvo", "body": "Work Sans",        // bundled: Arvo, Work Sans, Roboto Slab, Space Grotesk, DM Serif Display, IBM Plex Mono
    "faces": [{ "family": "MyFont", "src": "fonts/myfont.woff2", "weight": "700" }]   // optional custom fonts
  },
  "colors": {
    "bg": "#FFFFFF", "land": "#2F3E4E", "landAlt": "#3d4f62", "stroke": "#FFFFFF", "ink": "#2F3E4E",
    "primary": "#2F3E4E", "accent": "#FF6B35", "accent2": "#3A86FF",   // UI theme + default highlight colour
    "heading": "#2F3E4E", "headingOnDark": "#FF6B35", "dark": false   // optional
  },
  "highlight": ["#FF6B35", "#3A86FF", "#FFD166", "#FFFFFF"],   // highlight colours offered per group
  "swatches": ["#2F3E4E", "#FF6B35", "#3A86FF"],               // palette preview in the UI
  "company": {
    "name": "ACME", "link": "https://acme.example",            // link is clickable in PDF
    "logo": { "src": "acme/logo.png", "width": 220, "box": "auto", "boxColor": "#2F3E4E", "text": "", "sub": "" }
  },
  "partners": [ { "name": "Partner", "link": "https://…", "logo": "acme/partners/p.png" } ],
  "footer": { "label": "In partnership with",
              "divider": { "style": "bar", "color": "#2F3E4E", "opacity": 0.8, "height": 5, "width": 0.18, "align": "left" } },
  "defaults": { "title": "We are here", "sub": "" }
}
```

Omitted fields are derived (`landAlt`, `accent2`, `dark`, `heading` …). `logo.box`: `auto` draws a box on light/uneven backgrounds, `always`, `never`. Divider styles: `bar` (rounded), `line`, `none`.

## Data

`tools/build.mjs` turns the sources in `assets/geo/` into a generic *dataset* per map: units with code, names (per language), group, centroid, bbox, area and two detail levels, plus landmass, inner borders and group borders.

| Map | Units | Source | Coordinates |
|---|---|---|---|
| Denmark | 98 municipalities, 5 regions, Bornholm inset | DAGI via [geoJSON-Danish-municipalities](https://github.com/magnuslarsen/geoJSON-Danish-municipalities) | UTM 32N, projected at build time |
| World | 176 countries, 6 continents, major cities | [Natural Earth](https://www.naturalearthdata.com/) 110m countries, 50m populated places | lon/lat, projected at runtime |
| Any country | its admin-1 units (states, regions, provinces …), grouped by NE `region` where available | Natural Earth 10m admin-1, simplified to ~3.5 km (`tools/prepare-admin1.mjs`) | 0.01° integers, delta-encoded, decoded on demand |

Denmark uses its municipalities instead of its 5 admin-1 regions. Adding finer detail (admin-2) for another country follows the same pattern: a dataset in `tools/build.mjs` and a branch in `countryData()`.

World attributes come from Natural Earth (continent, UN region, subregion, economy, income group, population, GDP). Membership lists (EU, NATO, G20, Nordic) and the majority-religion table live in `assets/geo/world-extra.json`; the religion table is an approximation and not authoritative.

Adding a dataset: a `dataset({...})` call in `tools/build.mjs` plus an entry in `MAPS`/`ATTRS` in `src/app.html`.

## Project layout

```
src/app.html          the app; placeholders /*__DATA__*/ /*__FONTS__*/ /*__JSPDF__*/ /*__DESIGNSYSTEMS__*/ /*__I18N__*/ are filled by the build
src/i18n.json         UI strings per language (+ i18n-extra.json: styles, attributes, toasts)
designsystems/        public profiles (committed) · designsystems/private/ (gitignored)
assets/geo/           source and simplified geodata · assets/fonts/ · assets/jspdf.umd.min.js
tools/prepare-geo.mjs mapshaper pipeline (simplify, dissolve, inner lines, centroids)
tools/prepare-admin1.mjs downloads NE 10m admin-1 (40 MB, gitignored) and writes assets/geo/admin1.json
tools/build.mjs       inlines everything into index.html (--public skips private profiles, --out=path)
tools/release.mjs     builds release/*.zip (full and public)
```

Map styles are a config table (`SP` in `src/app.html`): colours, texture filter, labels, title alignment – a new look is usually one line.

## Translations

UI strings: `src/i18n.json` and `src/i18n-extra.json`, key → text per language. Missing keys fall back to English. Country names follow the UI language where Natural Earth provides them (da/de/fr/es/sv/nl/it); municipality names are Danish.

## License

MIT – see [LICENSE](LICENSE), which also lists the licenses of bundled data, fonts and libraries. Private profiles and logos are never part of the repository or the public release.
