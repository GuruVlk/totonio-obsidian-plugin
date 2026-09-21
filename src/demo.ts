import { ItemView } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';
import demo from './assets/green-tea.json';
import { loadDocument } from './document';
import { Viewer, showError } from './viewer';

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
      this.viewer = new Viewer(this.contentEl, loadDocument(JSON.stringify(demo), 'green-tea.totonio'), { title: 'Green Tea' });
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