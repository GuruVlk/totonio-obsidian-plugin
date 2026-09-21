# Totonio Presentation 0.1.7

Architecture and sequence diagrams alongside your notes. Create in Totonio, present in Obsidian.

## Community and Contact

- Added community and developer contact links above the support section in the plugin information page and README.
- [Join the Totonio Discord community](https://discord.com/invite/RTjs438j8) to discuss questions, ideas, and feedback.
- [Email totonio.app@gmail.com](mailto:totonio.app@gmail.com) to contact the developer directly.
- Links open only when clicked. The email link opens your mail app; it does not send a message automatically. Diagram rendering, commands, and file access are unchanged.

This text/link update was built locally. Automated tests and GitHub CI were intentionally skipped for this release; no new GitHub build-provenance attestation is provided. License notices remain embedded in the bundle.

## Update

In Obsidian, open Settings > Community plugins, check for updates, and update Totonio Presentation to 0.1.7 when available. The plugin does not install or update itself. The Community directory may need time to detect and review this release.

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
- Previous releases passed mobile-sized browser tests; tests were not rerun for this text/link update. Native Android/iOS host verification is not yet recorded; see the manual checklist.

## Installation

For a manual install, place the three attached files (`main.js`, `manifest.json`, and `styles.css`) in `.obsidian/plugins/totonio-presentation/`, restart Obsidian, and enable Totonio Presentation. Images and license notices are included in the JavaScript bundle.

Earlier local builds used the ID `totonio-obsidian`. Disable that test plugin and remove its plugin folder before installing this release to avoid duplicate extension registration. No diagram needs to be changed.

Publishing this GitHub release does not by itself add the plugin to Obsidian's Community directory. Directory submission and review are separate.
