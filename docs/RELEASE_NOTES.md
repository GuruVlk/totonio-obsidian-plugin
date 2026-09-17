# Totonio Presentation 0.1.2

Architecture and sequence diagrams alongside your notes. Create in Totonio, present in Obsidian.

## Totonio Presentation Glide

- Frame navigation now uses Totonio's exact 840 ms glide, with cubic easing and geometric zoom interpolation.
- Rapid navigation redirects from the currently displayed camera position instead of jumping or queuing transitions.
- A wind-icon toggle enables instant navigation for the current view. System Reduce Motion overrides glide automatically, including changes made during a transition.
- Escape, pane resizing, and view closure cancel animation cleanly. Frames remain fitted to the Obsidian pane; initial file opening and Markdown previews are still instant.
- SVG shapes, text, and images stay mounted during animation. Only camera, mask, and zoom-dependent corner geometry are updated.
- The plugin remains offline and read-only. Glide preferences are in-memory only, with no vault or settings writes.

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
- This plugin does not edit files, import PlantUML/Mermaid scripts, or provide tag-filter controls. Those authoring workflows belong to the Totonio web app.
- The handoff to the web editor is manual; there is no automatic file transfer or save-back bridge.
- Mobile-sized browser tests pass. Native Android/iOS host verification is not yet recorded; see the manual checklist.

## Installation

For a manual install, place the three attached files (`main.js`, `manifest.json`, and `styles.css`) in `.obsidian/plugins/totonio-presentation/`, restart Obsidian, and enable Totonio Presentation. Images and license notices are included in the JavaScript bundle.

Earlier local builds used the ID `totonio-obsidian`. Disable that test plugin and remove its plugin folder before installing this release to avoid duplicate extension registration. No diagram needs to be changed.

Publishing this GitHub release does not by itself add the plugin to Obsidian's Community directory. Directory submission and review are separate.
