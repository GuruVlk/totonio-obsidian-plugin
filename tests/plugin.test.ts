// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { App, MarkdownPostProcessorContext, WorkspaceLeaf } from 'obsidian';
import { sampleJson } from './fixture';

const host = vi.hoisted(() => {
  class Component {
    cleanups: Array<() => void> = [];
    onload(): void {}
    onunload(): void {}
    register(callback: () => void) { this.cleanups.push(callback); }
    registerEvent(event: { off: () => void }) { this.register(event.off); }
    load() { this.onload(); }
    unload() { this.onunload(); this.cleanups.splice(0).forEach((cleanup) => cleanup()); }
  }
  class TFile {
    basename: string;
    extension: string;
    constructor(public path: string) {
      this.basename = path.split('/').at(-1)!.replace(/\.[^.]+$/, '');
      this.extension = path.split('.').at(-1)!;
    }
  }
  return { Component, TFile };
});

vi.mock('obsidian', () => ({
  TFile: host.TFile,
  normalizePath: (path: string) => path.replace(/\/+/g, '/'),
  PluginSettingTab: class {
    containerEl = document.createElement('div');
  },
  Setting: class {
    private element: HTMLDivElement;
    constructor(container: HTMLElement) {
      this.element = document.createElement('div');
      container.appendChild(this.element);
    }
    setName(name: string) { this.element.textContent = name; return this; }
    setHeading() { this.element.className = 'setting-item-heading'; return this; }
  },
  FileView: class extends host.Component {
    app: App;
    contentEl = document.createElement('div');
    file: InstanceType<typeof host.TFile> | null = null;
    constructor(leaf: { app: App }) { super(); this.app = leaf.app; }
  },
  ItemView: class extends host.Component {
    contentEl = document.createElement('div');
  },
  MarkdownRenderChild: class extends host.Component {
    constructor(public containerEl: HTMLElement) { super(); }
  },
  Plugin: class extends host.Component {
    addCommand = vi.fn();
    addSettingTab = vi.fn();
    registerView = vi.fn();
    registerExtensions = vi.fn();
    registerMarkdownCodeBlockProcessor = vi.fn();
    constructor(public app: App, public manifest: { version: string }) { super(); }
  },
}));

import TotonioPlugin, { TotonioEmbed, TotonioView, VIEW_TYPE, resolveEmbed } from '../src/main';
import { DEMO_VIEW_TYPE, TotonioDemoView } from '../src/demo';

function createHost() {
  const file = new host.TFile('diagrams/sample.totonio');
  const listeners = new Map<string, Set<(file: unknown) => void>>();
  const write = vi.fn(() => { throw new Error('Vault writes are forbidden'); });
  const vault = {
    read: vi.fn(async () => sampleJson),
    getAbstractFileByPath: vi.fn((path: string) => path === file.path ? file : null),
    on: vi.fn((name: string, callback: (file: unknown) => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(callback);
      return { off: () => listeners.get(name)!.delete(callback) };
    }),
    modify: write, create: write, delete: write, rename: write, append: write, process: write, modifyBinary: write, createBinary: write,
    adapter: { write, writeBinary: write, remove: write, rename: write },
  };
  const leaf = { setViewState: vi.fn(async () => undefined) };
  const workspace = { getLeaf: vi.fn(() => leaf), getLeavesOfType: vi.fn(() => []), revealLeaf: vi.fn(async () => undefined) };
  const app = { vault, workspace, metadataCache: { getFirstLinkpathDest: vi.fn(() => file) } } as unknown as App;
  return { app, file: file as unknown as import('obsidian').TFile, vault, workspace, leaf, write, listeners };
}

beforeEach(() => { document.body.replaceChildren(); });

