# Totonio Presentation 0.1.18

Architecture and sequence diagrams alongside your notes. Create in Totonio, present in Obsidian.

## Copy a Diagram from the Right-click Menu

- Right-click a diagram, in its tab or in a Markdown preview, to choose **Copy as JSON** or **Copy as PNG**. On touch screens that open the context menu with a long press, the same menu appears.
- **Copy as JSON** copies the saved `.totonio` file text exactly, ready to paste into Totonio's Import > JSON from clipboard or anywhere else.
- **Copy as PNG** copies a picture of the whole diagram on Totonio's canvas colour, drawn the same way as the web app's PNG export: at twice the size, with embedded images and icons, and without Presentation Frame outlines. Very large diagrams are scaled down to stay within device limits.
- Both always copy the whole diagram, whatever frame, zoom or tag filter you are looking at. A notice confirms the copy or explains why it failed. Nothing is written to your vault, and nothing leaves your device.

The release workflow runs lint, unit/integration tests, browser tests, and build verification before publishing the three installation files with GitHub provenance attestations.

## Update

In Obsidian, open Settings > Community plugins, check for updates, and update Totonio Presentation to 0.1.18 when available. The plugin does not install or update itself. The Community directory may need time to detect and review this release.

## Included

- Native, offline, read-only viewing of local version 3 `.totonio` files.
- Shapes, nested containers, connectors and arrowheads, labels, embedded images, and corner icons.
- Ordered Presentation Frames with keyboard/button navigation, pane fitting, and dimmed surroundings.
- Free-view pan/zoom, saved viewport restoration, Reset view, and Fit content.
- Object notes shown as plain text on mouse or pen hover, with a per-view toggle.
- A right-click menu that copies the whole diagram as its saved JSON or as a PNG picture.
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
