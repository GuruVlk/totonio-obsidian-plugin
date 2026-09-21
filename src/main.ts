import { FileView, MarkdownRenderChild, Plugin, TFile, normalizePath } from 'obsidian';
import type { App, WorkspaceLeaf } from 'obsidian';
import { loadDocument } from './document';
import { Viewer, showError } from './viewer';
import { TotonioInfoTab } from './settings';
import { DEMO_VIEW_TYPE, TotonioDemoView } from './demo';

export const VIEW_TYPE = 'totonio-presentation';

export class TotonioView extends FileView {
  private viewer?: Viewer;
  private generation = 0;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.contentEl.classList.add('totonio-view-content');
    this.register(() => this.clear());
    this.registerEvent(this.app.vault.on('modify', (file) => {
      if (file === this.file && file instanceof TFile) void this.onLoadFile(file);
    }));
  }

  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return this.file?.basename ?? 'Totonio Presentation'; }
  getIcon(): string { return 'presentation'; }
  canAcceptExtension(extension: string): boolean { return extension.toLowerCase() === 'totonio'; }

  async onLoadFile(file: TFile): Promise<void> {
    this.clear();
    const generation = this.generation;
    try {
      const json = await this.app.vault.read(file);
      if (generation !== this.generation) return;
      const document = loadDocument(json, file.path);
      this.viewer = new Viewer(this.contentEl, document, { title: file.basename });
    } catch (error) {
      if (generation === this.generation) showError(this.contentEl, error);
    }
  }

  async onUnloadFile(): Promise<void> { this.clear(); }
  onResize(): void { this.viewer?.resize(); }

  clear(): void {
    this.generation++;
    this.viewer?.dispose();
    this.viewer = undefined;
    this.contentEl.replaceChildren();
  }
}

export function resolveEmbed(app: App, source: string, sourcePath: string): TFile {
  const path = source.trim();
  if (!path || /[\r\n]/.test(path)) throw new Error('A totonio code block must contain one vault-relative .totonio path.');
  if (!path.toLowerCase().endsWith('.totonio')) throw new Error('Only .totonio files are supported in previews.');
  if (/^[a-z][a-z\d+.-]*:|^[/\\]|\\/i.test(path)) throw new Error('Use a local vault-relative path, not a URL or absolute path.');
  const file = app.vault.getAbstractFileByPath(normalizePath(path)) ?? app.metadataCache.getFirstLinkpathDest(path, sourcePath);
  if (!(file instanceof TFile) || file.extension.toLowerCase() !== 'totonio') throw new Error(`Totonio file not found in this vault: ${path}`);
  return file;
}

export class TotonioEmbed extends MarkdownRenderChild {
  private viewer?: Viewer;
  private generation = 0;
  private file?: TFile;

  constructor(container: HTMLElement, private readonly app: App, private readonly source: string,
    private readonly sourcePath: string, private readonly open: (file: TFile) => Promise<void>,
    private readonly detached?: () => void) {
    super(container);
  }

  onload(): void {
    this.registerEvent(this.app.vault.on('modify', (file) => { if (file === this.file) void this.render(); }));
    this.registerEvent(this.app.vault.on('delete', (file) => { if (file === this.file) void this.render(); }));
    this.registerEvent(this.app.vault.on('rename', (file) => { if (file === this.file) void this.render(); }));
    void this.render();
  }

  async render(): Promise<void> {
    const generation = ++this.generation;
    this.viewer?.dispose();
    this.viewer = undefined;
    try {
      const file = resolveEmbed(this.app, this.source, this.sourcePath);
      this.file = file;
      const json = await this.app.vault.read(file);
      if (generation !== this.generation) return;
      this.viewer = new Viewer(this.containerEl, loadDocument(json, file.path), {
        preview: true, title: file.basename,
        open: () => { void this.open(file).catch((error: unknown) => {
          if (generation === this.generation) showError(this.containerEl, error);
        }); },
      });
    } catch (error) {
      if (generation === this.generation) showError(this.containerEl, error);
    }
  }

  onunload(): void {
    this.generation++;
    this.viewer?.dispose();
    this.viewer = undefined;
    this.detached?.();
  }
}

export default class TotonioPlugin extends Plugin {
  private readonly embeds = new Set<TotonioEmbed>();

  onload(): void {
    this.addSettingTab(new TotonioInfoTab(this.app, this));
    this.registerView(VIEW_TYPE, (leaf) => new TotonioView(leaf));
    this.registerView(DEMO_VIEW_TYPE, (leaf) => new TotonioDemoView(leaf));
    this.addCommand({ id: 'open-demo-graph', name: 'Open demo graph', callback: () => this.openDemo() });
    this.addCommand({ id: 'open-web-editor', name: 'Open web editor', callback: () => {
      window.open('https://totonio.pages.dev/', '_blank', 'noopener,noreferrer');
    } });
    this.registerExtensions(['totonio'], VIEW_TYPE);
    this.registerMarkdownCodeBlockProcessor('totonio', (source, element, context) => {
      const child: TotonioEmbed = new TotonioEmbed(element, this.app, source, context.sourcePath,
        (file) => this.openPresentation(file), () => this.embeds.delete(child));
      this.embeds.add(child);
      context.addChild(child);
    });
    this.register(() => {
      for (const embed of this.embeds) embed.unload();
      this.embeds.clear();
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
        if (leaf.view instanceof TotonioView) leaf.view.clear();
      }
      for (const leaf of this.app.workspace.getLeavesOfType(DEMO_VIEW_TYPE)) {
        if (leaf.view instanceof TotonioDemoView) leaf.view.clear();
      }
    });
  }

  async openPresentation(file: TFile): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE)
      .find((leaf) => leaf.view instanceof TotonioView && leaf.view.file === file);
    if (existing) { await this.app.workspace.revealLeaf(existing); return; }
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({ type: VIEW_TYPE, state: { file: file.path }, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  async openDemo(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(DEMO_VIEW_TYPE)[0];
    if (existing) { await this.app.workspace.revealLeaf(existing); return; }
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({ type: DEMO_VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }
}