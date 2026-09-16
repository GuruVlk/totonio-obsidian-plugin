export type TextRun = {
    text: string;
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strike?: boolean;
    href?: string;
};
export type CellAlign = 'left' | 'center' | 'right';
export type MarkdownLine = {
    kind: 'paragraph';
    runs: TextRun[];
} | {
    kind: 'heading';
    level: number;
    runs: TextRun[];
} | {
    kind: 'list';
    glyph: string;
    depth: number;
    runs: TextRun[];
} | {
    kind: 'quote';
    depth: number;
    runs: TextRun[];
} | {
    kind: 'code';
    runs: TextRun[];
} | {
    kind: 'rule';
} | {
    kind: 'row';
    cells: TextRun[][];
    aligns: CellAlign[];
    header: boolean;
};
export const HEADING_SCALES = [1.9, 1.55, 1.3, 1.12, 1, 0.9];
export const QUOTE_GLYPH = '\u2502';
export const RULE_GLYPH = '\u2500';
const BULLET_PATTERN = /^([ \t]*)[-*+][ \t]+(?:\[([ xX])\][ \t]+)?(.*)$/;
const ORDERED_PATTERN = /^([ \t]*)(\d{1,9})[.)][ \t]+(.*)$/;
const HEADING_PATTERN = /^ {0,3}(#{1,6})[ \t]+(.*)$/;
const QUOTE_PATTERN = /^ {0,3}(>+)[ \t]?(.*)$/;
const RULE_PATTERN = /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
const FENCE_PATTERN = /^ {0,3}(?:```|~~~)/;
const DELIMITER_CELL_PATTERN = /^:?-{3,}:?$/;
const INLINE_PATTERN = new RegExp([
    '`(?<code>[^`]+)`',
    '!?\\[(?<link>[^\\]]*)\\]\\((?<href>[^)]*)\\)',
    '\\*\\*\\*(?<bolditalic>\\S(?:[^*]*\\S)?)\\*\\*\\*',
    '\\*\\*(?<bold>\\S(?:[^*]*\\S)?)\\*\\*',
    '\\*(?<italic>\\S(?:[^*]*\\S)?)\\*',
    '~~(?<strike>\\S(?:[^~]*\\S)?)~~',
].join('|'), 'g');
const safeLinkHref = (href: string) => /^(?:https?:|mailto:)/i.test(href.trim()) ? href.trim() : undefined;
const indentDepth = (leading: string) => Math.min(4, Math.floor(leading.replace(/\t/g, '  ').length / 2));
export const parseInlineRuns = (text: string): TextRun[] => {
    const runs: TextRun[] = [];
    let consumed = 0;
    for (const match of text.matchAll(INLINE_PATTERN)) {
        const start = match.index ?? 0;
        const groups = match.groups ?? {};
        if (start > consumed)
            runs.push({ text: text.slice(consumed, start) });
        if (groups.code !== undefined)
            runs.push({ text: groups.code, code: true });
        else if (groups.link !== undefined)
            runs.push({ text: groups.link, href: safeLinkHref(groups.href ?? '') });
        else if (groups.bolditalic !== undefined)
            runs.push({ text: groups.bolditalic, bold: true, italic: true });
        else if (groups.bold !== undefined)
            runs.push({ text: groups.bold, bold: true });
        else if (groups.italic !== undefined)
            runs.push({ text: groups.italic, italic: true });
        else if (groups.strike !== undefined)
            runs.push({ text: groups.strike, strike: true });
        consumed = start + match[0].length;
    }
    if (consumed < text.length)
        runs.push({ text: text.slice(consumed) });
    return runs.length > 0 ? runs : [{ text }];
};
export const runsText = (runs: TextRun[]) => runs.map((run) => run.text).join('');
const styleRuns = (runs: TextRun[], style: Partial<TextRun>) => runs.map((run) => ({ ...run, ...style }));
const splitCells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
const isTableRow = (line: string | undefined): line is string => line !== undefined && line.includes('|');
const isTableDelimiter = (line: string | undefined) => {
    if (!isTableRow(line))
        return false;
    const cells = splitCells(line);
    return cells.length > 1 && cells.every((cell) => DELIMITER_CELL_PATTERN.test(cell));
};
const cellAligns = (delimiter: string): CellAlign[] => splitCells(delimiter).map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    return left && right ? 'center' : right ? 'right' : 'left';
});
const listLine = (line: string, counters: number[]): MarkdownLine | null => {
    const bullet = BULLET_PATTERN.exec(line);
    if (bullet) {
        const [, leading, task, content] = bullet;
        counters.length = 0;
        return { kind: 'list', glyph: task === undefined ? '\u2022' : task.toLowerCase() === 'x' ? '\u2611' : '\u2610', depth: indentDepth(leading), runs: parseInlineRuns(content) };
    }
    const ordered = ORDERED_PATTERN.exec(line);
    if (!ordered)
        return null;
    const [, leading, start, content] = ordered;
    const depth = indentDepth(leading);
    const previous = counters.length > depth ? counters[depth] : undefined;
    counters.length = depth + 1;
    counters[depth] = previous === undefined ? Number(start) : previous + 1;
    return { kind: 'list', glyph: `${counters[depth]}.`, depth, runs: parseInlineRuns(content) };
};
export const parseMarkdownLines = (lines: string[]): MarkdownLine[] => {
    const parsed: MarkdownLine[] = [];
    let counters: number[] = [];
    let fenced = false;
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (FENCE_PATTERN.test(line)) {
            fenced = !fenced;
            counters = [];
            continue;
        }
        if (fenced) {
            parsed.push({ kind: 'code', runs: [{ text: line, code: true }] });
            continue;
        }
        if (RULE_PATTERN.test(line)) {
            counters = [];
            parsed.push({ kind: 'rule' });
            continue;
        }
        const heading = HEADING_PATTERN.exec(line);
        if (heading) {
            counters = [];
            parsed.push({ kind: 'heading', level: heading[1].length, runs: styleRuns(parseInlineRuns(heading[2]), { bold: true }) });
            continue;
        }
        if (isTableRow(line) && isTableDelimiter(lines[index + 1])) {
            const aligns = cellAligns(lines[index + 1]);
            counters = [];
            parsed.push({ kind: 'row', cells: splitCells(line).map((cell) => styleRuns(parseInlineRuns(cell), { bold: true })), aligns, header: true });
            index += 1;
            while (isTableRow(lines[index + 1]) && !isTableDelimiter(lines[index + 1])) {
                index += 1;
                parsed.push({ kind: 'row', cells: splitCells(lines[index]).map((cell) => parseInlineRuns(cell)), aligns, header: false });
            }
            continue;
        }
        const quote = QUOTE_PATTERN.exec(line);
        if (quote) {
            counters = [];
            parsed.push({ kind: 'quote', depth: Math.min(4, quote[1].length - 1), runs: parseInlineRuns(quote[2]) });
            continue;
        }
        const item = listLine(line, counters);
        if (!item)
            counters = [];
        parsed.push(item ?? { kind: 'paragraph', runs: parseInlineRuns(line) });
    }
    return parsed;
};
