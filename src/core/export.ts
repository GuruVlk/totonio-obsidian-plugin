import { bodyTextDecoration, CODE_FONT_FAMILY, databaseIconLayout, firewallLayout, imageLabelBounds, labelFontSize, layoutSpans, legendLayout, panelLayout, personLayout, plainSpans, shapeIconLayout, shapeLabelLayout, shapeLabelLayoutLines, shapeLabelTextDecoration, strokeDasharray } from './appearance';
import type { LayoutLine, TextSpan } from './appearance';
import { connectorRouteGeometry, routeSegmentPathData } from './connectorRouting';
import { CANVAS_BACKGROUND } from './colors';
import { boundsForShape, connectorPathPoints, parallelSegments, routeDrawsAsPath, shapesInPaintOrder } from './geometry';
import type { Bounds } from './geometry';
import type { CanvasShape, LegendIconType } from './types';
import { arrowPathData, bracketsPathData, cloudPathData, cylinderMetrics, cylinderPathData, panelHeaderPathData, roundedDiamondPath } from './shapePaths';
const EXPORT_PADDING = 12;
const escapeXml = (value: string) => value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!);
const number = (value: number) => Number(value.toFixed(3));
const linkWrap = (href: string | undefined, content: string) => href
    ? `<a href="${escapeXml(href)}" target="_blank" rel="noopener noreferrer">${content}</a>`
    : content;
