# MoboMap – Danmarkskort Design Studio

Interaktiv generator til et forenklet danmarkskort med markerede kommuner. Vælg designsystem, kortstil og markeringsform, klik på kommuner eller indsæt en liste, og eksportér til PNG/JPG/PDF.

## Release (én fil)

`node tools/build.mjs` samler alt til **`index.html`** – geodata, fonte, jsPDF og alle designsystemer i `designsystems/` (inkl. logoer som data-URI). Filen er selvstændig, virker offline fra `file://` og kan deles som den er.

`index.html` er gitignored, fordi den kan indeholde private logoer.

## Udvikling

```
npm install
node tools/prepare-geo.mjs   # kun hvis assets/geo/source-municipalities.geojson ændres
node tools/build.mjs         # src/app.html + assets + designsystems -> index.html
node tools/serve.mjs . 8787  # lokal server til test
```

- `src/app.html` – appen (UI, 24 kortstile, 11 markeringsformer, eksport). Nye stile defineres i `SP`-tabellen (farver, tekstur-filter, labels, titel-justering) uden at røre render(). Pladsholdere `/*__DATA__*/`, `/*__FONTS__*/`, `/*__JSPDF__*/`, `/*__DESIGNSYSTEMS__*/` udfyldes af build.
- `assets/geo/` – kommunegrænser (DAGI via github.com/magnuslarsen/geoJSON-Danish-municipalities), forenklet med mapshaper, EPSG:25832.
- `assets/fonts/` – Arvo, Work Sans, Roboto Slab, Space Grotesk, DM Serif Display, IBM Plex Mono (Google Fonts, OFL). Disse familier kan bruges i et designsystem uden at medsende filer.
- `designsystems/` – ét JSON-dokument pr. designsystem. Build læser mappen rekursivt; `designsystems/private/` er gitignored til kunde-/brandspecifikke systemer og logoer.

## Designsystemer

Tre måder at tilføje et system på – alle bruger samme JSON-skema:

1. **Byg ind**: læg `navn.json` (+ evt. logo/fontfiler) i `designsystems/` og kør build. Filnavnet styrer rækkefølgen; det første system er standard.
2. **Sidecar uden build**: læg `designsystems.js` ved siden af `index.html` med `window.DESIGN_SYSTEMS = [ ... ]`. Den indlæses automatisk, også fra `file://`. Knappen "designsystems.js" i appen genererer filen ud fra dine importerede systemer.
3. **I appen**: "Importér" (eller træk en `.json` ind på siden), eller "Redigér / ny" → JSON-editor med logo-vælger → "Gem". Gemmes i browserens localStorage; "Eksportér JSON" deler det videre.

Fordi en `file://`-side ikke må `fetch()` filer fra sin egen mappe, skal logoer og fonte i et sidecar/importeret system være data-URI'er (editoren og build gør det for dig). I `designsystems/` må `src` være en relativ sti.

### Projekter

"Gem projekt" i toppen downloader `<titel>.mobomap.json` med alt: valgt profil (og selve profilen hvis den er importeret), layout, kortstil, markeringsgrupper med kommuner/farver/former, tekster, partnere og afkrydsninger. "Åbn projekt" (eller træk filen ind på siden) genskaber det hele.

### Markeringsgrupper

Kommuner lægges i grupper (fx "Fuldfarve", "Skraveret"). Hver gruppe har sin egen farve og sine egne markeringsformer: fuldfarve, skravering, prikker, halvtone, lyser op, kontur, løftet, pin, navneskilt, callout, dæmp resten. Klik på kortet lægger kommunen i den aktive gruppe. En signaturforklaring viser gruppenavnene.

### Layouts

Liggende 1000×800, Stående 800×1130 (A4), Kvadrat 1000×1000, Bred 1200×675. Footer med partnerlogoer reserveres nederst når den er slået til. PDF-eksport vælger A4 liggende/stående efter layoutet og lægger klikbare links på partnerlogoer og virksomhedslogo.

### Skema

```jsonc
{
  "id": "mitfirma",                  // unik nøgle (påkrævet)
  "name": "Mit Firma",               // vises i dropdown
  "note": "fra brandguide 2024",     // valgfri tekst ved navnet
  "fonts": {
    "heading": "Arvo",               // overskrifter på kortet og i UI
    "body": "Work Sans",             // brødtekst/labels
    "faces": [                       // valgfrit: egne fonte
      { "family": "MinFont", "src": "fonts/minfont.woff2", "weight": "700" }
    ]
  },
  "colors": {
    "bg": "#FFFFFF",                 // kortets baggrund
    "land": "#1F4B5A",               // kommuneflader
    "landAlt": "#2a5f70",            // valgfri: alternativ nuance
    "stroke": "#FFFFFF",             // kommunegrænser
    "ink": "#1F4B5A",                // tekst på kortet
    "primary": "#1F4B5A",            // UI: header, valgte felter
    "accent": "#FFD500",             // UI: knapper/badges; kortets standard-markeringsfarve
    "accent2": "#2FA8AE",            // UI: sekundær
    "heading": "#1F4B5A",            // valgfri: overskriftsfarve (lys baggrund)
    "headingOnDark": "#FFD500",      // valgfri: overskriftsfarve (mørk baggrund)
    "dark": false                    // valgfri: tvinger mørk/lys logik
  },
  "highlight": ["#FFD500", "#2FA8AE", "#FFFFFF"],   // markeringsfarver der kan vælges
  "swatches": ["#1F4B5A", "#FFD500", "#2FA8AE"],    // vises som palette i UI
  "company": {                       // virksomhedsprofil
    "name": "Mit Firma",
    "link": "https://mitfirma.dk",   // bliver klikbart i PDF
    "logo": {
      "src": "mitfirma/logo.png",    // relativ sti (build) eller data-URI; udelad for tekstlogo
      "width": 220,                  // bredde i kort-enheder (liggende kort er 1000×800)
      "box": "auto",                 // "auto" = kasse på lys/uensartet baggrund, "always", "never"
      "boxColor": "#1F4B5A",
      "text": "MIT FIRMA",           // tekstlogo hvis src mangler (ellers company.name)
      "sub": "98 KOMMUNER"
    }
  },
  "partners": [                      // vises i footer; links bliver klikbare i PDF
    { "name": "Partner A", "link": "https://a.dk", "logo": "mitfirma/partners/a.png" },
    { "name": "Partner B", "link": "https://b.dk", "logo": { "src": "data:image/png;base64,..." } }
  ],
  "footer": {
    "label": "I samarbejde med",
    "divider": {                     // skillelinje mellem kort og footer
      "style": "bar",                // "bar" (afrundet bjælke, som på engineerthefuture.dk), "line" eller "none"
      "color": "#1F4B5A",            // standard: colors.primary
      "opacity": 0.8,
      "height": 5,                   // kun for "bar"
      "width": 0.18,                 // andel af bredden (0–1) eller absolut i kort-enheder
      "align": "left"                // "left", "center", "right"
    }
  },
  "defaults": { "title": "Vi er her", "sub": "Danmark" }   // valgfri: udfylder tekstfelterne
}
```

`logo` på topniveau (ældre format) tolkes som `company.logo`.

Udeladte felter udledes (fx `landAlt`, `accent2`, `dark`, `heading`).
