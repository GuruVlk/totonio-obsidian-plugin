import { PluginSettingTab, Setting } from 'obsidian';
import type { App, Plugin } from 'obsidian';
import { renderInfo } from './info';

export class TotonioInfoTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: Plugin) { super(app, plugin); }

  display(): void {
    renderInfo(this.containerEl, this.plugin.manifest.version, (container, title) => {
      new Setting(container).setName(title).setHeading();
    });
  }
}