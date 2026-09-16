# Totonio Presentation 0.1.1

Architecture and sequence diagrams alongside your notes. Create in Totonio, present in Obsidian.

## Review Improvements

- Fixed parser type assertions and made route-point validation explicitly type-safe.
- Replaced native HTML creation calls with Obsidian helpers, retaining offline SVG rendering.
- Added searchable read-only presentation-guide definitions for Obsidian 1.13+, with the existing information page retained on 1.12.7.
- Reworded configuration-folder guidance to support custom vault configuration locations.
- Replaced CSS `!important` overrides with scoped selectors.
- Removed Node file-system detection from the Playwright configuration; browser selection is explicit.
- Added official Obsidian ESLint rules to local and CI verification.
- Releases are now built, tested, and attested in GitHub Actions. Only the three supported installation assets are attached; license notices remain in the bundle.

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
