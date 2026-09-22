import { Tags } from 'lucide';
import { canvasTags, emptyTagFilter, isTagFilterActive, reconcileTagFilter, sameTag, tagFilterMatchIds, untaggedCount } from './core/tags';
import type { TagFilter } from './core/tags';
import type { CanvasShape } from './core/types';
import { svgElement } from './render';

export class TagFilterMenu {
  readonly button: HTMLButtonElement;
  readonly panel: HTMLDivElement;
  private filter: TagFilter;
  private readonly badge: HTMLSpanElement;
  private readonly clearButton: HTMLButtonElement;
  private readonly summary: HTMLDivElement;
  private readonly options: HTMLDivElement;
  private readonly selections: Array<{ input: HTMLInputElement; tag?: string }> = [];
  private readonly inherit: HTMLInputElement;
  private readonly bridge: HTMLInputElement;
  private readonly cleanups: Array<() => void> = [];

  constructor(root: HTMLElement, toolbar: HTMLElement, private readonly shapes: CanvasShape[],
    private readonly changed: (matches: Set<string> | null) => void, initial?: TagFilter) {
    this.filter = reconcileTagFilter(shapes, initial ?? emptyTagFilter());
    this.button = toolbar.createEl('button', { cls: 'clickable-icon totonio-control totonio-tag-trigger' });
    this.button.type = 'button';
    this.button.title = 'Filter by tag';
    this.button.setAttribute('aria-label', 'Filter by tag');
    this.button.setAttribute('aria-haspopup', 'dialog');
    this.button.setAttribute('aria-expanded', 'false');
    const icon = svgElement(this.button, 'svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none',
      stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
    for (const [tag, attributes] of Tags) svgElement(icon, tag as keyof SVGElementTagNameMap, attributes);
    this.badge = this.button.createSpan({ cls: 'totonio-tag-badge' });
    this.badge.setAttribute('aria-hidden', 'true');
    this.panel = root.createDiv({ cls: 'totonio-tag-panel' });
    this.panel.hidden = true;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Filter by tag');
    const header = this.panel.createDiv({ cls: 'totonio-tag-header' });
    header.createEl('strong', { text: 'Filter by tag' });
    this.clearButton = header.createEl('button', { text: 'Clear' });
    this.clearButton.type = 'button';
    this.clearButton.setAttribute('aria-label', 'Clear tag filter');
    const list = this.panel.createDiv({ cls: 'totonio-tag-list' });
    const tags = canvasTags(shapes);
    if (!tags.length) list.createEl('p', { text: shapes.length ? 'This document has no tags.' : 'This document has no objects.' });
    const addSelection = (label: string, count: number, tag?: string) => {
      const row = list.createEl('label', { cls: 'totonio-tag-row' });
      const input = row.createEl('input');
      input.type = 'checkbox';
      input.setAttribute('aria-label', tag === undefined ? 'Untagged objects' : `Tag: ${tag}`);
      row.createSpan({ text: label, cls: 'totonio-tag-name' });
      row.createSpan({ text: String(count), cls: 'totonio-tag-count' });
      this.selections.push({ input, tag });
      this.listen(input, 'change', () => {
        if (tag === undefined) this.filter.untagged = input.checked;
        else this.filter.tags = input.checked ? [...this.filter.tags, tag] : this.filter.tags.filter((value) => !sameTag(value, tag));
        this.refresh();
      });
    };
    tags.forEach(({ tag, count }) => addSelection(tag, count, tag));
    const untagged = untaggedCount(shapes);
    if (untagged) addSelection('Untagged', untagged);
    this.options = this.panel.createDiv({ cls: 'totonio-tag-options' });
    const addOption = (name: string, key: 'inheritChildren' | 'bridgeConnectors') => {
      const label = this.options.createEl('label', { cls: 'totonio-tag-row' });
      const input = label.createEl('input');
      input.type = 'checkbox';
      label.createSpan({ text: name, cls: 'totonio-tag-name' });
      this.listen(input, 'change', () => { this.filter[key] = input.checked; this.refresh(); });
      return input;
    };
    this.inherit = addOption('Keep untagged children', 'inheritChildren');
    this.bridge = addOption('Keep untagged linking connectors', 'bridgeConnectors');
    this.summary = this.panel.createDiv({ cls: 'totonio-tag-summary' });
    this.summary.setAttribute('role', 'status');
    this.listen(this.button, 'click', () => {
      if (this.isOpen) this.close();
      else {
        this.panel.hidden = false;
        this.button.setAttribute('aria-expanded', 'true');
        (this.selections[0]?.input ?? this.panel).focus();
      }
    });
    this.panel.tabIndex = -1;
    this.listen(this.clearButton, 'click', () => {
      this.filter = emptyTagFilter();
      this.refresh();
      (this.selections[0]?.input ?? this.panel).focus();
    });
    this.listen(this.panel, 'keydown', (event) => {
      const key = event as KeyboardEvent;
      if (key.key === 'Escape') { key.preventDefault(); key.stopPropagation(); this.close(); }
      if (key.key !== 'Tab') return;
      const focusable = [...this.panel.querySelectorAll<HTMLElement>('button:not(:disabled), input')]
        .filter((element) => !element.closest('[hidden]'));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (key.shiftKey && (this.panel.ownerDocument.activeElement === first || this.panel.ownerDocument.activeElement === this.panel)) {
        key.preventDefault(); last?.focus();
      } else if (!key.shiftKey && this.panel.ownerDocument.activeElement === last) {
        key.preventDefault(); first?.focus();
      }
    });
    this.listen(root.ownerDocument, 'pointerdown', (event) => {
      if (this.isOpen && !event.composedPath().includes(this.panel) && !event.composedPath().includes(this.button)) this.close(false);
    });
    this.listen(root.ownerDocument, 'focusin', (event) => {
      if (this.isOpen && !event.composedPath().includes(this.panel) && !event.composedPath().includes(this.button)) this.close(false);
    });
    this.refresh();
  }

  get isOpen(): boolean { return !this.panel.hidden; }
  get state(): TagFilter { return { ...this.filter, tags: [...this.filter.tags] }; }

  close(focus = true): void {
    this.panel.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
    if (focus) this.button.focus({ preventScroll: true });
  }

  private listen(target: EventTarget, type: string, handler: EventListener): void {
    target.addEventListener(type, handler);
    this.cleanups.push(() => target.removeEventListener(type, handler));
  }

  private refresh(): void {
    const active = isTagFilterActive(this.filter);
    const matches = tagFilterMatchIds(this.shapes, this.filter);
    for (const { input, tag } of this.selections) input.checked = tag === undefined ? this.filter.untagged : this.filter.tags.some((value) => sameTag(value, tag));
    this.inherit.checked = this.filter.inheritChildren;
    this.bridge.checked = this.filter.bridgeConnectors;
    this.options.hidden = !active;
    this.clearButton.disabled = !active;
    this.badge.hidden = !active;
    this.badge.textContent = String(this.filter.tags.length + Number(this.filter.untagged));
    this.button.classList.toggle('is-filter-active', active);
    this.button.title = active ? `Filter by tag: ${matches?.size ?? 0} of ${this.shapes.length} objects highlighted` : 'Filter by tag';
    this.summary.textContent = active ? `${matches?.size ?? 0} of ${this.shapes.length} objects highlighted` : 'All objects shown';
    this.changed(matches);
  }

  dispose(): void {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.panel.remove();
    this.button.remove();
  }
}