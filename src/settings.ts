import { PluginSettingTab } from 'obsidian';
import type { App, Plugin } from 'obsidian';
import { renderInfo } from './info';

export class TotonioInfoTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: Plugin) { super(app, plugin); }

  display(): void {
    renderInfo(this.containerEl, this.plugin.manifest.version);
  }
}