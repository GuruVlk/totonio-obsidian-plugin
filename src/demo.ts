import { ItemView } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';
import demo from './assets/green-tea.json';
import { loadDocument } from './document';
import { Viewer, showError } from './viewer';
import { showDiagramMenu } from './menu';

export const DEMO_VIEW_TYPE = 'totonio-demo';

export class TotonioDemoView extends ItemView {
  private viewer?: Viewer;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.contentEl.classList.add('totonio-view-content');
    this.register(() => this.clear());
  }

  getViewType(): string { return DEMO_VIEW_TYPE; }
  getDisplayText(): string { return 'Green tea - Totonio demo'; }
  getIcon(): string { return 'presentation'; }

  onOpen(): Promise<void> {
    this.clear();
    try {
      const json = JSON.stringify(demo, null, 2);
      const document = loadDocument(json, 'green-tea.totonio');
      this.viewer = new Viewer(this.contentEl, document, { title: 'Green Tea',
        contextMenu: (event) => showDiagramMenu(event, json, document.shapes) });
    } catch (error) {
      showError(this.contentEl, error);
    }
    return Promise.resolve();
  }

  onResize(): void { this.viewer?.resize(); }
  onClose(): Promise<void> { this.clear(); return Promise.resolve(); }

  clear(): void {
    this.viewer?.dispose();
    this.viewer = undefined;
    this.contentEl.replaceChildren();
  }
}