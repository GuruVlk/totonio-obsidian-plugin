import { PluginSettingTab, Setting } from 'obsidian';
import type { App, Plugin } from 'obsidian';
import { renderInfo } from './info';

export class TotonioInfoTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: Plugin) { super(app, plugin); }

  display(): void {
    this.renderInto(this.containerEl);
  }

  getSettingDefinitions() {
    return [{
      name: 'Presentation guide',
      desc: 'Read-only diagram viewing, frame navigation, Markdown embeds, compatibility, and support.',
      aliases: ['Totonio', 'frames', 'pan', 'zoom', 'embed', 'offline'],
      render: (setting: Setting) => {
        setting.settingEl.classList.add('totonio-info-setting');
        this.renderInto(setting.settingEl);
      },
    }];
  }

  private renderInto(containerEl: HTMLElement): void {
    renderInfo(containerEl, this.plugin.manifest.version, (container, title) => {
      new Setting(container).setName(title).setHeading();
    });
  }
}