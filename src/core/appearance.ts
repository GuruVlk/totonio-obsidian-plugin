import type { CanvasShape, IconCorner, LabelSize, Padding, ShapeType } from './types';
import { cylinderMetrics } from './shapePaths';
import { HEADING_SCALES, QUOTE_GLYPH, RULE_GLYPH, parseMarkdownLines, runsText } from './markdown';
import type { MarkdownLine, TextRun } from './markdown';
import { getShapeDefinition } from './shapeRegistry';
const fontSizes: Record<LabelSize, number> = { 'extra-small': 12, small: 18, medium: 32, large: 48, 'extra-large': 72, 'extra-extra-large': 128 };
export const DEFAULT_TEXT_PADDING: Padding = { top: 0, right: 0, bottom: 0, left: 0 };
export const DEFAULT_LABEL_PADDING: Padding = { top: 7, right: 8, bottom: 7, left: 8 };
const TEXT_LINE_HEIGHT = 1.4;
const EXTERNAL_LABEL_GAP = 8;
const externalLabelBaseline = (edge: number, size: number) => edge + EXTERNAL_LABEL_GAP + size * 0.72;
export const ICON_CORNERS: readonly IconCorner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
export const DEFAULT_SHAPE_ICON_SIZE = 40;
export const MIN_SHAPE_ICON_SIZE = 8;
export const MAX_SHAPE_ICON_SIZE = 400;
const SHAPE_ICON_INSET = 8;
export const shapeSupportsIcon = (type: ShapeType) => type === 'rect' || type === 'panel';
export const shapeIconSlot = (shape: CanvasShape) => {
    const left = Math.min(shape.x, shape.x + shape.width);
    const top = Math.min(shape.y, shape.y + shape.height);
    const width = Math.abs(shape.width);
    const height = Math.abs(shape.height);
    const size = Math.max(1, Math.min(shape.iconSize ?? DEFAULT_SHAPE_ICON_SIZE, width - SHAPE_ICON_INSET * 2, height - SHAPE_ICON_INSET * 2));
    const corner = shape.iconCorner ?? 'top-left';
    return {
        size,
        x: corner === 'top-right' || corner === 'bottom-right' ? left + width - SHAPE_ICON_INSET - size : left + SHAPE_ICON_INSET,
        y: corner === 'bottom-left' || corner === 'bottom-right' ? top + height - SHAPE_ICON_INSET - size : top + SHAPE_ICON_INSET,
    };
};
export const shapeIconLayout = (shape: CanvasShape) => shape.iconData && shapeSupportsIcon(shape.type) ? shapeIconSlot(shape) : null;
const LABEL_ICON_GAP = 8;
const labelBoundsBesideIcon = (shape: CanvasShape, left: number, right: number, top: number, bottom: number) => {
    const icon = shapeIconLayout(shape);
    if (!icon || icon.y >= bottom || icon.y + icon.size <= top)
        return { left, right };
    const corner = shape.iconCorner ?? 'top-left';
    return corner === 'top-right' || corner === 'bottom-right'
        ? { left, right: Math.max(left, Math.min(right, icon.x - LABEL_ICON_GAP)) }
        : { left: Math.min(right, Math.max(left, icon.x + icon.size + LABEL_ICON_GAP)), right };
};
export const labelFontSize = (size: LabelSize | undefined) => fontSizes[size ?? 'medium'];
export const labelLines = (label: string | undefined) => (label ?? '').split('\n').filter((line, index, lines) => line.length > 0 || lines.length === 1 || index < lines.length - 1);
export const textPadding = (shape: CanvasShape) => shape.padding ?? DEFAULT_TEXT_PADDING;
export const labelPadding = (shape: CanvasShape) => shape.padding ?? (shape.type === 'text' ? DEFAULT_TEXT_PADDING : getShapeDefinition(shape.type).containerDefaults?.padding ?? DEFAULT_LABEL_PADDING);
export const textWidthUnits = (value: string) => [...value].reduce((width, character) => {
    if (character === ' ')
        return width + 0.32;
    if (/[ilI1|.,'`]/.test(character))
        return width + 0.28;
    if (/[MW@#%&]/.test(character))
        return width + 0.85;
    if (/[A-Z]/.test(character))
        return width + 0.62;
    if (/[mw]/.test(character))
        return width + 0.72;
    if (/[ftjr]/.test(character))
        return width + 0.36;
    return width + 0.48;
}, 0);
const GLYPH_ADVANCES: Record<string, number> = {
    ' ': 0.25, '!': 0.328, '"': 0.405, '#': 0.556, '$': 0.58, '%': 0.833, '&': 0.704, "'": 0.26,
    '(': 0.3, ')': 0.3, '*': 0.444, '+': 0.666, ',': 0.26, '-': 0.32, '.': 0.26, '/': 0.37,
    '0': 0.58, '1': 0.58, '2': 0.58, '3': 0.58, '4': 0.58, '5': 0.58, '6': 0.58, '7': 0.58, '8': 0.58, '9': 0.58,
    ':': 0.3, ';': 0.3, '<': 0.666, '=': 0.666, '>': 0.666, '?': 0.482, '@': 0.8,
    'A': 0.7, 'B': 0.636, 'C': 0.72, 'D': 0.757, 'E': 0.592, 'F': 0.562, 'G': 0.779, 'H': 0.718, 'I': 0.26,
    'J': 0.492, 'K': 0.628, 'L': 0.51, 'M': 0.886, 'N': 0.764, 'O': 0.85, 'P': 0.58, 'Q': 0.843, 'R': 0.599,
    'S': 0.564, 'T': 0.57, 'U': 0.71, 'V': 0.623, 'W': 0.972, 'X': 0.649, 'Y': 0.602, 'Z': 0.572,
    '[': 0.3, '\\': 0.37, ']': 0.3, '^': 0.666, '_': 0.5, '`': 0.24,
    'a': 0.534, 'b': 0.637, 'c': 0.5, 'd': 0.637, 'e': 0.572, 'f': 0.295, 'g': 0.632, 'h': 0.583, 'i': 0.25,
    'j': 0.251, 'k': 0.51, 'l': 0.252, 'm': 0.883, 'n': 0.581, 'o': 0.611, 'p': 0.635, 'q': 0.635, 'r': 0.36,
    's': 0.444, 't': 0.317, 'u': 0.581, 'v': 0.488, 'w': 0.746, 'x': 0.484, 'y': 0.488, 'z': 0.442,
    '{': 0.3, '|': 0.222, '}': 0.3, '~': 0.666,
};
export const drawnWidthUnits = (value: string) => [...value].reduce((width, character) => width + (GLYPH_ADVANCES[character] ?? textWidthUnits(character)), 0);
const styledTextWidthUnits = (shape: CanvasShape, value: string) => textWidthUnits(value) * (shape.labelBold ? 1.08 : 1) * (shape.labelItalic ? 1.03 : 1);
export type LayoutCell = {
    offset: number;
    runs: TextRun[];
};
export type LayoutLine = {
    text: string;
    indent: number;
    runs: TextRun[];
    paragraphEnd?: boolean;
    scale?: number;
    lead?: number;
    cells?: LayoutCell[];
    rule?: boolean;
};
type RunWidth = (run: TextRun, text: string) => number;
type RunToken = {
    text: string;
    run: TextRun;
    spaced: boolean;
};
const runTokens = (runs: TextRun[]): RunToken[] => {
    const tokens: RunToken[] = [];
    let spaced = false;
    runs.forEach((run) => {
        run.text.split(/(\s+)/).forEach((part) => {
            if (part === '')
                return;
            if (/^\s+$/.test(part)) {
                spaced = true;
                return;
            }
            tokens.push({ text: part, run, spaced: spaced && tokens.length > 0 });
            spaced = false;
        });
    });
    return tokens;
};
const appendRun = (line: TextRun[], run: TextRun, text: string) => {
    const last = line[line.length - 1];
    if (last && last.bold === run.bold && last.italic === run.italic && last.code === run.code && last.strike === run.strike && last.href === run.href)
        last.text += text;
    else
        line.push({ ...run, text });
};
const splitLongToken = (token: RunToken, maxUnits: number, width: RunWidth) => {
    const chunks: string[] = [];
    let chunk = '';
    for (const character of token.text) {
        if (chunk && width(token.run, chunk + character) > maxUnits) {
            chunks.push(chunk);
            chunk = '';
        }
        chunk += character;
    }
    if (chunk)
        chunks.push(chunk);
    return chunks;
};
const wrapRuns = (runs: TextRun[], maxUnits: number, width: RunWidth): TextRun[][] => {
    const lines: TextRun[][] = [];
    let current: TextRun[] = [];
    let used = 0;
    const flush = () => { lines.push(current); current = []; used = 0; };
    runTokens(runs).forEach((token) => {
        const spaceWidth = token.spaced ? width(token.run, ' ') : 0;
        if (width(token.run, token.text) > maxUnits) {
            splitLongToken(token, maxUnits, width).forEach((chunk, index) => {
                const chunkWidth = width(token.run, chunk);
                if (current.length > 0 && (index > 0 || used + spaceWidth + chunkWidth > maxUnits))
                    flush();
                else if (index === 0 && token.spaced && current.length > 0) {
                    appendRun(current, token.run, ' ');
                    used += spaceWidth;
                }
                appendRun(current, token.run, chunk);
                used += chunkWidth;
            });
            return;
        }
        const tokenWidth = width(token.run, token.text);
        if (current.length > 0 && used + spaceWidth + tokenWidth > maxUnits)
            flush();
        else if (token.spaced && current.length > 0) {
            appendRun(current, token.run, ' ');
            used += spaceWidth;
        }
        appendRun(current, token.run, tokenWidth === 0 ? token.text : token.text);
        used += tokenWidth;
    });
    if (current.length > 0 || lines.length === 0)
        lines.push(current);
    return lines;
};
const toLayoutLine = (runs: TextRun[], indent: number): LayoutLine => ({ runs, indent, text: runsText(runs) });
export type TextSpan = {
    text: string;
    x?: number;
    dy?: number;
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strike?: boolean;
    href?: string;
    size?: number;
};
const lineAdvance = (line: LayoutLine) => (line.scale ?? 1) + (line.lead ?? 0);
export const layoutBlockHeight = (lines: LayoutLine[], lineHeight: number) => lines.reduce((height, line, index) => height + lineHeight * (index === 0 ? line.scale ?? 1 : lineAdvance(line)), 0);
export const layoutFirstAscent = (lines: LayoutLine[], size: number) => size * (lines[0]?.scale ?? 1);
const spanStyle = (run: TextRun, size: number | undefined) => ({ bold: run.bold, italic: run.italic, code: run.code, strike: run.strike, href: run.href, size });
export const layoutSpans = (lines: LayoutLine[], x: number, lineHeight: number, indented: boolean, size = 0): TextSpan[] => lines.flatMap((line, lineIndex) => {
    const dy = lineIndex === 0 ? 0 : lineHeight * lineAdvance(line);
    const spanSize = size > 0 && (line.scale ?? 1) !== 1 ? size * (line.scale ?? 1) : undefined;
    if (line.cells) {
        const spans: TextSpan[] = [];
        line.cells.forEach((cell) => {
            cell.runs.forEach((run, runIndex) => {
                if (runIndex > 0) {
                    spans.push({ text: run.text, ...spanStyle(run, spanSize) });
                    return;
                }
                const first = spans.length === 0;
                spans.push({ text: run.text, x: x + cell.offset, ...(first ? { dy } : {}), ...spanStyle(run, spanSize) });
            });
        });
        return spans;
    }
    const startX = x + (indented ? line.indent : 0);
    const runs = line.runs.length > 0 && line.text !== '' ? line.runs : [{ text: ' ' }];
    return runs.map((run, runIndex) => runIndex === 0
        ? { text: run.text, x: startX, dy, ...spanStyle(run, spanSize) }
        : { text: run.text, ...spanStyle(run, spanSize) });
});
export const CODE_FONT_FAMILY = 'SFMono-Regular, Consolas, monospace';
const HEADING_LEAD = 0.35;
const TABLE_GAP_UNITS = 1.2;
const RULE_FILL = 0.95;
const MAX_RULE_GLYPHS = 200;
const closeGroup = (group: LayoutLine[]) => {
    group[group.length - 1] = { ...group[group.length - 1], paragraphEnd: true };
    return group;
};
const wrapGroup = (runs: TextRun[], maxUnits: number, width: RunWidth, wrap: boolean, indent: number, extra: Partial<LayoutLine>): LayoutLine[] => closeGroup((wrap ? wrapRuns(runs, Math.max(1, maxUnits), width) : [runs]).map((lineRuns, index) => ({ ...toLayoutLine(lineRuns, index === 0 ? 0 : indent), ...extra })));
const markerGroup = (glyph: string, runs: TextRun[], depth: number, size: number, maxUnits: number, width: RunWidth, wrap: boolean): LayoutLine[] => {
    const plain: TextRun = { text: '' };
    const depthUnits = width(plain, '  '.repeat(depth));
    const glyphUnits = width(plain, `${glyph} `);
    const contentLines = wrap ? wrapRuns(runs, Math.max(1, maxUnits - depthUnits - glyphUnits), width) : [runs];
    return closeGroup(contentLines.map((lineRuns, index) => {
        if (index > 0)
            return toLayoutLine(lineRuns, (depthUnits + glyphUnits) * size);
        const withGlyph: TextRun[] = [{ text: `${glyph} ` }];
        lineRuns.forEach((run) => appendRun(withGlyph, run, run.text));
        return toLayoutLine(withGlyph, depthUnits * size);
    }));
};
type TableRow = Extract<MarkdownLine, {
    kind: 'row';
}>;
const tableGroup = (rows: TableRow[], size: number, width: RunWidth): LayoutLine[] => {
    const columns = Math.max(...rows.map((row) => row.cells.length));
    const cellUnits = rows.map((row) => row.cells.map((cell) => cell.reduce((sum, run) => sum + width(run, run.text), 0)));
    const columnUnits = Array.from({ length: columns }, (_, column) => Math.max(0, ...cellUnits.map((row) => row[column] ?? 0)));
    const offsets = columnUnits.reduce<number[]>((all, _units, column) => [...all, column === 0 ? 0 : all[column - 1] + columnUnits[column - 1] + TABLE_GAP_UNITS], []);
    return rows.map((row, rowIndex) => {
        const cells = row.cells.map((runs, column) => {
            const slack = Math.max(0, columnUnits[column] - (cellUnits[rowIndex][column] ?? 0));
            const align = row.aligns[column] ?? 'left';
            const shift = align === 'right' ? slack : align === 'center' ? slack / 2 : 0;
            return { offset: (offsets[column] + shift) * size, runs };
        });
        return { text: row.cells.map(runsText).join('  '), indent: 0, runs: row.cells.flat(), cells, paragraphEnd: true };
    });
};
const codeRuns = (runs: TextRun[]): TextRun[] => runs.map((run, index) => index === 0
    ? { ...run, text: run.text.replace(/^[ \t]+/, (leading) => '\u00a0'.repeat(leading.replace(/\t/g, '  ').length)) }
    : run);
const layoutLines = (value: string | undefined, size: number, maxWidth: number, width: RunWidth, wrap: boolean): LayoutLine[] => {
    const maxUnits = Math.max(1, maxWidth / Math.max(size, 1));
    const source = labelLines(value);
    const parsed = parseMarkdownLines(source);
    const laid: LayoutLine[] = [];
    for (let index = 0; index < parsed.length; index += 1) {
        const line = parsed[index];
        if (line.kind === 'row') {
            const rows: TableRow[] = [];
            while (index < parsed.length && parsed[index].kind === 'row') {
                rows.push(parsed[index] as TableRow);
                index += 1;
            }
            index -= 1;
            laid.push(...tableGroup(rows, size, width));
            continue;
        }
        if (line.kind === 'rule') {
            const glyphs = Math.min(MAX_RULE_GLYPHS, Math.max(1, Math.floor(maxUnits * RULE_FILL / Math.max(0.1, width({ text: '' }, RULE_GLYPH)))));
            laid.push({ text: RULE_GLYPH.repeat(glyphs), indent: 0, runs: [{ text: RULE_GLYPH.repeat(glyphs) }], paragraphEnd: true, rule: true });
            continue;
        }
        if (line.kind === 'heading') {
            const scale = HEADING_SCALES[line.level - 1];
            laid.push(...wrapGroup(line.runs, maxUnits / scale, width, wrap, 0, { scale, lead: HEADING_LEAD }));
            continue;
        }
        if (line.kind === 'code') {
            laid.push({ ...toLayoutLine(codeRuns(line.runs), 0), paragraphEnd: true });
            continue;
        }
        if (line.kind === 'list') {
            laid.push(...markerGroup(line.glyph, line.runs, line.depth, size, maxUnits, width, wrap));
            continue;
        }
        if (line.kind === 'quote') {
            laid.push(...markerGroup(QUOTE_GLYPH, line.runs, line.depth, size, maxUnits, width, wrap));
            continue;
        }
        laid.push(...wrapGroup(line.runs, maxUnits, width, wrap, 0, {}));
    }
    return laid;
};
export const shapeLabelFontSize = (shape: CanvasShape) => {
    if (shape.type !== 'text' || shape.scaleTextWithBounds !== true || !shape.label)
        return labelFontSize(shape.labelSize);
    const padding = textPadding(shape);
    const availableWidth = Math.max(1, Math.abs(shape.width) - padding.left - padding.right);
    const availableHeight = Math.max(1, Math.abs(shape.height) - padding.top - padding.bottom);
    const lines = layoutLines(shape.label, 1, availableWidth, labelRunWidth(shape), false);
    const longestLine = Math.max(1, ...lines.filter((line) => !line.rule).map((line) => styledTextWidthUnits(shape, line.text) * (line.scale ?? 1)));
    const widthLimitedSize = availableWidth / longestLine;
    const heightLimitedSize = availableHeight / Math.max(1, layoutBlockHeight(lines, TEXT_LINE_HEIGHT));
    return Math.max(1, Math.min(widthLimitedSize, heightLimitedSize));
};
export const shapeLabelWrapWidth = (shape: CanvasShape) => {
    if (shape.type === 'text') {
        const padding = textPadding(shape);
        return Math.max(1, Math.abs(shape.width) - padding.left - padding.right);
    }
    if (shape.type === 'panel' || shape.type === 'legend') {
        const padding = labelPadding(shape);
        return Math.max(1, Math.abs(shape.width) - padding.left - padding.right);
    }
    if (shape.type === 'person' || shape.type === 'firewall' || shape.type === 'database2')
        return Math.max(1, Math.abs(shape.width) - 4);
    if (shape.type !== 'image' && shape.type !== 'line' && shape.type !== 'plain-line') {
        const padding = labelPadding(shape);
        return Math.max(1, Math.abs(shape.width) - padding.left - padding.right);
    }
    return Math.max(1, Math.abs(shape.width) - 16);
};
const labelRunWidth = (shape: CanvasShape): RunWidth => (run, text) => textWidthUnits(text) * (shape.labelBold || run.bold ? 1.08 : 1) * (shape.labelItalic || run.italic ? 1.03 : 1) * (run.code ? 1.1 : 1) * 1.2;
const bodyRunWidth = (shape: CanvasShape): RunWidth => (run, text) => textWidthUnits(text) * (shape.bodyBold || run.bold ? 1.08 : 1) * (shape.bodyItalic || run.italic ? 1.03 : 1) * (run.code ? 1.1 : 1) * 1.2;
export const shapeLabelLayoutLines = (shape: CanvasShape, size = shapeLabelFontSize(shape)): LayoutLine[] => layoutLines(shape.label, size, shapeLabelWrapWidth(shape), labelRunWidth(shape), shape.labelWrap === true);
export const shapeLabelLines = (shape: CanvasShape, size = shapeLabelFontSize(shape)) => shapeLabelLayoutLines(shape, size).map((line) => line.text);
export const imageLabelLayout = (shape: CanvasShape) => {
    const lines = shape.label?.trim() ? shapeLabelLines(shape) : [];
    const size = shapeLabelFontSize(shape);
    const lineHeight = size * 1.25;
    return {
        lines,
        size,
        lineHeight,
        labelX: shape.x + shape.width / 2,
        firstBaseline: externalLabelBaseline(shape.y + shape.height, size),
        bottom: shape.y + shape.height + (lines.length ? EXTERNAL_LABEL_GAP + lines.length * lineHeight : 0),
    };
};
export const imageLabelBounds = (shape: CanvasShape) => {
    const layout = imageLabelLayout(shape);
    const width = layout.lines.length ? tightTextSize(shape, layout.size).width : 0;
    return {
        left: Math.min(shape.x, layout.labelX - width / 2),
        top: shape.y,
        right: Math.max(shape.x + shape.width, layout.labelX + width / 2),
        bottom: Math.max(shape.y + shape.height, layout.bottom),
    };
};
export const personLayout = (shape: CanvasShape) => {
    const hasLabel = Boolean(shape.label?.trim());
    const lines = hasLabel ? shapeLabelLines(shape) : [];
    const size = shapeLabelFontSize(shape);
    const lineHeight = size * 1.25;
    const iconSize = Math.max(0, Math.min(shape.width - 4, shape.height));
    return {
        iconSize,
        iconX: shape.x + (shape.width - iconSize) / 2,
        iconY: shape.y,
        lines,
        size,
        lineHeight,
        labelX: shape.x + shape.width / 2,
        firstBaseline: externalLabelBaseline(shape.y + iconSize, size),
    };
};
export const personVisibleBounds = (shape: CanvasShape) => {
    const layout = personLayout(shape);
    return { left: layout.iconX, top: layout.iconY, right: layout.iconX + layout.iconSize, bottom: layout.iconY + layout.iconSize };
};
export const firewallLayout = (shape: CanvasShape) => {
    const hasLabel = Boolean(shape.label?.trim());
    const lines = hasLabel ? shapeLabelLines(shape) : [];
    const size = shapeLabelFontSize(shape);
    const lineHeight = size * 1.25;
    const wallSize = Math.min(Math.max(0, Math.abs(shape.width) - 4), Math.max(0, Math.abs(shape.height) - 4));
    const scale = wallSize / 18;
    const visibleLeft = shape.x + (shape.width - wallSize) / 2;
    return {
        wallSize,
        scale,
        wallX: visibleLeft - 3 * scale,
        wallY: shape.y + 2 - 3 * scale,
        lines,
        size,
        lineHeight,
        labelX: shape.x + shape.width / 2,
        firstBaseline: externalLabelBaseline(shape.y + 2 + wallSize, size),
    };
};
export const firewallVisibleBounds = (shape: CanvasShape) => {
    const layout = firewallLayout(shape);
    return {
        left: layout.wallX + 3 * layout.scale,
        top: layout.wallY + 3 * layout.scale,
        right: layout.wallX + 21 * layout.scale,
        bottom: layout.wallY + 21 * layout.scale,
    };
};
export const databaseIconLayout = (shape: CanvasShape) => {
    const hasLabel = Boolean(shape.label?.trim());
    const lines = hasLabel ? shapeLabelLines(shape) : [];
    const size = shapeLabelFontSize(shape);
    const lineHeight = size * 1.25;
    const scale = Math.min(Math.max(0, Math.abs(shape.width) - 4) / 18, Math.max(0, Math.abs(shape.height) - 4) / 20);
    const visibleWidth = 18 * scale;
    const visibleHeight = 20 * scale;
    const iconX = shape.x + (shape.width - visibleWidth) / 2 - 3 * scale;
    const iconY = shape.y + 2 - 2 * scale;
    return { iconSize: visibleWidth, visibleHeight, scale, iconX, iconY, lines, size, lineHeight, labelX: shape.x + shape.width / 2, firstBaseline: externalLabelBaseline(shape.y + 2 + visibleHeight, size) };
};
export const databaseIconVisibleBounds = (shape: CanvasShape) => {
    const layout = databaseIconLayout(shape);
    return {
        left: layout.iconX + 3 * layout.scale,
        top: layout.iconY + 2 * layout.scale,
        right: layout.iconX + 21 * layout.scale,
        bottom: layout.iconY + 22 * layout.scale,
    };
};
export const legendLayout = (shape: CanvasShape) => {
    const padding = labelPadding(shape);
    const headerLines = shapeLabelLines(shape);
    const headerSize = shapeLabelFontSize(shape);
    const headerLineHeight = headerSize * 1.25;
    const headerHeight = Math.max(44, Math.max(1, headerLines.length) * headerLineHeight + padding.top + padding.bottom);
    const rowHeight = 26;
    const iconSize = 18;
    const contentTop = shape.y + headerHeight + 8;
    return {
        headerLines,
        headerSize,
        headerLineHeight,
        headerHeight,
        dividerY: shape.y + headerHeight,
        headerBaseline: shape.y + padding.top + headerSize,
        rowHeight,
        iconSize,
        contentTop,
    };
};
export const panelLayout = (shape: CanvasShape) => {
    const padding = labelPadding(shape);
    const headerLines = shapeLabelLines(shape);
    const headerSize = labelFontSize(shape.labelSize);
    const headerLineHeight = headerSize * 1.25;
    const headerHeight = Math.max(44, headerLines.length * headerLineHeight + padding.top + padding.bottom);
    const dividerY = Math.min(shape.y + shape.height, shape.y + headerHeight);
    const headerFirstBaseline = shape.y + padding.top + headerSize;
    const bodySize = labelFontSize(shape.bodySize);
    const bodyLayoutLines = layoutLines(shape.body, bodySize, Math.max(1, Math.abs(shape.width) - padding.left - padding.right), bodyRunWidth(shape), shape.bodyWrap === true);
    const bodyLines = bodyLayoutLines.map((line) => line.text);
    const bodyLineHeight = bodySize * 1.25;
    const bodyTop = dividerY + padding.top;
    const bodyBottom = shape.y + shape.height - padding.bottom;
    const bodyHeight = Math.max(0, bodyBottom - bodyTop);
    const bodyBlockHeight = layoutBlockHeight(bodyLayoutLines, bodyLineHeight);
    const bodyAscent = layoutFirstAscent(bodyLayoutLines, bodySize);
    const bodyAlign = shape.bodyAlign ?? 'left';
    const bodyVerticalAlign = shape.bodyVerticalAlign ?? 'top';
    const bodyX = (bodyAlign === 'left' || bodyAlign === 'justify') ? shape.x + padding.left : bodyAlign === 'right' ? shape.x + shape.width - padding.right : shape.x + padding.left + (shape.width - padding.left - padding.right) / 2;
    const bodyAnchor: 'start' | 'middle' | 'end' = (bodyAlign === 'left' || bodyAlign === 'justify') ? 'start' : bodyAlign === 'right' ? 'end' : 'middle';
    const bodyJustifyWidth = bodyAlign === 'justify' ? shape.width - padding.left - padding.right : undefined;
    const bodyFirstBaseline = bodyVerticalAlign === 'top'
        ? bodyTop + bodyAscent
        : bodyVerticalAlign === 'bottom'
            ? bodyBottom - bodyBlockHeight + bodyAscent
            : bodyTop + (bodyHeight - bodyBlockHeight) / 2 + bodyAscent;
    return { headerLines, headerSize, headerLineHeight, headerHeight, dividerY, headerFirstBaseline, bodyLines, bodyLayoutLines, bodySize, bodyLineHeight, bodyX, bodyAnchor, bodyFirstBaseline, bodyJustifyWidth };
};
export const tightTextSize = (shape: CanvasShape, size = shapeLabelFontSize(shape)) => {
    const layout = shapeLabelLayoutLines(shape, size);
    const naturalLayout = shape.labelWrap ? shapeLabelLayoutLines({ ...shape, labelWrap: false }, size) : layout;
    const runWidth = labelRunWidth(shape);
    const lineWidth = (line: LayoutLine) => line.runs.reduce((total, run) => total + runWidth(run, run.text), 0);
    const longestLine = Math.max(1, ...naturalLayout.filter((line) => !line.rule).map((line) => lineWidth(line) * (line.scale ?? 1)));
    const padding = textPadding(shape);
    const naturalWidth = longestLine * size + padding.left + padding.right;
    const lineHeight = size * (shape.type === 'text' ? TEXT_LINE_HEIGHT : 1.25);
    const label = shape.label ?? '';
    const trailingBlanks = label.match(/\n+$/)?.[0].length ?? 0;
    const keptBlanks = trailingBlanks === 0 ? 0 : layout.length - shapeLabelLayoutLines({ ...shape, label: label.replace(/\n+$/, '') }, size).length;
    const trailingBlankLines = Math.max(0, trailingBlanks - keptBlanks);
    return {
        width: shape.labelWrap ? Math.min(Math.abs(shape.width), naturalWidth) : naturalWidth,
        height: Math.max(lineHeight, layoutBlockHeight(layout, lineHeight) + trailingBlankLines * lineHeight) + padding.top + padding.bottom,
    };
};
export const shapeLabelLayout = (shape: CanvasShape) => {
    if (shape.type === 'image') {
        const layout = imageLabelLayout(shape);
        return { lines: layout.lines, size: layout.size, lineHeight: layout.lineHeight, x: layout.labelX, anchor: 'middle' as const, firstBaseline: layout.firstBaseline, dominantBaseline: undefined };
    }
    if (shape.type === 'legend') {
        const layout = legendLayout(shape);
        const padding = labelPadding(shape);
        return { lines: layout.headerLines, size: layout.headerSize, lineHeight: layout.headerLineHeight, x: shape.x + padding.left + (shape.width - padding.left - padding.right) / 2, anchor: 'middle' as const, firstBaseline: layout.headerBaseline, dominantBaseline: undefined };
    }
    if (shape.type === 'decision') {
        const lines = shapeLabelLines(shape);
        const size = shapeLabelFontSize(shape);
        const lineHeight = size * 1.25;
        const padding = labelPadding(shape);
        const contentWidth = Math.max(0, shape.width - padding.left - padding.right);
        const contentHeight = Math.max(0, shape.height - padding.top - padding.bottom);
        return {
            lines,
            size,
            lineHeight,
            x: shape.x + padding.left + contentWidth / 2,
            anchor: 'middle' as const,
            firstBaseline: shape.y + padding.top + contentHeight / 2 - ((lines.length - 1) * lineHeight) / 2,
            dominantBaseline: 'central' as const,
        };
    }
    if (shape.type === 'person') {
        const layout = personLayout(shape);
        return { lines: layout.lines, size: layout.size, lineHeight: layout.lineHeight, x: layout.labelX, anchor: 'middle' as const, firstBaseline: layout.firstBaseline, dominantBaseline: undefined };
    }
    if (shape.type === 'firewall') {
        const layout = firewallLayout(shape);
        return { lines: layout.lines, size: layout.size, lineHeight: layout.lineHeight, x: layout.labelX, anchor: 'middle' as const, firstBaseline: layout.firstBaseline, dominantBaseline: undefined };
    }
    if (shape.type === 'database2') {
        const layout = databaseIconLayout(shape);
        return { lines: layout.lines, size: layout.size, lineHeight: layout.lineHeight, x: layout.labelX, anchor: 'middle' as const, firstBaseline: layout.firstBaseline, dominantBaseline: undefined };
    }
    if (shape.type === 'panel') {
        const layout = panelLayout(shape);
        const padding = labelPadding(shape);
        const align = shape.labelAlign ?? 'center';
        const box = labelBoundsBesideIcon(shape, shape.x + padding.left, shape.x + shape.width - padding.right, shape.y, layout.dividerY);
        return {
            lines: layout.headerLines,
            size: layout.headerSize,
            lineHeight: layout.headerLineHeight,
            x: (align === 'left' || align === 'justify') ? box.left : align === 'right' ? box.right : (box.left + box.right) / 2,
            anchor: (align === 'left' || align === 'justify') ? 'start' as const : align === 'right' ? 'end' as const : 'middle' as const,
            firstBaseline: layout.headerFirstBaseline,
            dominantBaseline: undefined,
            justifyWidth: align === 'justify' ? box.right - box.left : undefined,
        };
    }
    if (shape.type === 'database' && (shape.labelVerticalAlign ?? 'middle') === 'top') {
        const lines = shapeLabelLines(shape);
        const size = shapeLabelFontSize(shape);
        const lineHeight = size * 1.25;
        const align = shape.labelAlign ?? 'center';
        const padding = labelPadding(shape);
        const x = (align === 'left' || align === 'justify') ? shape.x + padding.left : align === 'right' ? shape.x + shape.width - padding.right : shape.x + padding.left + (shape.width - padding.left - padding.right) / 2;
        const anchor: 'start' | 'end' | 'middle' = (align === 'left' || align === 'justify') ? 'start' : align === 'right' ? 'end' : 'middle';
        const justifyWidth = align === 'justify' ? shape.width - padding.left - padding.right : undefined;
        const metrics = cylinderMetrics(shape);
        return { lines, size, lineHeight, x, anchor, firstBaseline: metrics.topCenterY + metrics.radiusY + padding.top + size, dominantBaseline: undefined, justifyWidth };
    }
    const lines = shapeLabelLines(shape);
    const size = shapeLabelFontSize(shape);
    const lineHeight = size * (shape.type === 'text' ? TEXT_LINE_HEIGHT : 1.25);
    const align = shape.labelAlign ?? 'center';
    const vertical = shape.labelVerticalAlign ?? 'middle';
    const padding = labelPadding(shape);
    const contentWidth = Math.max(0, shape.width - padding.left - padding.right);
    const contentHeight = Math.max(0, shape.height - padding.top - padding.bottom);
    const anchor: 'start' | 'end' | 'middle' = (align === 'left' || align === 'justify') ? 'start' : align === 'right' ? 'end' : 'middle';
    const blockLines = shapeLabelLayoutLines(shape, size);
    const blockHeight = layoutBlockHeight(blockLines, lineHeight);
    const ascent = layoutFirstAscent(blockLines, size);
    const firstBaseline = vertical === 'top'
        ? shape.y + padding.top + ascent
        : vertical === 'bottom' ? shape.y + shape.height - padding.bottom - blockHeight + ascent : shape.y + padding.top + (contentHeight - blockHeight) / 2 + ascent;
    const box = labelBoundsBesideIcon(shape, shape.x + padding.left, shape.x + padding.left + contentWidth, firstBaseline - ascent, firstBaseline - ascent + blockHeight);
    const x = (align === 'left' || align === 'justify') ? box.left : align === 'right' ? box.right : (box.left + box.right) / 2;
    const justifyWidth = align === 'justify' ? box.right - box.left : undefined;
    return { lines, size, lineHeight, x, anchor, firstBaseline, dominantBaseline: undefined, justifyWidth };
};
export const shapeLabelTextDecoration = (shape: CanvasShape) => [shape.labelUnderline ? 'underline' : '', shape.labelStrike ? 'line-through' : ''].filter(Boolean).join(' ') || undefined;
export const bodyTextDecoration = (shape: CanvasShape) => [shape.bodyUnderline ? 'underline' : '', shape.bodyStrike ? 'line-through' : ''].filter(Boolean).join(' ') || undefined;
export const strokeDasharray = (style: CanvasShape['borderStyle'], strokeWidth: number) => {
    if (style === 'dashed')
        return `${strokeWidth * 4} ${strokeWidth * 3}`;
    if (style === 'dotted')
        return `${strokeWidth} ${strokeWidth * 2.5}`;
    return undefined;
};
