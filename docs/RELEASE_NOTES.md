# Totonio Presentation 0.1.5

Architecture and sequence diagrams alongside your notes. Create in Totonio, present in Obsidian.

## Current Document Compatibility

- An Orthogonal connector (`simple-orthogonal`) with a single corner whose second leg the author dragged sideways in Totonio is now drawn where they left it: the leg stands clear of the corner and a third leg carries the route on to its end. Earlier plugin versions drew the plain corner and ignored the saved offset for this case.
- The 0.1.4 fixes remain: a rail dragged between two facing objects, hand-placed bends, and attachments far along the long side of a wide object all match the web app.
- Rounded and sharp corners, labels, arrowheads, and static Markdown previews are unchanged. Obstacles still do not affect the Orthogonal style.
- No document migration or format version bump is needed. The plugin remains offline and read-only, with the existing presentation glide preserved.

## Update

In Obsidian, open Settings > Community plugins, check for updates, and update Totonio Presentation to 0.1.5 when available. The plugin does not install or update itself. The Community directory may need time to detect and review this release.

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
