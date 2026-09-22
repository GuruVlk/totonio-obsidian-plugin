if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.createEl = function <Tag extends keyof HTMLElementTagNameMap>(tag: Tag, options?: DomElementInfo | string): HTMLElementTagNameMap[Tag] {
    const element = this.ownerDocument.createElement(tag);
    const info = typeof options === 'string' ? { cls: options } : options;
    if (info?.cls) element.className = Array.isArray(info.cls) ? info.cls.join(' ') : info.cls;
    if (info?.text !== undefined) element.textContent = String(info.text);
    this.appendChild(element);
    return element;
  };
  HTMLElement.prototype.createDiv = function (options) { return this.createEl('div', options); };
  HTMLElement.prototype.createSpan = function (options) { return this.createEl('span', options); };
}