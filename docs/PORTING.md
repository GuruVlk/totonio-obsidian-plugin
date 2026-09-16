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

`src/render.ts` ports the read-only rendering branches of `canvas/CanvasScene.tsx` into SVG DOM calls. It uses the original geometry and label calculations, paints diagram objects in the original order, and places connector labels in a second pass. Invisible group shells and presentation-frame outlines are not painted. Shape coordinates remain absolute; hierarchy affects paint order, not nested SVG translations. Source sibling arrays paint back-to-front. Do not replace that ordering with ordinary array iteration.

The original `ShapeIcon.tsx` maps legend kinds to Lucide symbols. This plugin uses the corresponding locally bundled Lucide SVG nodes without React. Only the icons actually used are bundled.

The source's `hooks/usePresentationMode.ts` frame fitting, ordering in `App.tsx`, and frame dimming branch in `CanvasScene.tsx` inform `presentation.ts` and `viewer.ts`. These files do not import either source component. Frame ordering is stable ascending `frameOrder`; stepping wraps; playback parks and restores a separate free viewport.

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

## Read-only Boundary

The plugin extends `FileView`, not `TextFileView`. Its only document-content operation is `Vault.read`. It reads metadata to resolve embed paths and listens to externally generated vault events. It never calls `modify`, `create`, `append`, `process`, `delete`, `rename`, adapter writes, or plugin settings storage. No editable web-app state is linked into the bundle.

The developer fixture script writes generated examples only inside this repository. It is not imported into the plugin. Tests use in-memory documents or their own files, never a user's vault.
