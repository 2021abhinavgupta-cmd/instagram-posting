# CarouselCraft — Instagram Carousel Generator

## Project Overview
Web app that generates Instagram carousel cards (1080×1080 px) with aesthetic text overlays.
Type text, pick a background (Unsplash / Pexels / Pixabay / upload), style each card, export as PNG or ZIP.

## Tech Stack
- **React + Vite** — `carouselcraft/` subfolder, run `npm run dev` from inside it
- **Tailwind CSS v4** — `@import "tailwindcss"` in CSS, no config file, `@tailwindcss/vite` plugin
- **react-konva / konva** — canvas rendering; named imports from `react-konva`, `Konva` (for filters) imported separately from `'konva'`
- **Unsplash API** + **Pexels API** + **Pixabay API** — all free-tier; keys in `.env`
- **Anthropic API** (`claude-sonnet-4-6`) — optional; used for Claude Vision text placement
- **JSZip + FileSaver.js** — ZIP export
- **localStorage** — style presets; **sessionStorage** — Claude Vision result cache
- **Lucide React** — icons
- **@dnd-kit/sortable** — drag-to-reorder thumbnail strip

## File Map
```
carouselcraft/
  src/
    App.jsx                    # Root — all global state lives here
    main.jsx
    components/
      CardEditor.jsx           # Per-card text + image editor (controlled)
      CardPreview.jsx          # Konva canvas, exportPNG(), layers 1–8; draggable text
      CarouselPanel.jsx        # Thumbnail strip, drag-to-reorder, active editor
      ExportPanel.jsx          # Download PNG / ZIP / clipboard bar
      GlobalSettings.jsx       # Watermark + slide indicator controls (global)
      ImagePicker.jsx          # Unsplash | Pexels | Pixabay | Upload tabs
      PresetManager.jsx        # Save / load / delete style presets
      StylePanel.jsx           # All per-card style controls
    hooks/
      useExport.js             # exportCard / exportAll / clipboardCopy
      usePexels.js             # Pexels photo search hook
      usePixabay.js            # Pixabay photo search hook
      usePresets.js            # localStorage CRUD for presets
      useUnsplash.js           # Unsplash photo search hook
    utils/
      canvasHelpers.js         # getTextPosition, wrapText, analyzeImagePlacement,
                               # generateGrainCanvas, applyOverlay
      claudeVision.js          # analyzeImageWithClaude — claude-sonnet-4-6 vision;
                               # sessionStorage cache; falls back to analyzeImagePlacement
      textStyles.js            # defaultStyles, FONTS, PRESET_FIELDS, constants
  .env                         # API keys (see API Keys section)
  index.html                   # Google Fonts for all 14 font families
```

---

## Card Data Shape
Each card in `cards[]`:
```js
{
  id:      string,      // unique uid or 'cover'
  isCover: boolean,
  data: {
    headline:  string,  // raw text (MIXED uses **bold** syntax)
    subtitle:  string,
    imageUrl:  string | null,
    style:     StyleObject,
  }
}
```

---

