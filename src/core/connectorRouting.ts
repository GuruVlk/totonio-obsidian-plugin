import { arrowGeometry } from './arrowheads';
import type { Arrowhead } from './arrowheads';
import { connectorLabelGeometry, LABEL_ROUTE_SHARE } from './connectorLabels';
import type { ConnectorLabelGeometry } from './connectorLabels';
import { pointAtPolylinePosition, pointAtSegmentPosition, polylineLength, segmentLength } from './geometry';
import type { ArrowDirection, Point } from './types';
export type RouteSegment = {
    start: Point;
    end: Point;
};
const LABEL_GAP_RATIO = 0.1;
const includesStartArrow = (direction: ArrowDirection | undefined) => direction === 'start' || direction === 'both';
const includesEndArrow = (direction: ArrowDirection | undefined) => direction === 'end' || direction === 'both';
const routedArrowhead = (tip: Point, base: Point, halfWidth: number): Arrowhead | null => {
    const deltaX = tip.x - base.x;
    const deltaY = tip.y - base.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (!distance)
        return null;
    const directionX = deltaX / distance;
    const directionY = deltaY / distance;
    return {
        tip,
        left: { x: base.x - directionY * halfWidth, y: base.y + directionX * halfWidth },
        right: { x: base.x + directionY * halfWidth, y: base.y - directionX * halfWidth },
    };
};
export const routeSegmentPathData = (parts: RouteSegment[]): string[] => {
    const paths: string[] = [];
    let current = '';
    parts.forEach((part, index) => {
        const connected = current && pathsEqual(parts[index - 1]?.end, part.start);
        if (!connected) {
            if (current)
                paths.push(current);
            current = `M ${part.start.x} ${part.start.y}`;
        }
        current += ` L ${part.end.x} ${part.end.y}`;
    });
    if (current)
        paths.push(current);
    return paths;
};
const pathsEqual = (first: Point | undefined, second: Point) => Boolean(first && Math.abs(first.x - second.x) < 0.001 && Math.abs(first.y - second.y) < 0.001);
const trimRouteSegments = (segments: RouteSegment[], startDistance: number, endDistance: number): RouteSegment[] => {
    const trimmed = segments.map((segment) => ({ start: { ...segment.start }, end: { ...segment.end } }));
    let remainingStart = startDistance;
    for (const segment of trimmed) {
        if (remainingStart <= 0)
            break;
        const length = segmentLength(segment.start, segment.end);
        if (remainingStart >= length) {
            remainingStart -= length;
            segment.start = { ...segment.end };
        }
        else if (length) {
            const ratio = remainingStart / length;
            segment.start = { x: segment.start.x + (segment.end.x - segment.start.x) * ratio, y: segment.start.y + (segment.end.y - segment.start.y) * ratio };
            remainingStart = 0;
        }
    }
    let remainingEnd = endDistance;
    for (let index = trimmed.length - 1; index >= 0; index -= 1) {
        if (remainingEnd <= 0)
            break;
        const segment = trimmed[index];
        const length = segmentLength(segment.start, segment.end);
        if (remainingEnd >= length) {
            remainingEnd -= length;
            segment.end = { ...segment.start };
        }
        else if (length) {
            const ratio = remainingEnd / length;
            segment.end = { x: segment.end.x + (segment.start.x - segment.end.x) * ratio, y: segment.end.y + (segment.start.y - segment.end.y) * ratio };
            remainingEnd = 0;
        }
    }
    return trimmed;
};
const splitRouteSegments = (segments: RouteSegment[], gapStart: number, gapEnd: number): RouteSegment[] => {
    const parts: RouteSegment[] = [];
    let traversed = 0;
    for (const segment of segments) {
        const length = segmentLength(segment.start, segment.end);
        if (length > 0) {
            const clip = (from: number, to: number) => {
                const lower = Math.max(traversed, from);
                const upper = Math.min(traversed + length, to);
                if (upper - lower <= 0.001)
                    return;
                parts.push({
                    start: pointAtSegmentPosition(segment.start, segment.end, (lower - traversed) / length),
                    end: pointAtSegmentPosition(segment.start, segment.end, (upper - traversed) / length),
                });
            };
            clip(Number.NEGATIVE_INFINITY, gapStart);
            clip(gapEnd, Number.POSITIVE_INFINITY);
        }
        traversed += length;
    }
    return parts;
};
const routeGeometryCache = new WeakMap<Point[], {
    key: string;
    value: RouteGeometry;
}>();
export const connectorRouteGeometry = (points: Point[], direction: ArrowDirection | undefined, strokeWidth: number, label?: string, labelFontSize = 12, labelPosition = 0.5, labelRotation = 0, labelWrap = false, zoomScale = 1): RouteGeometry => {
    const key = `${direction}|${strokeWidth}|${label ?? ''}|${labelFontSize}|${labelPosition}|${labelRotation}|${labelWrap}|${zoomScale}`;
    const cached = routeGeometryCache.get(points);
    if (cached?.key === key)
        return cached.value;
    const value = computeConnectorRouteGeometry(points, direction, strokeWidth, label, labelFontSize, labelPosition, labelRotation, labelWrap, zoomScale);
    routeGeometryCache.set(points, { key, value });
    return value;
};
type RouteGeometry = {
    shaftParts: RouteSegment[];
    startArrow: Arrowhead | null;
    endArrow: Arrowhead | null;
    labelLayout: ConnectorLabelGeometry | null;
};
const computeConnectorRouteGeometry = (points: Point[], direction: ArrowDirection | undefined, strokeWidth: number, label: string | undefined, labelFontSize: number, labelPosition: number, labelRotation: number, labelWrap: boolean, zoomScale: number): RouteGeometry => {
    const segments = points.slice(1).map((end, index) => ({ start: points[index], end }));
    if (segments.length === 0)
        return { shaftParts: [], startArrow: null, endArrow: null, labelLayout: null };
    const first = segments[0];
    const last = segments.at(-1)!;
    const routed = points.length > 2;
    const requestedLength = Math.max(10, strokeWidth * 4) * zoomScale;
    const routeLength = polylineLength(points);
    const arrowCount = Number(includesStartArrow(direction)) + Number(includesEndArrow(direction));
    const routeArrowLength = Math.min(requestedLength, routeLength * (arrowCount === 2 ? 0.225 : 0.45));
    const routeHalfWidth = Math.min(Math.max(4, strokeWidth * 1.75) * zoomScale, routeArrowLength * 0.8);
    const startGeometry = arrowGeometry(first.start, first.end, routed ? 'none' : includesStartArrow(direction) ? 'start' : 'none', strokeWidth, zoomScale);
    const endGeometry = arrowGeometry(last.start, last.end, routed ? 'none' : includesEndArrow(direction) ? 'end' : 'none', strokeWidth, zoomScale);
    const startArrowBase = pointAtPolylinePosition(points, routeLength ? routeArrowLength / routeLength : 0);
    const endArrowBase = pointAtPolylinePosition(points, routeLength ? 1 - routeArrowLength / routeLength : 1);
    const startArrow = routed && includesStartArrow(direction) ? routedArrowhead(points[0], startArrowBase, routeHalfWidth) : startGeometry.start ?? null;
    const endArrow = routed && includesEndArrow(direction) ? routedArrowhead(points.at(-1)!, endArrowBase, routeHalfWidth) : endGeometry.end ?? null;
    const shortened = routed
        ? trimRouteSegments(segments, startArrow ? routeArrowLength : 0, endArrow ? routeArrowLength : 0)
        : segments.map((segment, index) => ({
            start: index === 0 ? startGeometry.shaftStart : segment.start,
            end: index === segments.length - 1 ? endGeometry.shaftEnd : segment.end,
        }));
    if (!label)
        return { shaftParts: shortened, startArrow, endArrow, labelLayout: null };
    const targetDistance = routeLength * Math.max(0, Math.min(1, labelPosition));
    let traversed = 0;
    let labelSegment = segments[0];
    for (const segment of segments) {
        const length = segmentLength(segment.start, segment.end);
        labelSegment = segment;
        if (traversed + length >= targetDistance)
            break;
        traversed += length;
    }
    const tangentDelta = segmentLength(labelSegment.start, labelSegment.end)
        ? { x: labelSegment.end.x - labelSegment.start.x, y: labelSegment.end.y - labelSegment.start.y }
        : { x: points.at(-1)!.x - points[0].x, y: points.at(-1)!.y - points[0].y };
    const tangentLength = Math.hypot(tangentDelta.x, tangentDelta.y);
    const tangent = tangentLength ? { x: tangentDelta.x / tangentLength, y: tangentDelta.y / tangentLength } : { x: 1, y: 0 };
    const labelCenter = pointAtPolylinePosition(points, routeLength ? targetDistance / routeLength : 0);
    const labelStart = { x: labelCenter.x - tangent.x * targetDistance, y: labelCenter.y - tangent.y * targetDistance };
    const labelEnd = { x: labelCenter.x + tangent.x * (routeLength - targetDistance), y: labelCenter.y + tangent.y * (routeLength - targetDistance) };
    const spare = Math.min(targetDistance - (startArrow ? routeArrowLength : 0), routeLength - targetDistance - (endArrow ? routeArrowLength : 0));
    const maxLabelWidth = labelWrap ? Math.max(labelFontSize * 3, spare * 2 * LABEL_ROUTE_SHARE) : undefined;
    const labelLayout = connectorLabelGeometry(labelStart, labelEnd, label, labelFontSize, routeLength ? targetDistance / routeLength : 0.5, labelRotation, labelFontSize * LABEL_GAP_RATIO, maxLabelWidth);
    const shaftStartDistance = routed ? (startArrow ? routeArrowLength : 0) : segmentLength(points[0], shortened[0].start);
    return {
        shaftParts: splitRouteSegments(shortened, targetDistance - labelLayout.halfGap - shaftStartDistance, targetDistance + labelLayout.halfGap - shaftStartDistance),
        startArrow,
        endArrow,
        labelLayout,
    };
};
