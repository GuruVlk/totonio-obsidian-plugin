if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.createEl = function <Tag extends keyof HTMLElementTagNameMap>(tag: Tag): HTMLElementTagNameMap[Tag] {
    const element = this.ownerDocument.createElement(tag);
    this.appendChild(element);
    return element;
  };
  HTMLElement.prototype.createDiv = function () { return this.createEl('div'); };
  HTMLElement.prototype.createSpan = function () { return this.createEl('span'); };
}