## Style Schema (per card — `card.data.style`)
```js
{
  // Style layout type
  styleType:       'HEADLINE' | 'SUBTITLE' | 'MIXED' | 'SPLIT',

  // Fonts — must match families loaded in index.html
  headlineFont:    string,   // e.g. 'Playfair Display'
  headlineSize:    number,   // 48–96 (px at 1080 export scale)
  headlineStyle:   'italic' | 'normal',
  subtitleFont:    string,   // e.g. 'Inter'
  subtitleSize:    number,   // 24–48

  // Typography
  letterSpacing:   number,   // −2 to 20 px, scaled by displayScale
  lineHeight:      number,   // 1.0–2.2 multiplier
  textTransform:   'none' | 'uppercase' | 'lowercase',

  // Text positions (9-position grid, see POSITION_GRID)
  textPosition:    string,   // headline grid position
  subtitlePosition: string,  // subtitle grid position (hidden in StylePanel for MIXED)

  // Drag-to-reposition overrides (1080-scale px; null = use grid position above)
  textDragX:       number | null,
  textDragY:       number | null,
  subtitleDragX:   number | null,
  subtitleDragY:   number | null,

  // Color & effects
  textColor:       string,   // CSS hex
  textShadow:      boolean,
  shadowBlur:      number,   // 0–40 px at export scale

  // Overlay (sits above background)
  overlayOpacity:  number,   // 0–0.7
  overlayType:     'flat' | 'bottom-fade' | 'top-fade' | 'vignette',
  overlayColor:    string,   // CSS hex — tints the overlay (default '#000000')
  grainAmount:     number,   // 0–100 %

  // Image adjustments — Konva filters, only active when bgType='image'
  imgBrightness:   number,   // 0–200, default 100 → Konva.Filters.Brighten
  imgContrast:     number,   // 0–200, default 100 → Konva.Filters.Contrast
  imgSaturation:   number,   // 0–200, default 100 → Konva.Filters.HSL
  imgBlur:         number,   // 0–30,  default 0   → Konva.Filters.Blur

  // Background
  bgType:          'image' | 'solid' | 'gradient',
  bgColor:         string,   // hex, when bgType='solid'
  bgGradientStart: string,   // hex, when bgType='gradient' (diagonal)
  bgGradientEnd:   string,
}
```

`PRESET_FIELDS` in `textStyles.js` lists every field above (minus `styleType` and `textDragX/Y/subtitleDragX/Y`) for preset save/load.

---

## Global State (App.jsx — not per-card)
```js
watermark: {
  url:      string,    // base64 dataURL of logo image
  position: string,    // one of 9 position keys, default 'bottom-right'
  size:     number,    // rendered width in px at 1080 scale (default 80)
  opacity:  number,    // 0–1 (default 0.8)
} | null

showSlideIndicator: boolean            // default false
indicatorPosition:  string             // one of 9 position keys, default 'bottom-right'
```

---

## Text Style Types
| Type | Headline field | Subtitle field | Subtitle position picker |
|---|---|---|---|
| HEADLINE | Big italic serif (72 px) | Optional supporting text | Yes |
| SUBTITLE | Smaller sans-serif | Body text (main content) | Yes |
| MIXED | `**bold** rest-of-text` on one line | Hidden | No |
| SPLIT | Top text block | Bottom text block | Yes |

**MIXED syntax**: wrap bold word(s) with `**word**` — the part after `**bold**` renders in the lighter subtitle font on the same line.

---

## 9-Position Grid
```
top-left      top-center      top-right
center-left   center          center-right
bottom-left   bottom-center   bottom-right
```
Both `textPosition` (headline) and `subtitlePosition` use this grid.
`subtitlePosition` picker is hidden in StylePanel for MIXED only.
`POSITION_GRID` constant in `textStyles.js` is a 3×3 array used by all PositionPicker components.

Clicking a grid cell in StylePanel also clears `textDragX/Y` (or `subtitleDragX/Y`), snapping text back to the grid position.

---

## Fonts (14 total, loaded via Google Fonts in index.html)
| Category | Fonts |
|---|---|
| Serif / Display serif | Playfair Display, DM Serif Display, Cormorant Garamond, EB Garamond, Lora, Crimson Text |
| Sans-serif | Inter, Montserrat, Raleway, Josefin Sans, Work Sans |
| Display | Bebas Neue |
| System fallback | Georgia, Arial |

FontPicker in StylePanel renders each option in its own typeface (inline expanding list, no z-index issues in `overflow-y-auto` sidebar).

---

## CardPreview — Layer Order (bottom → top)
1. `#111111` solid base rect
2. **Background** — image (cover-fit + Konva filters) / solid color / diagonal gradient
3. **Overlay** — flat rgba / directional linear gradient / radial vignette (colored by `overlayColor`)
4. **Grain texture** — 256×256 noise canvas (KonvaImage stretched to card size)
5. **Headline text** — or MIXED bold+regular pair side-by-side
6. **Subtitle text** — opacity 0.85, hidden for MIXED
7. **Watermark/logo** — global, KonvaImage, positioned + sized + opacity controlled
8. **Slide indicator** — Konva Group (rounded Rect pill + Text) e.g. `"01 / 06"`

