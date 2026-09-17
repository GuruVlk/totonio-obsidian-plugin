# Manual Obsidian Verification

Use a disposable vault and a built plugin. These application-host checks remain unchecked until performed in Obsidian; browser-harness tests do not certify them.

## Setup

- [ ] Run `npm ci`, `npm run build`, `npm test`, and `npm run test:e2e` successfully.
- [ ] Install `main.js`, `manifest.json`, and `styles.css` in `.obsidian/plugins/totonio-presentation/` and enable Totonio Presentation. Disable and remove the old `totonio-obsidian` test plugin first if present.
- [ ] Open Settings > Totonio Presentation. Confirm the information page shows the welcome tanuki, the plugin's actual diagram-view screenshot (no editor hint illustrations), version, usage guide, and Buy me a coffee bar. Artwork must load offline; only clicking the support link opens the browser.
- [ ] Copy the repository's `examples` folder into the test vault root.
- [ ] Record a SHA-256 hash, file size, and modification time of both sample `.totonio` files before viewing them. On macOS use `shasum -a 256 examples/*.totonio` and `stat -f '%N %z %m' examples/*.totonio` in the test vault.

## Native File View

- [ ] Click `examples/Presentation.totonio` in Obsidian's file explorer. It opens in a workspace tab, not a browser or editor.
- [ ] Confirm the first displayed frame is System overview even though the second frame appears earlier in the JSON array.
- [ ] Confirm shapes, nested containers, text, header/body formatting, fills, borders, icons, images, connector labels, shafts, and arrowheads are visible.
- [ ] Confirm the area outside the active frame is dimmed and frame editing outlines are absent.
- [ ] Navigate with previous/next buttons; test wrapping from first to last and last to first.
- [ ] Confirm frame changes use Totonio's 840 ms glide. Test rapid next/previous presses mid-transition, transitions between differently sized frames, and the wind-icon toggle for instant changes.
- [ ] Enable system Reduce Motion before opening the viewer and while a glide is running. Navigation should be instant and the glide toggle disabled. Disable Reduce Motion again and confirm glide is available.
- [ ] Resize or close a pane mid-glide and press Escape mid-glide. No stale camera updates should occur. Test a pop-out window and a large image-heavy diagram for smoothness.
- [ ] Focus the viewer and navigate using Left, Right, Page Up, and Page Down. These keys must not move frames while focus is in a different Markdown editor pane.
- [ ] Press Escape or Free view. The original free viewport returns, and dimming disappears. Start frames restarts at Frame 1.
- [ ] Confirm there are no editing handles, selection, Properties, Structure, custom document tabs, import/export, editing menus, or undo/redo controls.

## Free View and Resize

- [ ] Open `examples/Free-view.totonio`. It starts at the saved viewport `{ x: 38, y: 54, zoom: 0.72 }` rather than fitting all content.
- [ ] Drag to pan. Zoom with the mouse wheel, trackpad pinch, and touch pinch where available. Shift+wheel pans.
- [ ] Reset view returns to the saved viewport. Fit content includes all visible content and labels.
- [ ] Resize the workspace pane, split it horizontally/vertically, collapse/reopen sidebars, and move the tab between panes. Frames refit; free view retains its current viewport.
- [ ] Test a narrow mobile-sized pane and a pop-out window. Controls must fit, pointer coordinates must remain correct, and no blank scene or stale observer should appear.
- [ ] Verify both Obsidian light and dark themes: theme-native controls, original Totonio diagram colors, readable text.

## Markdown Embeds

- [ ] Open `examples/Preview.md` in Reading view and Live Preview. Both blocks render compact static previews.
- [ ] Click a preview, then test Enter/Space while focused. The full native viewer opens; an already open matching tab is revealed instead of duplicated.
- [ ] Confirm the preview itself does not pan, zoom, select, or edit the document.
- [ ] Test paths with spaces, note-relative paths, two embeds in one note, and embeds in separate panes.
- [ ] Close the note and disable/re-enable the plugin while previews are open. No orphaned previews, event handlers, console errors, or late renders should remain.

## Failures and Offline Operation

- [ ] Open a disposable copy containing broken JSON. A clear error appears inside the pane.
- [ ] Test version 1, version 2, an unknown version, legacy `tatamio` format, missing assets, duplicate IDs, cyclic parents, invalid connector endpoints, and malformed fields. Each must fail without rewriting the source.
- [ ] A `.tatamio` extension must not register with this plugin; a code block pointing to it must show an unsupported-file error.
- [ ] Test a missing embed target and an unreadable file. The error stays inside the preview/tab.
- [ ] Disconnect networking, restart Obsidian, and open both files and embeds. Shapes, embedded images, icons, and text must still render.
- [ ] Watch network activity while viewing: no remote assets, fonts, scripts, telemetry, or Totonio services should be requested by the plugin.
- [ ] Modify a disposable source file externally while a viewer/preview is open. The content refreshes; an invalid update shows an error and a later valid update recovers.

## Source Integrity

- [ ] Repeat the opening, navigation, zoom, resize, embed, reset, fit, close, and reopen workflows. Compare SHA-256 hashes, sizes, and modification times against the original records. They must be identical unless you deliberately edited a disposable source externally.
- [ ] Confirm plugin operations did not create `data.json`, migrate a document, change the Markdown code block, or write any `.totonio` file.
- [ ] Open several tabs, then close them or disable the plugin during loading. Confirm no late content appears and no error is logged.

## Automated Evidence

The automated suite verifies strict loading, geometry, SVG rendering, a write-forbidden vault host, view registration, embed-to-tab opening, late-read cleanup, saved viewports, frame ordering/fitting, and browser interaction/pixel checks at desktop/mobile sizes. It runs against local snapshots and generated fixtures without the Totonio source checkout.

Record the actual Obsidian version, operating system, date, and any deviations here when completing this checklist.