const runDecoration = (run: {
    strike?: boolean;
    href?: string;
}) => [run.strike ? 'line-through' : '', run.href ? 'underline' : ''].filter(Boolean).join(' ');
const renderSpans = (spans: TextSpan[]) => spans.map((span) => {
    const decoration = runDecoration(span);
    const attributes = [
        span.x !== undefined ? ` x="${number(span.x)}"` : '',
        span.dy !== undefined ? ` dy="${number(span.dy)}"` : '',
        span.size !== undefined ? ` font-size="${number(span.size)}"` : '',
        span.bold ? ' font-weight="700"' : '',
        span.italic ? ' font-style="italic"' : '',
        decoration ? ` text-decoration="${decoration}"` : '',
        span.code ? ` font-family="${CODE_FONT_FAMILY}"` : '',
        span.color ? ` fill="${escapeXml(span.color)}"` : '',
    ].join('');
    return linkWrap(span.href, `<tspan${attributes}>${escapeXml(span.text)}</tspan>`);
}).join('');
// Renders one LayoutLine as inline tspans. When positioned=true sets x/dy on the first tspan.
const renderLineRuns = (runLine: LayoutLine, lineX: number, dy: number, positioned = true) => {
    const runs = runLine.runs.length > 0 && runLine.text !== '' ? runLine.runs : [{ text: ' ' }];
    return runs.map((run, i) => {
        const decoration = runDecoration(run);
        const attr = [
            positioned && i === 0 ? ` x="${number(lineX)}" dy="${number(dy)}"` : '',
            run.bold ? ' font-weight="700"' : '',
            run.italic ? ' font-style="italic"' : '',
            decoration ? ` text-decoration="${decoration}"` : '',
            run.code ? ` font-family="${CODE_FONT_FAMILY}"` : '',
            run.color ? ` fill="${escapeXml(run.color)}"` : '',
        ].join('');
        return linkWrap(run.href, `<tspan${attr}>${escapeXml(run.text)}</tspan>`);
    }).join('');
};
const renderLabel = (shape: CanvasShape) => {
    const { lines, size, lineHeight, x, anchor, firstBaseline, dominantBaseline, justifyWidth } = shapeLabelLayout(shape);
    if (!shape.label || lines.length === 0)
        return '';
    const decoration = shapeLabelTextDecoration(shape);
    const runLines = shapeLabelLayoutLines(shape);
    const indented = anchor === 'start';
    let tspans: string;
    if (justifyWidth === undefined) {
        const spans = runLines.length === lines.length
            ? layoutSpans(runLines, x, lineHeight, indented, size)
            : plainSpans(lines, x, lineHeight);
        tspans = renderSpans(spans);
    }
    else {
        tspans = runLines.map((runLine, index) => {
            const dy = index === 0 ? 0 : lineHeight;
            if (!runLine.paragraphEnd && runLine.text.includes(' ')) {
                return `<tspan x="${number(x)}" dy="${number(dy)}" textLength="${number(justifyWidth)}" lengthAdjust="spacing">${renderLineRuns(runLine, x, 0, false)}</tspan>`;
            }
            return renderLineRuns(runLine, x + (indented ? runLine.indent : 0), dy);
        }).join('');
    }
    return `<text x="${number(x)}" y="${number(firstBaseline)}" text-anchor="${anchor}"${dominantBaseline ? ` dominant-baseline="${dominantBaseline}"` : ''} fill="${escapeXml(shape.labelColor ?? '#252421')}" font-family="Avenir Next, Trebuchet MS, sans-serif" font-size="${size}" font-weight="${shape.labelBold ? 700 : 400}" font-style="${shape.labelItalic ? 'italic' : 'normal'}"${decoration ? ` text-decoration="${decoration}"` : ''}>${tspans}</text>`;
};
const renderPanelBody = (shape: CanvasShape) => {
    const layout = panelLayout(shape);
    if (!shape.body || layout.bodyLines.length === 0)
        return '';
    const decoration = bodyTextDecoration(shape);
    const indented = layout.bodyAnchor === 'start';
    let tspans: string;
    if (layout.bodyJustifyWidth === undefined) {
        tspans = renderSpans(layoutSpans(layout.bodyLayoutLines, layout.bodyX, layout.bodyLineHeight, indented, layout.bodySize));
    }
    else {
        tspans = layout.bodyLayoutLines.map((runLine, index) => {
            const dy = index === 0 ? 0 : layout.bodyLineHeight;
            if (!runLine.paragraphEnd && runLine.text.includes(' ')) {
                return `<tspan x="${number(layout.bodyX)}" dy="${number(dy)}" textLength="${number(layout.bodyJustifyWidth!)}" lengthAdjust="spacing">${renderLineRuns(runLine, layout.bodyX, 0, false)}</tspan>`;
            }
            return renderLineRuns(runLine, layout.bodyX + (indented ? runLine.indent : 0), dy);
        }).join('');
    }
    return `<text x="${number(layout.bodyX)}" y="${number(layout.bodyFirstBaseline)}" text-anchor="${layout.bodyAnchor}" fill="${escapeXml(shape.bodyColor ?? shape.labelColor ?? '#252421')}" font-family="Avenir Next, Trebuchet MS, sans-serif" font-size="${layout.bodySize}" font-weight="${shape.bodyBold ? 700 : 400}" font-style="${shape.bodyItalic ? 'italic' : 'normal'}"${decoration ? ` text-decoration="${decoration}"` : ''}>${tspans}</text>`;
};
const rotationTransform = (shape: CanvasShape) => {
    const rotation = shape.rotation ?? 0;
    if (!rotation)
        return '';
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;
    return ` transform="rotate(${number(rotation)} ${number(centerX)} ${number(centerY)})"`;
};
const legendIconMarkup = (type: LegendIconType) => {
    if (type === 'rect')
        return '<rect x="3" y="3" width="18" height="18" rx="2" />';
    if (type === 'brackets')
        return '<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />';
    if (type === 'arrow')
        return '<path d="M6 8h6V4l8 8-8 8v-4H6z" />';
    if (type === 'circle')
        return '<circle cx="12" cy="12" r="10" />';
    if (type === 'decision')
        return '<path d="M12 2 22 12 12 22 2 12Z" />';
    if (type === 'cloud')
        return '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z" />';
    if (type === 'person')
        return '<circle cx="12" cy="8" r="4" /><path d="M4 22a8 8 0 0 1 16 0" />';
    if (type === 'panel')
        return '<rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" />';
    if (type === 'database')
        return '<ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5" />';
    if (type === 'database2')
        return '<ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" />';
    if (type === 'firewall')
        return '<rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M8 3v6M16 3v6M12 9v6M8 15v6M16 15v6" />';
    if (type === 'text')
        return '<path d="M4 7V4h16v3M9 20h6M12 4v16" />';
    if (type === 'line')
        return '<path d="m10.586 5.414-5.172 5.172" /><path d="m18.586 13.414-5.172 5.172" /><path d="M6 12h12" /><circle cx="12" cy="20" r="2" /><circle cx="12" cy="4" r="2" /><circle cx="20" cy="12" r="2" /><circle cx="4" cy="12" r="2" />';
    return '<path d="M5 12h14" />';
};
const renderCornerIcon = (shape: CanvasShape) => {
    const layout = shapeIconLayout(shape);
    return layout ? `<image x="${number(layout.x)}" y="${number(layout.y)}" width="${number(layout.size)}" height="${number(layout.size)}" href="${escapeXml(shape.iconData!)}" preserveAspectRatio="xMidYMid meet" />` : '';
};
const renderShape = (shape: CanvasShape, shapes: CanvasShape[]) => {
    const cornerRadius = shape.cornerStyle === 'sharp' ? 0 : 5;
    if (shape.type === 'group')
        return '';
    if (shape.type === 'image') {
        if (!shape.imageData)
            return '';
        const transform = rotationTransform(shape);
        if (!shape.label?.trim())
            return `<image${transform} x="${number(shape.x)}" y="${number(shape.y)}" width="${number(shape.width)}" height="${number(shape.height)}" href="${escapeXml(shape.imageData)}" preserveAspectRatio="none" />`;
        const content = `<image x="${number(shape.x)}" y="${number(shape.y)}" width="${number(shape.width)}" height="${number(shape.height)}" href="${escapeXml(shape.imageData)}" preserveAspectRatio="none" />${renderLabel(shape)}`;
        return `<g${transform}>${content}</g>`;
    }
    if (shape.type === 'text') {
        const label = renderLabel(shape);
        if (!label)
            return '';
        const transform = rotationTransform(shape);
        return transform ? `<g${transform}>${label}</g>` : label;
    }
    const strokeWidth = shape.strokeWidth ?? 2;
    const dash = strokeDasharray(shape.borderStyle, strokeWidth);
    const style = `fill="${shape.fill === 'transparent' || shape.type === 'line' || shape.type === 'plain-line' ? 'none' : escapeXml(shape.fill ?? '#ffffff')}" stroke="${escapeXml(shape.color)}" stroke-width="${strokeWidth}"${dash ? ` stroke-dasharray="${dash}"` : ''}`;
    if (shape.type === 'line' || shape.type === 'plain-line') {
        const route = connectorRouteGeometry(connectorPathPoints(shape, shapes), shape.arrowDirection, strokeWidth, shape.label, labelFontSize(shape.labelSize), shape.labelPosition, shape.labelRotation, shape.labelWrap);
        const shaftParts = route.shaftParts;
        const parallelParts = shaftParts.map((part) => parallelSegments(part.start, part.end, strokeWidth));
        const visibleShaftParts = (shape.borderStyle === 'double' ? [parallelParts.map((parts) => parts[0]), parallelParts.map((parts) => parts[1])].flat() : shaftParts)
            .filter((part) => Math.hypot(part.end.x - part.start.x, part.end.y - part.start.y) > 0.001);
        const shaftMarkup = routeDrawsAsPath(shape)
            ? routeSegmentPathData(visibleShaftParts).map((path) => `<path d="${path}" ${style} stroke-linecap="butt" stroke-linejoin="${shape.cornerStyle === 'sharp' ? 'miter' : 'round'}" />`).join('')
            : visibleShaftParts.map((part) => `<line x1="${number(part.start.x)}" y1="${number(part.start.y)}" x2="${number(part.end.x)}" y2="${number(part.end.y)}" ${style} stroke-linecap="butt" />`).join('');
        const arrowMarkup = [route.startArrow, route.endArrow].filter((head): head is NonNullable<typeof head> => Boolean(head)).map((head) => `<path d="M ${number(head.tip.x)} ${number(head.tip.y)} L ${number(head.left.x)} ${number(head.left.y)} L ${number(head.right.x)} ${number(head.right.y)} Z" fill="${escapeXml(shape.color)}" stroke="none" />`).join('');
        return `${shaftMarkup}${arrowMarkup}`;
    }
    const transform = rotationTransform(shape);
    if (shape.type === 'circle') {
        return `<g${transform}><ellipse cx="${number(shape.x + shape.width / 2)}" cy="${number(shape.y + shape.height / 2)}" rx="${number(Math.abs(shape.width) / 2)}" ry="${number(Math.abs(shape.height) / 2)}" ${style} />${renderLabel(shape)}</g>`;
    }
    if (shape.type === 'decision')
        return `<g${transform}><path d="${roundedDiamondPath(shape, cornerRadius)}" ${style} />${renderLabel(shape)}</g>`;
    if (shape.type === 'cloud')
        return `<g${transform}><path d="${cloudPathData(shape, strokeWidth)}" ${style} />${renderLabel(shape)}</g>`;
    if (shape.type === 'arrow')
        return `<g${transform}><path d="${arrowPathData(shape)}" ${style} stroke-linejoin="round" />${renderLabel(shape)}</g>`;
    if (shape.type === 'brackets') {
        const left = Math.min(shape.x, shape.x + shape.width);
        const top = Math.min(shape.y, shape.y + shape.height);
        const fill = shape.fill === 'transparent' ? 'none' : escapeXml(shape.fill ?? '#ffffff');
        const background = fill === 'none' ? '' : `<rect x="${number(left)}" y="${number(top)}" width="${number(Math.abs(shape.width))}" height="${number(Math.abs(shape.height))}" fill="${fill}" stroke="none" />`;
        return `<g${transform}>${background}<path d="${bracketsPathData(shape)}" fill="none" stroke="${escapeXml(shape.color)}" stroke-width="${strokeWidth}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linecap="butt" stroke-linejoin="miter" />${renderLabel(shape)}</g>`;
    }
    if (shape.type === 'person') {
        const { iconSize, iconX, iconY } = personLayout(shape);
        const iconStrokeWidth = strokeWidth * 0.75;
        const personStyle = style.replace(`stroke-width="${strokeWidth}"`, `stroke-width="${number(iconStrokeWidth)}"`);
        const centerX = iconX + iconSize / 2;
        return `<g${transform}><circle cx="${number(centerX)}" cy="${number(iconY + iconSize / 2)}" r="${number(iconSize / 2)}" ${personStyle} /><circle cx="${number(centerX)}" cy="${number(iconY + iconSize * 0.375)}" r="${number(iconSize * 0.125)}" fill="none" stroke="${escapeXml(shape.color)}" stroke-width="${number(iconStrokeWidth)}"${dash ? ` stroke-dasharray="${dash}"` : ''} /><path d="M ${number(iconX + iconSize * 0.25)} ${number(iconY + iconSize * 0.83)} C ${number(iconX + iconSize * 0.27)} ${number(iconY + iconSize * 0.65)}, ${number(iconX + iconSize * 0.73)} ${number(iconY + iconSize * 0.65)}, ${number(iconX + iconSize * 0.75)} ${number(iconY + iconSize * 0.83)}" fill="none" stroke="${escapeXml(shape.color)}" stroke-width="${number(iconStrokeWidth)}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linecap="round" />${renderLabel(shape)}</g>`;
    }
    if (shape.type === 'panel') {
        const layout = panelLayout(shape);
        const separatorWidth = shape.separatorWidth ?? shape.strokeWidth ?? 2;
        const separatorDash = strokeDasharray(shape.separatorStyle ?? shape.borderStyle, separatorWidth);
        const headerFill = shape.headerFill ? `<path d="${panelHeaderPathData(shape, layout.dividerY, cornerRadius)}" fill="${shape.headerFill === 'transparent' ? 'none' : escapeXml(shape.headerFill)}" stroke="none" /><rect x="${number(shape.x)}" y="${number(shape.y)}" width="${number(shape.width)}" height="${number(shape.height)}" rx="${cornerRadius}" fill="none" stroke="${escapeXml(shape.color)}" stroke-width="${strokeWidth}"${dash ? ` stroke-dasharray="${dash}"` : ''} />` : '';
        return `<g${transform}><rect x="${number(shape.x)}" y="${number(shape.y)}" width="${number(shape.width)}" height="${number(shape.height)}" rx="${cornerRadius}" ${style} />${headerFill}${renderCornerIcon(shape)}${renderLabel(shape)}<line x1="${number(shape.x)}" y1="${number(layout.dividerY)}" x2="${number(shape.x + shape.width)}" y2="${number(layout.dividerY)}" fill="none" stroke="${escapeXml(shape.separatorColor ?? shape.color)}" stroke-width="${number(separatorWidth)}"${separatorDash ? ` stroke-dasharray="${separatorDash}"` : ''} />${renderPanelBody(shape)}</g>`;
    }
    if (shape.type === 'legend') {
        const layout = legendLayout(shape);
        const separatorWidth = shape.separatorWidth ?? shape.strokeWidth ?? 2;
        const separatorDash = strokeDasharray(shape.separatorStyle ?? shape.borderStyle, separatorWidth);
        const items = (shape.legendItems ?? []).map((item, index) => {
            const rowY = layout.contentTop + index * layout.rowHeight;
            const scale = number(layout.iconSize / 24);
            const fill = item.fill === 'transparent' || item.icon === 'database' || item.icon === 'database2' || item.icon === 'line' || item.icon === 'text' ? 'none' : escapeXml(item.fill);
            const databaseFill = (item.icon === 'database' || item.icon === 'database2') && item.fill !== 'transparent' ? `<path transform="translate(${number(shape.x + 10)} ${number(rowY)}) scale(${scale})" d="M3 5 A9 3 0 0 1 21 5 V19 A9 3 0 0 1 3 19 Z" fill="${escapeXml(item.fill)}" stroke="none" />` : '';
            const lineStyle = item.borderStyle ?? 'solid';
            const lineMarkup = lineStyle === 'dotted'
                ? `<circle cx="4" cy="12" r="2" fill="${escapeXml(item.color)}" stroke="none" /><circle cx="12" cy="12" r="2" fill="${escapeXml(item.color)}" stroke="none" /><circle cx="20" cy="12" r="2" fill="${escapeXml(item.color)}" stroke="none" />`
                : lineStyle === 'dashed' ? '<path d="M3 12h4M10 12h4M17 12h4" />' : '<path d="M5 12h14" />';
            const iconMarkup = item.icon === 'plain-line' ? lineMarkup : legendIconMarkup(item.icon);
            const itemDash = item.icon === 'plain-line' ? undefined : strokeDasharray(item.borderStyle, 2);
            const decoration = shapeLabelTextDecoration(shape);
            return `<g>${databaseFill}<g transform="translate(${number(shape.x + 10)} ${number(rowY)}) scale(${scale})" fill="${fill}" stroke="${escapeXml(item.color)}" stroke-width="2"${itemDash ? ` stroke-dasharray="${itemDash}"` : ''} stroke-linecap="round" stroke-linejoin="round">${iconMarkup}</g><text x="${number(shape.x + 36)}" y="${number(rowY + layout.iconSize / 2)}" dominant-baseline="central" fill="${escapeXml(shape.labelColor ?? '#252421')}" font-family="Avenir Next, Trebuchet MS, sans-serif" font-size="10" font-weight="${shape.labelBold ? 700 : 400}" font-style="${shape.labelItalic ? 'italic' : 'normal'}"${decoration ? ` text-decoration="${decoration}"` : ''}>${escapeXml(item.label)}</text></g>`;
        }).join('');
        return `<g${transform}><rect x="${number(shape.x)}" y="${number(shape.y)}" width="${number(shape.width)}" height="${number(shape.height)}" rx="${cornerRadius}" ${style} />${renderLabel(shape)}<line x1="${number(shape.x)}" y1="${number(layout.dividerY)}" x2="${number(shape.x + shape.width)}" y2="${number(layout.dividerY)}" fill="none" stroke="${escapeXml(shape.separatorColor ?? shape.color)}" stroke-width="${number(separatorWidth)}"${separatorDash ? ` stroke-dasharray="${separatorDash}"` : ''} />${items}</g>`;
    }
    if (shape.type === 'database') {
        const metrics = cylinderMetrics(shape);
        const fill = shape.fill === 'transparent' ? 'none' : escapeXml(shape.fill ?? '#ffffff');
        return `<g${transform}><path d="${cylinderPathData(shape)}" ${style} /><ellipse cx="${number(metrics.centerX)}" cy="${number(metrics.topCenterY)}" rx="${number(metrics.radiusX)}" ry="${number(metrics.radiusY)}" fill="${fill}" stroke="${escapeXml(shape.color)}" stroke-width="${strokeWidth}"${dash ? ` stroke-dasharray="${dash}"` : ''} />${renderLabel(shape)}</g>`;
    }
    if (shape.type === 'firewall') {
        const layout = firewallLayout(shape);
        const scale = layout.scale;
        const iconStrokeWidth = strokeWidth / Math.max(scale, 0.001);
        const fill = shape.fill === 'transparent' ? 'none' : escapeXml(shape.fill ?? '#ffffff');
        return `<g${transform}><rect x="${number(layout.wallX + 3 * scale)}" y="${number(layout.wallY + 3 * scale)}" width="${number(18 * scale)}" height="${number(18 * scale)}" rx="${number(2 * scale)}" fill="${fill}" stroke="none" /><g transform="translate(${number(layout.wallX)} ${number(layout.wallY)}) scale(${number(scale)})" fill="none" stroke="${escapeXml(shape.color)}" stroke-width="${number(iconStrokeWidth)}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 9v6" /><path d="M16 15v6" /><path d="M16 3v6" /><path d="M3 15h18" /><path d="M3 9h18" /><path d="M8 15v6" /><path d="M8 3v6" /></g>${renderLabel(shape)}</g>`;
    }
    if (shape.type === 'database2') {
        const layout = databaseIconLayout(shape);
        const scale = layout.scale;
        const iconStrokeWidth = strokeWidth / Math.max(scale, 0.001);
        const fill = shape.fill === 'transparent' ? 'none' : escapeXml(shape.fill ?? '#ffffff');
        return `<g${transform}><path transform="translate(${number(layout.iconX)} ${number(layout.iconY)}) scale(${number(scale)})" d="M3 5 A9 3 0 0 1 21 5 V19 A9 3 0 0 1 3 19 Z" fill="${fill}" stroke="none" /><g transform="translate(${number(layout.iconX)} ${number(layout.iconY)}) scale(${number(scale)})" fill="none" stroke="${escapeXml(shape.color)}" stroke-width="${number(iconStrokeWidth)}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></g>${renderLabel(shape)}</g>`;
    }
    return `<g${transform}><rect x="${number(shape.x)}" y="${number(shape.y)}" width="${number(shape.width)}" height="${number(shape.height)}" rx="${cornerRadius}" ${style} />${renderCornerIcon(shape)}${renderLabel(shape)}</g>`;
};
const renderConnectorLabel = (shape: CanvasShape, shapes: CanvasShape[]) => {
    if ((shape.type !== 'line' && shape.type !== 'plain-line') || !shape.label)
        return '';
    const layout = connectorRouteGeometry(connectorPathPoints(shape, shapes), shape.arrowDirection, shape.strokeWidth ?? 2, shape.label, labelFontSize(shape.labelSize), shape.labelPosition, shape.labelRotation, shape.labelWrap).labelLayout!;
    const decoration = shapeLabelTextDecoration(shape);
    const transform = layout.rotation ? ` transform="rotate(${number(layout.rotation)} ${number(layout.center.x)} ${number(layout.center.y)})"` : '';
    const rows = layout.lines.map((line, index) => `<tspan x="${number(layout.center.x)}" dy="${index === 0 ? 0 : number(layout.lineHeight)}">${escapeXml(line || ' ')}</tspan>`).join('');
    return `<text x="${number(layout.center.x)}" y="${number(layout.firstBaseline)}" text-anchor="middle" dominant-baseline="central"${transform} fill="${escapeXml(shape.labelColor ?? shape.color)}" font-family="Avenir Next, Trebuchet MS, sans-serif" font-size="${labelFontSize(shape.labelSize)}" font-weight="${shape.labelBold ? 700 : 400}" font-style="${shape.labelItalic ? 'italic' : 'normal'}"${decoration ? ` text-decoration="${decoration}"` : ''}>${rows}</text>`;
};
const rotatedExportBounds = (shape: CanvasShape, bounds: Bounds): Bounds => {
    const rotation = shape.rotation ?? 0;
    if (!rotation || shape.type === 'line' || shape.type === 'plain-line')
        return bounds;
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;
    const radians = rotation * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const corners = [
        { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
        { x: bounds.right, y: bounds.bottom }, { x: bounds.left, y: bounds.bottom },
    ].map((point) => {
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        return { x: centerX + dx * cos - dy * sin, y: centerY + dx * sin + dy * cos };
    });
    return {
        left: Math.min(...corners.map((point) => point.x)),
        top: Math.min(...corners.map((point) => point.y)),
        right: Math.max(...corners.map((point) => point.x)),
        bottom: Math.max(...corners.map((point) => point.y)),
    };
};
const exportBounds = (shapes: CanvasShape[]): Bounds | null => {
    const visible = shapes.filter((shape) => shape.type !== 'group');
    if (visible.length === 0)
        return null;
    const bounds = visible.map((shape) => {
        const ownBounds = shape.type === 'image' && shape.label?.trim() ? imageLabelBounds(shape) : boundsForShape(shape, shapes);
        const shapeBounds = rotatedExportBounds(shape, ownBounds);
        if ((shape.type !== 'line' && shape.type !== 'plain-line') || !shape.label)
            return shapeBounds;
        const layout = connectorRouteGeometry(connectorPathPoints(shape, shapes), shape.arrowDirection, shape.strokeWidth ?? 2, shape.label, labelFontSize(shape.labelSize), shape.labelPosition, shape.labelRotation, shape.labelWrap).labelLayout!;
        return {
            left: Math.min(shapeBounds.left, layout.bounds.left),
            top: Math.min(shapeBounds.top, layout.bounds.top),
            right: Math.max(shapeBounds.right, layout.bounds.right),
            bottom: Math.max(shapeBounds.bottom, layout.bounds.bottom),
        };
    });
    return {
        left: Math.min(...bounds.map((item) => item.left)) - EXPORT_PADDING,
        top: Math.min(...bounds.map((item) => item.top)) - EXPORT_PADDING,
        right: Math.max(...bounds.map((item) => item.right)) + EXPORT_PADDING,
        bottom: Math.max(...bounds.map((item) => item.bottom)) + EXPORT_PADDING,
    };
};
export type SvgExport = {
    svg: string;
    width: number;
    height: number;
};
const renderSvgDocument = (shapes: CanvasShape[], bounds: Bounds, background: string | null): SvgExport => {
    const width = Math.max(1, bounds.right - bounds.left);
    const height = Math.max(1, bounds.bottom - bounds.top);
    const paintOrder = shapesInPaintOrder(shapes);
    const content = paintOrder.map((shape) => renderShape(shape, shapes)).join('') + paintOrder.map((shape) => renderConnectorLabel(shape, shapes)).join('');
    return {
        width,
        height,
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${number(width)}" height="${number(height)}" viewBox="${number(bounds.left)} ${number(bounds.top)} ${number(width)} ${number(height)}">${background === null ? '' : `<rect class="export-background" x="${number(bounds.left)}" y="${number(bounds.top)}" width="${number(width)}" height="${number(height)}" fill="${escapeXml(background)}" />`}${content}</svg>`,
    };
};
// Whole-diagram export only: the web app's selection and tag-filter dimming are not ported.
export const exportSvg = (sourceShapes: CanvasShape[], background: string | null = CANVAS_BACKGROUND): SvgExport | null => {
    const shapes = sourceShapes.filter((shape) => shape.type !== 'frame');
    const bounds = exportBounds(shapes);
    return bounds ? renderSvgDocument(shapes, bounds, background) : null;
};