### Konva Image Filters
```js
// Import separately — not a named export from react-konva
import Konva from 'konva'

// Active filters array (only include when value differs from default)
filters: [
  ...(imgBrightness !== 100 ? [Konva.Filters.Brighten] : []),
  ...(imgContrast   !== 100 ? [Konva.Filters.Contrast] : []),
  ...(imgSaturation !== 100 ? [Konva.Filters.HSL]      : []),
  ...(imgBlur       >  0    ? [Konva.Filters.Blur]     : []),
]

// KonvaImage props (Konva reads these by name alongside filters=[])
brightness  = (imgBrightness - 100) / 200   // −0.5…+0.5
contrast    = imgContrast - 100              // −100…+100
saturation  = (imgSaturation - 100) / 100   // −1…+1
blurRadius  = imgBlur                        // 0…30
```
`node.cache()` must be called (in `useEffect`) whenever any filter is active.
`node.clearCache()` when all are back at defaults.

### Display Scale
`displayScale = size / EXPORT_SIZE` (EXPORT_SIZE = 1080).
All font sizes, letter spacing, shadow blur, watermark size, and indicator font size are multiplied by `displayScale` so previews at 120 px and 220 px look correct, and `exportPNG()` always outputs 1080×1080.

### exportPNG()
```js
stage.toDataURL({ mimeType: 'image/png', pixelRatio: EXPORT_SIZE / stage.width() })
```
Always 1080×1080 regardless of display size.

### Drag-to-Reposition Text
When `draggableText={true}`, headline and subtitle text blocks are wrapped in Konva `Group` nodes with:
- `draggable` — lets the user click + drag the text block anywhere on the card
- `DraggableTextGroup` helper (defined in CardPreview.jsx) — transparent hit rect + dashed hover border + cursor feedback
- `onDragEnd` → calls `onTextDrag({ textDragX, textDragY })` or `{ subtitleDragX, subtitleDragY }` in 1080-scale px

`textDragX/Y` and `subtitleDragX/Y` override the grid position for ALL render modes (thumbnails, export). Set to `null` to snap back to the grid position — clicking any cell in StylePanel's PositionPicker does this automatically.

Only the **right sidebar preview** (size=220) has `draggableText={true}`. Thumbnails stay non-interactive. MIXED style does not support drag (multiple inline nodes).

---

## Component Contracts

### CardPreview
```jsx
const ref = useRef(null)
<CardPreview
  ref={ref}
  cardData={{ headline, subtitle, imageUrl, style }}
  size={220}                       // display px (360 thumbnails pre-scale, 220 sidebar)
  watermark={watermark | null}
  showSlideIndicator={boolean}
  slideIndex={number}              // 1-based; cover = 1, first content card = 2, …
  totalSlides={number}
  indicatorPosition={string}
  draggableText={boolean}          // default false; true only on right sidebar preview
  onTextDrag={(patch) => void}     // patch: { textDragX, textDragY } or { subtitleDragX, subtitleDragY }
/>
// ref.current.exportPNG() → PNG data-URL string
```

### CardEditor
```jsx
<CardEditor
  cardIndex={number}               // 0-based
  totalCards={number}
  cardData={{ headline, subtitle, imageUrl, style }}
  onUpdate={(cardData) => void}
/>
```
- Selecting an image auto-runs `analyzeImageWithClaude(url, styleType)` → updates both `textPosition` and `subtitlePosition` for all style types (SPLIT, HEADLINE, SUBTITLE). MIXED only updates `textPosition`.
- Also clears `textDragX/Y` and `subtitleDragX/Y` so the new Claude-determined position takes effect.
- StylePanel is inside a `Collapsible` (closed by default), toggled by a "Style Settings" row
- MIXED style shows a `MixedInput` with `**bold**` syntax + live preview
- SUBTITLE style shows `subtitle` field labeled "Body Text" (no separate headline textarea)

