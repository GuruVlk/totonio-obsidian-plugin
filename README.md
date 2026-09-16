# totonio-obsidian

An offline, read-only Totonio Presentation viewer in a native Obsidian workspace tab. Supports only `.totonio` documents with `format: "totonio"` and `version: 3`.

## Build and Install

Requires Node.js 22.15 or newer and Obsidian 1.5 or newer.

```sh
npm ci
npm run build
```

Create `.obsidian/plugins/totonio-obsidian/` inside a test vault and place these build files in it:

- `main.js`
- `manifest.json`
- `styles.css`
- `THIRD_PARTY_NOTICES.md` (retain when redistributing)

Reload Obsidian and enable **Totonio Presentation** in Settings > Community plugins. Click a `.totonio` file in the vault's file explorer. The file opens in the native Totonio Presentation tab; there is no web server, iframe, or connection to the Totonio web app.

The repository directory can have any name. The plugin installation directory and manifest ID are `totonio-obsidian`.

## Viewing

- Documents with frames start at the first frame in ascending `frameOrder`. Equal orders preserve document order. Previous/next buttons and Left/Right or Page Up/Page Down step through frames, wrapping at either end.
- The active frame is fitted to the actual pane with 32px padding; content outside it is dimmed. Pane resizing refits that frame.
- Escape or the Free view button stops playback and restores the parked free-view viewport. Start frames begins playback again.
- Frameless documents open at their exact saved `viewport`, not an automatically fitted view.
- In free view, drag to pan and use the wheel or pinch to zoom. Shift+wheel pans. Reset view restores the saved viewport; Fit content fits visible diagram content, including overflowing descendants and connector labels.
- Touch supports one-finger pan and two-finger pinch in free view. Keyboard navigation is scoped to the focused viewer, not the rest of Obsidian.

The plugin has no selection, edit handles, editor panels, menus, drag/drop import, undo history, export, or save actions. Geometry and viewport changes exist only in memory. It uses `Vault.read`, never a vault write API, and does not use browser storage or persist plugin settings. It refreshes a view when the source is changed by something else.

## Markdown Embeds

Use one vault-relative path in a fenced block:

````markdown
```totonio
path/to/diagram.totonio
```
````

The compact static preview shows the first frame, or fits content for a frameless file. Click it, or focus it and press Enter/Space, to open the full native viewer. The code block is not rewritten. Exact vault-root paths take precedence; Obsidian's link resolver supplies note-relative resolution. URLs, absolute paths, multiple lines, and `.tatamio` files are rejected.

Copy the `examples` folder into a test vault to try `Presentation.totonio`, `Free-view.totonio`, and `Preview.md`. These are v3 documents generated from the test fixture. `npm run fixtures` regenerates only those repository examples, never a user's vault.

## Compatibility and Safety

All 18 current shape kinds are parsed: rectangles, brackets, arrows, circles, decisions, clouds, people, panels, cylinders, database icons, firewalls, legends, images, lines, connectors, text, frames, and groups. Rendering preserves hierarchy, page-space coordinates, rotation, fill/stroke styles, corners, text formatting, routing, arrowheads, labels, embedded images, and supported corner icons.

- Legacy versions 1/2, `.tatamio`, unknown formats/versions, malformed JSON, invalid references, and malformed fields produce an in-pane error. No migration is performed.
- Embedded PNG, JPEG, WebP, GIF, and SVG data URLs are supported within Totonio's original asset size limit. Remote images are rejected. SVG assets render only through isolated SVG `image` elements, never as injected markup. Markdown links in labels are displayed but inert.
- The diagram retains Totonio's light canvas and default diagram colors in both Obsidian themes. Controls follow Obsidian theme variables. Text uses Totonio's local font fallbacks; no fonts are downloaded.
- Presentation frames use their saved rectangles. `frameFitContent` and editor auto-resize metadata do not mutate saved geometry. The editing grid is not shown.
- To bound untrusted input, the viewer rejects JSON strings over 64 MiB, more than 10,000 shapes, and reference chains over 128 levels. Extremely dense diagrams can still be expensive to render.

## Verification

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

On macOS the browser suite automatically uses installed Google Chrome in a temporary test profile if available. `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` selects Chrome explicitly on other platforms. No existing browser profile is used. The harness owns port 4189 only while its tests run and refuses to reuse an existing server.

Unit/integration tests cover strict v3 loading, legacy rejection, hierarchy, connector geometry, image assets, saved viewport, frame ordering/fitting/navigation, Obsidian registration, embed opening, invalid files, asynchronous teardown, and a vault stub that throws on every write. Playwright covers desktop/mobile screenshots and pixel checks, visible arrowheads, decoded assets, frame controls, keyboard scope, pan/zoom, resize, static embeds, and offline SVG isolation.

The browser suite exercises the production renderer with an Obsidian-shaped pane; unit tests stub the Obsidian host. These do **not** replace testing inside the Obsidian application. Follow [the manual verification checklist](docs/MANUAL_VERIFICATION.md) before release.

## Architecture

- `src/main.ts`: Obsidian `FileView`, Markdown processor, vault reads, lifecycle cleanup.
- `src/document.ts`: strict extension/version boundary and structural safety checks.
- `src/core/`: dependency-trimmed local snapshot of Totonio's neutral parsing, geometry, routing, and text algorithms.
- `src/render.ts`: native SVG DOM renderer; no React application or editor chrome.
- `src/presentation.ts`: pane-sized frame fitting and in-memory viewport state.
- `src/viewer.ts`: controls, scoped keyboard input, pointer gestures, preview mode, and resize cleanup.

See [port provenance](docs/PORTING.md) for source modules and intentional differences, and [third-party notices](THIRD_PARTY_NOTICES.md) for template/icon licensing. No blanket license for the supplied Totonio source is inferred by this repository; confirm redistribution rights before publishing it.