describe('read-only Obsidian integration', () => {
  it('registers commands and opens the bundled eight-frame demo without vault access', async () => {
    const { app, vault, write, workspace, leaf } = createHost();
    const plugin = new TotonioPlugin(app, {} as never);
    plugin.onload();
    const commands = vi.mocked(plugin.addCommand).mock.calls.map(([command]) => command);
    expect(commands.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 'open-demo-graph', name: 'Open demo graph' },
      { id: 'open-web-editor', name: 'Open web editor' },
    ]);
    await commands[0].callback?.();
    expect(leaf.setViewState).toHaveBeenCalledWith({ type: DEMO_VIEW_TYPE, active: true });
    expect(workspace.revealLeaf).toHaveBeenCalledWith(leaf);
    const factory = vi.mocked(plugin.registerView).mock.calls.find(([type]) => type === DEMO_VIEW_TYPE)![1];
    const view = factory({ app } as unknown as WorkspaceLeaf) as TotonioDemoView;
    await view.onOpen();
    expect(view.contentEl.querySelector('[role="alert"]')).toBeNull();
    expect(view.contentEl.querySelector('.totonio-frame-status')?.textContent).toContain('1 / 8');
    view.contentEl.querySelector<HTMLButtonElement>('[aria-label="Next frame"]')!.click();
    expect(view.contentEl.querySelector('.totonio-frame-status')?.textContent).toContain('2 / 8');
    view.onResize();
    await view.onClose();
    expect(view.contentEl.childElementCount).toBe(0);
    await view.onOpen();
    expect(view.contentEl.querySelector('.totonio-frame-status')?.textContent).toContain('1 / 8');
    view.unload();
    expect(view.contentEl.childElementCount).toBe(0);
    expect(vault.read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
  it('reveals an existing demo tab and opens only the editor website', async () => {
    const { app, workspace, leaf, write } = createHost();
    const plugin = new TotonioPlugin(app, {} as never);
    plugin.onload();
    vi.mocked(app.workspace.getLeavesOfType).mockReturnValue([leaf as unknown as WorkspaceLeaf]);
    await plugin.openDemo();
    expect(workspace.getLeaf).not.toHaveBeenCalled();
    expect(workspace.revealLeaf).toHaveBeenCalledWith(leaf);
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const command = vi.mocked(plugin.addCommand).mock.calls.find(([command]) => command.id === 'open-web-editor')![0];
    command.callback?.();
    expect(open).toHaveBeenCalledWith('https://totonio.pages.dev/', '_blank', 'noopener,noreferrer');
    expect(write).not.toHaveBeenCalled();
    open.mockRestore();
  });
  it('renders information sections using native settings headings', () => {
    const { app } = createHost();
    const plugin = new TotonioPlugin(app, { version: '0.1.0' } as never);
    plugin.onload();
    const tab = vi.mocked(plugin.addSettingTab).mock.calls[0][0];
    tab.display();
    expect(tab.containerEl.querySelectorAll('.setting-item-heading')).toHaveLength(6);
    expect(tab.containerEl.querySelector('h1, h2, h3')).toBeNull();
    expect(tab.containerEl.textContent).toContain('By GuruVlk');
    const definitions = tab.getSettingDefinitions();
    expect(definitions).toHaveLength(1);
    const definition = definitions[0];
    expect(definition).toMatchObject({ name: 'Presentation guide', aliases: expect.arrayContaining(['frames', 'embed']) });
    const settingEl = document.createElement('div');
    if ('render' in definition && definition.render) definition.render({ settingEl } as never, {} as never);
    expect(settingEl.querySelector('.totonio-info')).not.toBeNull();
    expect(settingEl.textContent).not.toContain('.obsidian');
    expect(settingEl.querySelector('input, select, textarea')).toBeNull();
  });
  it('registers only .totonio and a native file view and code block processor', () => {
    const { app } = createHost();
    const plugin = new TotonioPlugin(app, {} as never);
    plugin.onload();
    expect(plugin.addSettingTab).toHaveBeenCalledOnce();
    expect(plugin.registerView).toHaveBeenCalledWith(VIEW_TYPE, expect.any(Function));
    expect(plugin.registerExtensions).toHaveBeenCalledWith(['totonio'], VIEW_TYPE);
    expect(plugin.registerMarkdownCodeBlockProcessor).toHaveBeenCalledWith('totonio', expect.any(Function));
    const factory = vi.mocked(plugin.registerView).mock.calls[0][1];
    expect(factory({ app } as unknown as WorkspaceLeaf)).toBeInstanceOf(TotonioView);
  });
  it('opens files through Vault.read, navigates, resizes, and closes without writes', async () => {
    const { app, file, write, vault } = createHost();
    const view = new TotonioView({ app } as unknown as WorkspaceLeaf);
    view.file = file;
    document.body.appendChild(view.contentEl);
    const before = sampleJson;
    await view.onLoadFile(file);
    expect(vault.read).toHaveBeenCalledWith(file);
    expect(view.contentEl.querySelector('.totonio-frame-status')?.textContent).toContain('1 / 2');
    view.contentEl.querySelector<HTMLElement>('[aria-label="Next frame"]')!.click();
    expect(view.contentEl.querySelector('.totonio-frame-status')?.textContent).toContain('2 / 2');
    view.contentEl.querySelector('.totonio-viewer')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    view.contentEl.querySelector<HTMLElement>('[aria-label="Fit content"]')!.click();
    view.contentEl.querySelector<HTMLElement>('[aria-label="Reset view"]')!.click();
    view.onResize();
    await view.onUnloadFile();
    expect(view.contentEl.childElementCount).toBe(0);
    expect(sampleJson).toBe(before);
    expect(write).not.toHaveBeenCalled();
  });
  it('renders invalid files as in-pane errors', async () => {
    const { app, file, vault, write } = createHost();
    vault.read.mockResolvedValue('{');
    const view = new TotonioView({ app } as unknown as WorkspaceLeaf);
    await view.onLoadFile(file);
    expect(view.contentEl.querySelector('[role="alert"]')?.textContent).toContain('not valid JSON');
    expect(write).not.toHaveBeenCalled();
  });
  it('discards a late read after the file is unloaded', async () => {
    const { app, file, vault } = createHost();
    let finish!: (json: string) => void;
    vault.read.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const view = new TotonioView({ app } as unknown as WorkspaceLeaf);
    const pending = view.onLoadFile(file);
    await view.onUnloadFile();
    finish(sampleJson);
    await pending;
    expect(view.contentEl.childElementCount).toBe(0);
  });
  it('renders static embeds and opens a native tab on click', async () => {
    const { app, file, workspace, leaf, write } = createHost();
    const plugin = new TotonioPlugin(app, {} as never);
    const container = document.createElement('div');
    const embed = new TotonioEmbed(container, app, file.path, 'note.md', (target) => plugin.openPresentation(target));
    await embed.render();
    expect(container.querySelector('.totonio-toolbar')).toBeNull();
    expect(container.querySelectorAll('[data-shape-id]').length).toBeGreaterThan(10);
    container.querySelector<HTMLElement>('.totonio-preview')!.click();
    await Promise.resolve();
    expect(workspace.getLeaf).toHaveBeenCalledWith('tab');
    expect(leaf.setViewState).toHaveBeenCalledWith({ type: VIEW_TYPE, state: { file: file.path }, active: true });
    embed.onunload();
    expect(container.childElementCount).toBe(0);
    expect(write).not.toHaveBeenCalled();
  });
  it('attaches Markdown rendering to the context lifecycle', () => {
    const { app } = createHost();
    const plugin = new TotonioPlugin(app, {} as never);
    plugin.onload();
    const processor = vi.mocked(plugin.registerMarkdownCodeBlockProcessor).mock.calls[0][1];
    const addChild = vi.fn();
    processor('diagrams/sample.totonio', document.createElement('div'), { sourcePath: 'note.md', addChild } as unknown as MarkdownPostProcessorContext);
    expect(addChild).toHaveBeenCalledWith(expect.any(TotonioEmbed));
  });
  it('releases closed embeds and ignores late open failures', async () => {
    const { app, file } = createHost();
    const container = document.createElement('div');
    const detached = vi.fn();
    let reject!: (error: Error) => void;
    const embed = new TotonioEmbed(container, app, file.path, 'note.md',
      () => new Promise((_, fail) => { reject = fail; }), detached);
    await embed.render();
    container.querySelector<HTMLElement>('.totonio-preview')!.click();
    embed.onunload();
    reject(new Error('Tab closed'));
    await Promise.resolve();
    expect(detached).toHaveBeenCalledOnce();
    expect(container.childElementCount).toBe(0);
  });
  it.each(['https://example.com/a.totonio', '/tmp/a.totonio', 'a.tatamio', 'a.totonio\nb.totonio', ''])('rejects invalid embed path %s', (path) => {
    const { app, vault } = createHost();
    expect(() => resolveEmbed(app, path, 'note.md')).toThrow();
    expect(vault.read).not.toHaveBeenCalled();
  });
  it('reports missing files and vault read failures', async () => {
    const { app, file, vault } = createHost();
    vi.mocked(app.metadataCache.getFirstLinkpathDest).mockReturnValue(null);
    expect(() => resolveEmbed(app, 'missing.totonio', 'note.md')).toThrow('not found');
    vault.read.mockRejectedValue(new Error('Cannot read vault file'));
    const view = new TotonioView({ app } as unknown as WorkspaceLeaf);
    await view.onLoadFile(file);
    expect(view.contentEl.textContent).toContain('Cannot read vault file');
  });
});