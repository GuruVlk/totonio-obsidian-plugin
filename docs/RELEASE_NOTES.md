# Totonio Presentation 0.1.10

Architecture and sequence diagrams alongside your notes. Create in Totonio, present in Obsidian.

## Automatic Fit and Faster Pinch Zoom

- Diagrams without Presentation Frames now automatically fit the whole diagram on opening, using the same calculation as **Fit content**.
- Initially hidden panes defer that first fit until they have a usable size. Later free-view resizes preserve manual pan and zoom; empty diagrams retain their saved viewport.
- **Reset view** still restores the document's saved viewport. Documents with frames still start at Frame 1, fitted to the pane.
- Trackpad pinch zoom, including MacBook trackpads, now uses twice the previous sensitivity in both directions while preserving the point under the cursor and existing zoom limits.
- Ordinary wheel zoom, Shift+wheel pan, and touch-screen pinch sensitivity are unchanged.
- Presentation glide, tag filtering, Markdown previews, the Green Tea demo, and read-only file handling are preserved. No document or format changes are required.

The release workflow runs lint, unit/integration tests, browser tests, and build verification before publishing the three installation files with GitHub provenance attestations.

## Update

In Obsidian, open Settings > Community plugins, check for updates, and update Totonio Presentation to 0.1.10 when available. The plugin does not install or update itself. The Community directory may need time to detect and review this release.

## Included

- Native, offline, read-only viewing of local version 3 `.totonio` files.
- Shapes, nested containers, connectors and arrowheads, labels, embedded images, and corner icons.
- Ordered Presentation Frames with keyboard/button navigation, pane fitting, and dimmed surroundings.
- Free-view pan/zoom, saved viewport restoration, Reset view, and Fit content.
- Static Markdown previews that open the full presentation viewer.
- Illustrated plugin information, author credit, and optional support link.
- Open in Totonio opens the web app in your browser without transferring the file or its path.

## Requirements and Limits

- Obsidian 1.12.7 or newer.
- Only `format: "totonio"`, `version: 3`. Legacy `.tatamio` and version 1/2 files are not supported or migrated.
- This plugin filters existing document tags but does not edit tags or integrate them with Obsidian note tags. File editing and PlantUML/Mermaid script import remain web-app workflows.
- The handoff to the web editor is manual; there is no automatic file transfer or save-back bridge.
- Native Android/iOS host verification is not yet recorded; browser tests do not replace native host verification. See the manual checklist.

## Installation

For a manual install, place the three attached files (`main.js`, `manifest.json`, and `styles.css`) in `.obsidian/plugins/totonio-presentation/`, restart Obsidian, and enable Totonio Presentation. Images and license notices are included in the JavaScript bundle.

Earlier local builds used the ID `totonio-obsidian`. Disable that test plugin and remove its plugin folder before installing this release to avoid duplicate extension registration. No diagram needs to be changed.

Publishing this GitHub release does not by itself add the plugin to Obsidian's Community directory. Directory submission and review are separate.