### StylePanel
```jsx
<StylePanel style={styleObject} onChange={(styleObj) => void} />
```
Sections top → bottom:
1. Text Style (dropdown — changes reset to `defaultStyles[type]`, preserving textColor + bg fields)
2. Text Position 3×3 grid — clicking also clears `textDragX/Y`
3. Subtitle Position 3×3 grid (hidden for MIXED) — clicking also clears `subtitleDragX/Y`
4. Background: Image / Color / Gradient + color pickers
5. **Image Adjustments** (only when `bgType === 'image'`): brightness, contrast, saturation, blur sliders
6. Overlay: type + intensity + color swatch + film grain
7. Headline Font / Subtitle Font (FontPicker — inline expanding, each option in its own typeface)
8. Headline Size / Subtitle Size
9. Letter Spacing / Line Height
10. Text Color
11. Effects: Text Case (Aa / AA / aa), Italic toggle, Text Shadow toggle + Shadow Blur

### GlobalSettings
```jsx
<GlobalSettings
  watermark={{ url, position, size, opacity } | null}
  onWatermarkChange={(wm | null) => void}
  showSlideIndicator={boolean}
  onShowSlideIndicatorChange={(bool) => void}
  indicatorPosition={string}
  onIndicatorPositionChange={(pos) => void}
/>
```
Sections: **Watermark/Logo** (upload, 9-position grid, size 20–200 px, opacity 0–1) → **Slide Indicator** (toggle + 9-position grid when on).
Rendered in left sidebar below Presets.

### CarouselPanel
```jsx
<CarouselPanel
  cards={Array}
  activeCardId={string}
  onActiveChange={(cardId) => void}
  onCardUpdate={(cardId, data) => void}
  onAddCard={() => void}
  onRemoveCard={(cardId) => void}
  onDuplicateCard={(cardId) => void}   // inserts clone after source; no-op if 10 cards
  onReorder={(newCardsArray) => void}
  getRef={(cardId) => refObject}
  watermark={watermark | null}
  showSlideIndicator={boolean}
  indicatorPosition={string}
/>
```
Thumbnail strip: Cover slot (always left, non-draggable) | separator | sortable content slots.
Controls: `+` add · copy duplicate · `−` remove.
Each thumbnail `CardPreview` receives `slideIndex` (1-based) and `totalSlides = cards.length`.
Thumbnails render at `RENDER_SIZE=360` Konva, CSS-scaled to `THUMB_SIZE=120` (`scale(0.333)`). Export `pixelRatio = 1080/360 = 3`.

### ImagePicker
```jsx
<ImagePicker onSelect={(url) => void} currentUrl={string | null} />
```
Four tabs: **Unsplash** | **Pexels** | **Pixabay** | **Upload** (drag-and-drop / browse).
Shows `KeyMissingBanner` when API key env var is absent.

### PresetManager
```jsx
<PresetManager currentStyle={styleObject} onLoad={(preset) => void} />
```
Saves only `PRESET_FIELDS` fields (not `styleType` or drag coords). Upserts by name. One-click confirm on delete.
`StyleHint` shows font abbreviation + position code on row hover.

### ExportPanel
```jsx
<ExportPanel activeIndex={number} totalCards={number} orderedRefs={Array} cards={Array} />
```
Buttons: **Download Card** (active card PNG) · **Download All** (ZIP) · **Copy** (clipboard).
ZIP skips cards with no `imageUrl`; toast shows `"N saved · M skipped"`.
Clipboard requires `window.isSecureContext` (HTTPS / localhost).

---

## Hooks

### useExport
```js
const { exportCard, exportAll, clipboardCopy } = useExport()
exportCard(ref, cardIndex)                       // → saves card_0N.png
exportAll(refs, cards, onProgress?)              // → saves carousel_YYYY-MM-DD.zip; returns { skipped }
clipboardCopy(ref)                               // → throws 'HTTPS_REQUIRED' on non-secure context
```

### useUnsplash
```js
const { images, loading, error, search } = useUnsplash()
// Auth: Authorization: Client-ID <VITE_UNSPLASH_ACCESS_KEY>
// Returns: [{ id, urls: { full, small }, user: { name } }]
// getFullUrl → urls.full; getThumbUrl → urls.small
```

### usePexels
```js
const { photos, loading, error, search, clear } = usePexels()
// Auth: Authorization: <VITE_PEXELS_API_KEY>  (no "Client-ID" prefix)
// Returns: [{ id, src: { large2x, medium }, photographer }]
// large2x → export quality; medium → thumbnail
```

