import { ChevronLeft, ChevronRight, ExternalLink, Maximize, Minimize, Play, RotateCcw } from 'lucide';
import { Presentation } from './presentation';
import { renderDiagram, svgElement } from './render';
import type { CanvasState, Point } from './core/types';

type Options = { preview?: boolean; title?: string; open?: () => void };
type Icon = typeof ChevronLeft;

export function showError(container: HTMLElement, error: unknown): void {
  container.replaceChildren();
  const message = container.createDiv();
  message.className = 'totonio-error';
  message.setAttribute('role', 'alert');
  message.textContent = error instanceof Error ? error.message : 'Unable to open this Totonio file.';
}

export class Viewer {
  readonly presentation: Presentation;
  readonly root: HTMLDivElement;
  private readonly surface: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private readonly scene: SVGGElement;
  private readonly dim: SVGPathElement;
  private readonly cleanups: Array<() => void> = [];
  private readonly pointers = new Map<number, Point>();
  private readonly frameControls: HTMLElement[] = [];
  private readonly freeControls: HTMLElement[] = [];
  private status?: HTMLSpanElement;
  private lastZoom = NaN;
  private disposed = false;

  constructor(container: HTMLElement, document: CanvasState, private readonly options: Options = {}) {
    const dom = container.ownerDocument;
    this.root = container.createDiv();
    this.root.className = `totonio-viewer${options.preview ? ' totonio-preview' : ''}`;
    this.root.tabIndex = 0;
    this.root.setAttribute('role', options.preview ? 'button' : 'region');
    this.root.setAttribute('aria-label', options.preview ? `Open ${options.title ?? 'Totonio presentation'}` : options.title ?? 'Totonio presentation');
    this.surface = this.root.createDiv();
    this.surface.className = 'totonio-surface';
    container.replaceChildren(this.root);
    this.presentation = new Presentation(document, this.size());
    this.svg = svgElement(this.surface, 'svg', { class: 'totonio-svg', width: '100%', height: '100%',
      role: 'img', 'aria-label': options.title ?? 'Totonio diagram' });
    this.scene = svgElement(this.svg, 'g', { 'pointer-events': 'none' });
    this.dim = svgElement(this.svg, 'path', { class: 'totonio-frame-dim', 'fill-rule': 'evenodd', 'pointer-events': 'none' });
    if (options.preview) {
      if (!this.presentation.frames.length) this.presentation.fitContent();
      this.listen(this.root, 'click', () => options.open?.());
      this.listen(this.root, 'keydown', (event) => {
        const key = event as KeyboardEvent;
        if (key.key === 'Enter' || key.key === ' ') { key.preventDefault(); key.stopPropagation(); options.open?.(); }
      });
    } else {
      this.createToolbar();
      this.bindInteractions();
    }
    const Observer = dom.defaultView?.ResizeObserver;
    if (Observer) {
      const observer = new Observer(() => this.resize());
      observer.observe(this.surface);
      this.cleanups.push(() => observer.disconnect());
    }
    this.resize();
  }

  private listen(target: EventTarget, type: string, callback: EventListener, options?: AddEventListenerOptions): void {
    target.addEventListener(type, callback, options);
    this.cleanups.push(() => target.removeEventListener(type, callback, options));
  }

  private size(): { width: number; height: number } {
    const bounds = this.surface.getBoundingClientRect();
    return { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
  }

  private createToolbar(): void {
    const toolbar = this.root.createDiv();
    toolbar.className = 'totonio-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Presentation controls');
    this.root.prepend(toolbar);
    const button = (label: string, icon: Icon, action: () => void): HTMLButtonElement => {
      const element = toolbar.createEl('button');
      element.type = 'button';
      element.className = 'clickable-icon totonio-control';
      element.setAttribute('aria-label', label);
      element.title = label;
      const image = svgElement(element, 'svg', { viewBox: '0 0 24 24', width: 18, height: 18,
        fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round',
        'stroke-linejoin': 'round', 'aria-hidden': 'true' });
      for (const [tag, attributes] of icon) svgElement(image, tag as keyof SVGElementTagNameMap, attributes);
      this.listen(element, 'click', () => { action(); this.update(); this.root.focus({ preventScroll: true }); });
      return element;
    };
    const previous = button('Previous frame', ChevronLeft, () => this.presentation.step(-1));
    this.status = toolbar.createSpan();
    this.status.className = 'totonio-frame-status';
    this.status.setAttribute('aria-live', 'polite');
    const next = button('Next frame', ChevronRight, () => this.presentation.step(1));
    const exit = button('Free view', Minimize, () => this.presentation.escape());
    const play = button('Start frames', Play, () => this.presentation.step(1));
    const reset = button('Reset view', RotateCcw, () => this.presentation.reset());
    const fit = button('Fit content', Maximize, () => this.presentation.fitContent());
    const website = button('Open in Totonio', ExternalLink, () => {
      this.root.ownerDocument.defaultView?.open('https://totonio.pages.dev/', '_blank', 'noopener,noreferrer');
    });
    website.title = 'Open Totonio in your browser (select the file there)';
    this.frameControls.push(previous, next, exit);
    this.freeControls.push(play, reset, fit);
    if (!this.presentation.frames.length) play.remove();
  }

