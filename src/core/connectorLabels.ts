import type { Bounds } from './geometry';
import type { Point } from './types';
import { labelLines, textWidthUnits } from './appearance';
export type ConnectorLabelGeometry = {
    center: Point;
    width: number;
    height: number;
    lines: string[];
    lineHeight: number;
    firstBaseline: number;
    rotation: number;
    bounds: Bounds;
    halfGap: number;
};
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
export const LABEL_ROUTE_SHARE = 2 / 3;
const lineWidth = (line: string, fontSize: number) => textWidthUnits(line) * fontSize;
const wrapLabelLines = (lines: string[], fontSize: number, maxWidth: number | undefined): string[] => {
    if (maxWidth === undefined)
        return lines;
    const limit = Math.max(fontSize * 2, maxWidth);
    return lines.flatMap((line) => {
        if (lineWidth(line, fontSize) <= limit)
            return [line];
        const wrapped: string[] = [];
        let current = '';
        line.split(' ').forEach((word) => {
            const candidate = current ? `${current} ${word}` : word;
            if (!current || lineWidth(candidate, fontSize) <= limit)
                current = candidate;
            else {
                wrapped.push(current);
                current = word;
            }
        });
        if (current)
            wrapped.push(current);
        return wrapped;
    });
};
export const connectorLabelBox = (label: string, fontSize: number, maxWidth?: number) => {
    const lines = wrapLabelLines(labelLines(label), fontSize, maxWidth);
    return {
        lines,
        width: Math.max(fontSize * 0.5, ...lines.map((line) => lineWidth(line, fontSize))),
        height: fontSize * 1.2 * Math.max(1, lines.length),
    };
};
export const connectorLabelGeometry = (start: Point, end: Point, label: string, fontSize: number, position = 0.5, rotation = 0, gapPadding = 10, maxWidth?: number): ConnectorLabelGeometry => {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const length = Math.hypot(deltaX, deltaY);
    const unitX = length ? deltaX / length : 1;
    const unitY = length ? deltaY / length : 0;
    const centerDistance = length * clamp(position, 0, 1);
    const center = { x: start.x + unitX * centerDistance, y: start.y + unitY * centerDistance };
    const { lines, width, height } = connectorLabelBox(label, fontSize, maxWidth);
    const lineHeight = fontSize * 1.2;
    const firstBaseline = center.y - (height - lineHeight) / 2;
    const rotationRadians = rotation * Math.PI / 180;
    const lineRadians = Math.atan2(deltaY, deltaX);
    const relativeRotation = rotationRadians - lineRadians;
    const projectedLength = Math.abs(Math.cos(relativeRotation)) * width + Math.abs(Math.sin(relativeRotation)) * height;
    const halfGap = projectedLength / 2 + gapPadding;
    const boundsHalfWidth = Math.abs(Math.cos(rotationRadians)) * width / 2 + Math.abs(Math.sin(rotationRadians)) * height / 2;
    const boundsHalfHeight = Math.abs(Math.sin(rotationRadians)) * width / 2 + Math.abs(Math.cos(rotationRadians)) * height / 2;
    return {
        center,
        width,
        height,
        lines,
        lineHeight,
        firstBaseline,
        rotation,
        bounds: {
            left: center.x - boundsHalfWidth,
            top: center.y - boundsHalfHeight,
            right: center.x + boundsHalfWidth,
            bottom: center.y + boundsHalfHeight,
        },
        halfGap,
    };
};