### usePixabay
```js
const { photos, loading, error, search, clear } = usePixabay()
// Auth: key=<VITE_PIXABAY_API_KEY> query param (not a header)
// Returns: [{ id, largeImageURL, webformatURL, user }]
// largeImageURL → export quality (~1280px); webformatURL → thumbnail (~640px)
```

### usePresets
```js
const { presets, savePreset, deletePreset } = usePresets()
// Storage key: 'carouselcraft_presets' (localStorage)
// savePreset(name, styleData) — upserts by name
// deletePreset(name)
```

---

## App State (App.jsx)
```js
cards[]               // { id, isCover, data }[] — max 10
activeCardId          // synced to globalStyle via useEffect on change
globalStyle           // mirrors active card's style; drives left sidebar StylePanel
isDark                // dark/light editor shell
watermark             // { url, position, size, opacity } | null — global
showSlideIndicator    // boolean
indicatorPosition     // string
```
**Undo/redo**: 50-deep history stack, debounced 700 ms (`scheduleHistory`).
**Keyboard**: `Cmd/Ctrl+E` export active · `Cmd/Ctrl+Z` undo · `Cmd/Ctrl+Shift+Z` redo.
**Apply to all**: after a style change via the left sidebar, a prompt appears for 700 ms offering to apply to all cards. Drag-text updates (`handleTextDrag`) do NOT trigger this prompt.

---

## Canvas Helpers (canvasHelpers.js)
| Function | Returns |
|---|---|
| `getTextPosition(position, w, h)` | `{ x, y, textAlign }` for any of 9 positions |
| `wrapText(text, maxWidth, fontSize, fontFamily)` | `string[]` of wrapped lines |
| `applyOverlay(opacity)` | `rgba(0,0,0,…)` clamped 0–0.7 |
| `analyzeImagePlacement(imageUrl, styleType)` | `Promise<{ textPosition, subtitlePosition }>` — pixel-sampling fallback: samples 48×48, finds darkest 3×3 cell |
| `generateGrainCanvas(intensity)` | 256×256 `HTMLCanvasElement` with random luminance noise |

---

## Claude Vision (claudeVision.js)

```js
analyzeImageWithClaude(imageUrl, styleType)
// → Promise<{ textPosition, subtitlePosition }>
```

Called automatically when the user selects a background image in `CardEditor`.

**Model**: `claude-sonnet-4-6` — significantly better spatial reasoning than Haiku.

**Prompt strategy**: role-primes as an Instagram carousel designer, explains the 3×3 grid with named cells, specifies ideal regions (dark/uniform/blurred/negative space) and regions to avoid (faces, main subject, busy textures, bright areas).

**Style-aware prompting**:
- `SPLIT` — asks for two positions (top block + bottom block in different columns)
- `HEADLINE` / `SUBTITLE` — asks for headline position + secondary subtitle position
- `MIXED` — asks for one position only

**Deduplication**: if Claude returns the same position for both text + subtitle, the subtitle is automatically set to the opposite corner (via `OPPOSITE` map).

**Cache**: result is stored in `sessionStorage` keyed by `cv:<styleType>:<imageUrl[:120]>`. Re-selecting the same image is instant and costs no API tokens.

**Fallback**: any error (missing key, network failure, malformed JSON) silently falls back to `analyzeImagePlacement()` pixel-sampling.

---

## API Keys (.env)
```
VITE_UNSPLASH_ACCESS_KEY=...
VITE_PEXELS_API_KEY=...
VITE_PIXABAY_API_KEY=...       # free key at pixabay.com/api/docs/
VITE_ANTHROPIC_API_KEY=...     # optional — enables Claude Vision text placement
```
All three image search hooks show an inline `KeyMissingBanner` when the key is absent.
`VITE_ANTHROPIC_API_KEY` is optional — when absent, text placement falls back to pixel-sampling.
Restart `npm run dev` after editing `.env` — Vite only reads it at startup.

---

## Running Locally
```powershell
cd "d:\office work\projects\kshitij posting\carouselcraft"
npm install
npm run dev
```
Must `cd carouselcraft` first — running `npm run dev` from the parent folder will fail.
