# Totonio Presentation 0.1.9

Architecture and sequence diagrams alongside your notes. Create in Totonio, present in Obsidian.

## Focus with Document Tags

- The new **Filter by tag** toolbar menu lists existing document tags with counts, **Untagged**, and **Clear**.
- Select one or more tags to highlight matching objects. Non-matching shapes and connector labels fade to 16% opacity without changing diagram geometry or routes.
- **Keep untagged children** includes descendants of matching tagged containers/groups. **Keep untagged linking connectors** retains untagged connectors joining matching objects. Both options are enabled by default, matching Totonio's web viewer behavior.
- Filters work alongside frame navigation and glide. Escape closes the menu before exiting presentation. The menu supports keyboard navigation and scrolling in narrow panes.
- Each viewer keeps its own filter in memory. Same-file refreshes retain valid selections and drop missing tags; switching files or closing the view resets them.
- Static Markdown previews remain unfiltered, and **Fit content** still fits the whole diagram. No tags, vault files, or plugin settings are written.
- Existing connector-label improvements, Green Tea demo, Command Palette actions, and presentation controls are preserved.

The release workflow runs lint, unit/integration tests, browser tests, and build verification before publishing the three installation files with GitHub provenance attestations.

## Update

In Obsidian, open Settings > Community plugins, check for updates, and update Totonio Presentation to 0.1.9 when available. The plugin does not install or update itself. The Community directory may need time to detect and review this release.

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