  private point(event: PointerEvent | WheelEvent): Point {
    const bounds = this.surface.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  private bindInteractions(): void {
    this.listen(this.root, 'keydown', (event) => {
      const key = event as KeyboardEvent;
      if (key.ctrlKey || key.metaKey || key.altKey || key.shiftKey) return;
      if (['ArrowRight', 'PageDown', 'ArrowLeft', 'PageUp'].includes(key.key) && this.presentation.frames.length) {
        key.preventDefault(); key.stopPropagation();
        this.presentation.step(key.key === 'ArrowRight' || key.key === 'PageDown' ? 1 : -1);
        this.update();
      } else if (key.key === 'Escape' && this.presentation.activeFrame) {
        key.preventDefault(); key.stopPropagation(); this.presentation.escape(); this.update();
      }
    });
    this.listen(this.surface, 'pointerdown', (event) => {
      const pointer = event as PointerEvent;
      this.root.focus({ preventScroll: true });
      if (this.presentation.activeFrame || ![0, 1].includes(pointer.button)) return;
      pointer.preventDefault();
      this.pointers.set(pointer.pointerId, this.point(pointer));
      this.surface.setPointerCapture(pointer.pointerId);
      this.root.classList.add('is-panning');
    });
    this.listen(this.surface, 'pointermove', (event) => {
      const pointer = event as PointerEvent;
      const old = this.pointers.get(pointer.pointerId);
      if (!old) return;
      const current = this.point(pointer);
      const other = [...this.pointers.entries()].find(([id]) => id !== pointer.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(old.x - other.x, old.y - other.y);
        const after = Math.hypot(current.x - other.x, current.y - other.y);
        const center = { x: (old.x + other.x) / 2, y: (old.y + other.y) / 2 };
        if (before > 0) this.presentation.zoomAt(center, after / before);
        this.presentation.pan({ x: (current.x - old.x) / 2, y: (current.y - old.y) / 2 });
      } else this.presentation.pan({ x: current.x - old.x, y: current.y - old.y });
      this.pointers.set(pointer.pointerId, current);
      this.update();
    });
    const release = (event: Event) => {
      const pointer = event as PointerEvent;
      this.pointers.delete(pointer.pointerId);
      if (this.surface.hasPointerCapture(pointer.pointerId)) this.surface.releasePointerCapture(pointer.pointerId);
      if (!this.pointers.size) this.root.classList.remove('is-panning');
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.listen(this.surface, type, release);
    this.listen(this.surface, 'wheel', (event) => {
      const wheel = event as WheelEvent;
      wheel.preventDefault(); wheel.stopPropagation();
      if (this.presentation.activeFrame) return;
      const multiplier = wheel.deltaMode === 1 ? 16 : wheel.deltaMode === 2 ? this.size().height : 1;
      if (wheel.shiftKey) this.presentation.pan({ x: -wheel.deltaX * multiplier, y: -wheel.deltaY * multiplier });
      else this.presentation.zoomAt(this.point(wheel), Math.exp(-Math.max(-500, Math.min(500, wheel.deltaY * multiplier)) * 0.002));
      this.update();
    }, { passive: false });
    for (const type of ['dragstart', 'dragover', 'drop', 'contextmenu']) this.listen(this.surface, type, (event) => event.preventDefault());
  }

  resize(): void {
    if (this.disposed) return;
    const size = this.size();
    this.presentation.resize(size);
    if (this.options.preview && !this.presentation.frames.length) this.presentation.fitContent();
    this.svg.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
    this.update();
  }

  private update(): void {
    const { view, activeFrame } = this.presentation;
    this.scene.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.zoom})`);
    if (view.zoom !== this.lastZoom) {
      renderDiagram(this.scene, this.presentation.document.shapes, view.zoom);
      this.lastZoom = view.zoom;
    }
    this.root.classList.toggle('is-frame', Boolean(activeFrame));
    this.dim.style.display = activeFrame ? '' : 'none';
    if (activeFrame) {
      const size = this.size();
      const left = view.x + Math.min(activeFrame.x, activeFrame.x + activeFrame.width) * view.zoom;
      const top = view.y + Math.min(activeFrame.y, activeFrame.y + activeFrame.height) * view.zoom;
      const right = left + Math.abs(activeFrame.width) * view.zoom;
      const bottom = top + Math.abs(activeFrame.height) * view.zoom;
      const radius = Math.min(14, (right - left) / 2, (bottom - top) / 2);
      this.dim.setAttribute('d', `M0 0H${size.width}V${size.height}H0Z M${left + radius} ${top}H${right - radius}Q${right} ${top} ${right} ${top + radius}V${bottom - radius}Q${right} ${bottom} ${right - radius} ${bottom}H${left + radius}Q${left} ${bottom} ${left} ${bottom - radius}V${top + radius}Q${left} ${top} ${left + radius} ${top}Z`);
    }
    for (const element of this.frameControls) element.hidden = !activeFrame;
    for (const element of this.freeControls) element.hidden = Boolean(activeFrame);
    if (this.status) {
      const label = activeFrame?.label?.trim() || activeFrame?.name?.trim();
      this.status.textContent = activeFrame ? `${this.presentation.frameIndex! + 1} / ${this.presentation.frames.length}${label ? `: ${label}` : ''}` : 'Free view';
      this.status.title = this.status.textContent;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    for (const id of this.pointers.keys()) if (this.surface.hasPointerCapture(id)) this.surface.releasePointerCapture(id);
    this.pointers.clear();
    this.root.remove();
  }
}