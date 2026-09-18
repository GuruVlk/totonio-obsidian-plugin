# Source and Porting Notes

## Template

The repository starts from Obsidian's official TypeScript sample-plugin structure:
[Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin)

The package/manifest layout, TypeScript strict checking, CommonJS esbuild output, externalized Obsidian/Electron/CodeMirror dependencies, development watch mode, and root `main.js` build follow that template, inspected on 2026-09-16. Sample settings, notices, commands, ribbon actions, and save logic were omitted because this plugin is a read-only file viewer. The sample's license is retained in the third-party notices.

## Totonio Snapshot

Source: the supplied local `InfiniteCanvas` working tree, inspected on 2026-09-16. Its HEAD at snapshot time was `91bcf7fbeb8194d394ece5b646e0d62ac7ff893f`. The snapshot reflects the supplied working files, not a claim that the tree was pristine.

The checked-in modules under `src/core` are self-contained. Neither installation, build, tests, nor runtime require access to `InfiniteCanvas`. The optional `scripts/port-core.mjs` uses TypeScript's symbol graph to select declarations and their transitive dependencies from a source checkout. It prunes imports and emits only the required local modules. It is not part of normal builds:

```sh
node scripts/port-core.mjs /path/to/InfiniteCanvas
npm run lint
npm test
npm run test:e2e
```

Review any regenerated snapshot as a source update, including its v3-only parser adaptations. The script also copies two original v2 examples into legacy rejection fixtures. Those files remain unchanged; they are deliberately not migrated.

| Original module | Retained purpose |
| --- | --- |
| `canvas/document.ts` | Current shape/field validation, embedded asset validation/resolution, duplicate/missing reference checks, parent-cycle detection, conversion into render state. |
| `canvas/types.ts` | Renderable shapes, endpoints, styles, padding, text and viewport data types. |
| `canvas/geometry.ts` | Shape/visual bounds, rotation-aware attachment geometry, normalized v3 border positions, straight/orthogonal/curved route points, parallel shafts, hierarchical paint order. |
| `canvas/shapePaths.ts` | Rounded diamonds, clouds, arrows, brackets, cylinders and panel header paths. |
| `canvas/shapeRegistry.ts` | Geometry dispatch and source shape/container defaults required by layout. Metadata does not create editing UI. |
| `canvas/appearance.ts` | Text sizes and layout, wrapping, justification, panel/legend layout, corner icon placement, person/database/firewall geometry, stroke patterns. |
| `canvas/markdown.ts` | Totonio's own inline/block Markdown text model, including styled runs, lists, headings, code, tables and rules. |
| `canvas/connectorRouting.ts` | Route segments, shaft trimming, gaps around labels, arrowhead placement along routed connectors. |
| `canvas/connectorLabels.ts` | Label bounds, wrapping, position and rotation along connector routes. |
| `canvas/arrowheads.ts` | Arrow geometry, including short segments and start/end/both directions. |
| `canvas/model.ts` | WeakMap-backed ID/child lookup only; no editor state operations. |
| `canvas/colors.ts`, `canvas/tags.ts` | Color validation and tag normalization dependencies of the document parser. |

## Carefully Ported Behavior

The `simple-orthogonal` extension to document version 3 was first implemented from a supplied routing specification (2026-09-17) and is now a verbatim port of the web app's `facingCorridorRoute`, `bentSimpleRoute`, `simpleRouteFirstAxis` and `simpleOrthogonalRoutePoints` as inspected on 2026-09-17 and 2026-09-18 (web commits `3ce44b8`, `adfd194` and the single-bend rail commit that followed). `bentSimpleRoute` (0.1.5) is the one-corner case between two attachments: `routeOffset` moves the leg arriving at the end along the first leg's axis and a third leg carries the route back to its end; with no offset the fourth point coincides with the end and the route is the plain corner. Ends that already line up ignore the offset. It uses resolved endpoints and the shared `attachmentSide` classification, meets two facing shape attachments on a rail halfway between their borders, and slides that rail by `routeOffset` clamped so a 12-unit leg (the shared corner clearance) remains on each side. Otherwise each leg takes one bend and the next leg sets off across the direction the previous one arrived from, which is what the web app does; the earlier rule of flipping after every leg is gone. Obstacles are ignored and the 12-unit corner rounding and connector SVG renderer are shared. Line targets do not supply a shape-border side.

`attachmentSide` compares the offsets from the centre normalized by the shape's half-width and half-height, the edge a ray from the centre through the point would hit, so a point far along the long side of a wide shape is classified by that side rather than by the nearer end. This affects both `orthogonal` and `simple-orthogonal` routes and mirrors the web app's fix of the same date. The focused `tests/simpleOrthogonal.test.ts` expectations were cross-checked against the web source.

`src/render.ts` ports the read-only rendering branches of `canvas/CanvasScene.tsx` into SVG DOM calls. It uses the original geometry and label calculations, paints diagram objects in the original order, and places connector labels in a second pass. Invisible group shells and presentation-frame outlines are not painted. Shape coordinates remain absolute; hierarchy affects paint order, not nested SVG translations. Source sibling arrays paint back-to-front. Do not replace that ordering with ordinary array iteration.

The original `ShapeIcon.tsx` maps legend kinds to Lucide symbols. This plugin uses the corresponding locally bundled Lucide SVG nodes without React. Only the icons actually used are bundled.

The source's `hooks/usePresentationMode.ts` frame fitting, ordering in `App.tsx`, and frame dimming branch in `CanvasScene.tsx` inform `presentation.ts` and `viewer.ts`. These files do not import either source component. Frame ordering is stable ascending `frameOrder`; stepping wraps; playback parks and restores a separate free viewport.

As of 0.1.2, `src/viewTween.ts` ports the exact `canvas/viewTween.ts` algorithm inspected on 2026-09-17: 840 ms duration, cubic ease-in/ease-out, and geometric zoom interpolation. Only local variable names and formatting differ. The viewer's animation loop follows `usePresentationMode.ts`: capture the displayed camera at navigation time, cancel an earlier transition, request animation frames, and settle at the exact target. The active frame changes immediately and its dimming mask follows the moving camera; it is not a crossfade or a separately interpolated mask.

Animation uses the owning window's clock, media query, and animation callbacks for pop-out compatibility. System reduced motion disables it, including when that preference changes during a transition. Escape, real pane resizing, and disposal cancel callbacks. A per-view wind-icon toggle permits instant transitions without writing settings. Unlike the web app's user-initiated entry, opening a file initially fits Frame 1 immediately; subsequent frame navigation and starting playback from free view glide.

The plugin keeps SVG shape, label, and image nodes alive while zoom changes. Rendering builds a list of updates for screen-sized corners, rounded diamonds, and panel headers; each animation tick changes those attributes, the camera transform, and the frame mask rather than rebuilding the SVG tree. Renderer parity tests compare incremental zoom with a fresh render, and deterministic animation tests check the 840 ms timeline and cancellation. Geometry remains unchanged in the document.

Fit content follows the visual-bounds principle in `canvas/fitSelection.ts`: exclude invisible group/frame shells, include every descendant even when it overflows its parent, and include connector label/arrow bounds.

## Intentional Differences

- Parser format/version checks accept only `totonio`/3. Serialization, legacy format names, border migration, edit signatures, document storage keys, and document-writing helpers are absent.
- The plugin adds extension checks, explicit errors, bounded input/reference limits, and rejects cyclic connector dependencies or parents that cannot contain children.
- Frame viewports use the actual pane's measured size, not `window.innerWidth/innerHeight`. Padding is 32px (shrinking in tiny panes), with no source 0.2 minimum-zoom clamp that would clip large frames.
- Saved frame geometry is trusted; editor frame auto-resize/auto-nesting/auto-fit operations never run. A document with no frames starts at its exact saved viewport.
- Rendering uses DOM construction and `textContent`, not string-injected SVG/HTML. Data URLs are admitted only by the original embedded-image validator. SVG assets stay in browser-isolated image contexts. Label links are inert.
- Presentation has no grid, edit hit targets, selection/resize/rotation handles, ports, diff overlays, menus, document tabs, Properties/Structure panels, drag/drop, editor shortcuts, storage, export, or save lifecycle.
- Theme-native controls surround the original light diagram palette. Only installed local fonts are used, so glyph metrics can differ by platform just as with Totonio's browser fallbacks.
- Markdown previews are static and independently sized. Frameless previews fit content; full tabs retain the saved viewport. Each preview owns and disposes its own resize observer and handlers.

## Information Page Artwork

The plugin settings information page retains the original `src/assets/tanuki.webp` from Totonio's welcome dialog as branding. Its only feature illustration is `src/assets/diagram-view.png`, captured from the production plugin viewer in the local browser test harness on 2026-09-16. It shows the sample diagram and the actual read-only presentation controls, not web-app editing tools. Regenerate it by running the desktop Playwright test named "renders a nonblank presentation" and copying its `presentation.png` output to that asset path. This is a viewer capture, not a screenshot of the Obsidian application chrome. The older hint-card snapshots and their optional port script are not used by the information page. esbuild bundles the local artwork as data URLs, so installation still requires only the original three plugin files.

The support destination is reused from `src/components/SupportLink.tsx`: `https://www.buymeacoffee.com/vladimirplk`. It is an ordinary opt-in external link, not an embedded third-party widget. No settings or vault files are written by the information page.

## Read-only Boundary

The plugin extends `FileView`, not `TextFileView`. Its only document-content operation is `Vault.read`. It reads metadata to resolve embed paths and listens to externally generated vault events. It never calls `modify`, `create`, `append`, `process`, `delete`, `rename`, adapter writes, or plugin settings storage. No editable web-app state is linked into the bundle.

The developer fixture script writes generated examples only inside this repository. It is not imported into the plugin. Tests use in-memory documents or their own files, never a user's vault.
