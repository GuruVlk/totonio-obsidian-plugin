import type { CanvasShape, ConnectorEndpoint, Point } from './types';
import { databaseIconVisibleBounds, firewallVisibleBounds, imageLabelBounds, personVisibleBounds } from './appearance';
import { getShapeDefinition } from './shapeRegistry';
import { arrowOutlinePoints, cloudOutlinePoints, cylinderOutlinePoints } from './shapePaths';
import { childShapes, findShapeById } from './model';
export type Bounds = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};
const ROUTE_CORNER_RADIUS = 12;
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
export const segmentLength = (start: Point, end: Point) => Math.hypot(end.x - start.x, end.y - start.y);
export const parallelSegments = (start: Point, end: Point, offset: number) => {
    const length = segmentLength(start, end);
    if (!length || offset <= 0)
        return [{ start, end }, { start, end }];
    const offsetX = -(end.y - start.y) / length * offset;
    const offsetY = (end.x - start.x) / length * offset;
    return [
        { start: { x: start.x + offsetX, y: start.y + offsetY }, end: { x: end.x + offsetX, y: end.y + offsetY } },
        { start: { x: start.x - offsetX, y: start.y - offsetY }, end: { x: end.x - offsetX, y: end.y - offsetY } },
    ];
};
export const pointFromSegmentGeometry = (anchor: Point, length: number, angleDegrees: number): Point => {
    const angle = angleDegrees * Math.PI / 180;
    return { x: anchor.x + Math.cos(angle) * Math.max(0, length), y: anchor.y + Math.sin(angle) * Math.max(0, length) };
};
export const pointAtSegmentPosition = (start: Point, end: Point, position: number): Point => {
    const clamped = Math.max(0, Math.min(1, position));
    return { x: start.x + (end.x - start.x) * clamped, y: start.y + (end.y - start.y) * clamped };
};
export const shapeBounds = (shape: CanvasShape): Bounds => ({
    left: Math.min(shape.x, shape.x + shape.width),
    top: Math.min(shape.y, shape.y + shape.height),
    right: Math.max(shape.x, shape.x + shape.width),
    bottom: Math.max(shape.y, shape.y + shape.height),
});
export const shapeCenter = (shape: CanvasShape): Point => {
    const bounds = shapeBounds(shape);
    return { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 };
};
const interactionBounds = (shape: CanvasShape) => {
    if (shape.type === 'image' && shape.label?.trim())
        return imageLabelBounds(shape);
    if (shape.label?.trim())
        return shapeBounds(shape);
    if (shape.type === 'firewall')
        return firewallVisibleBounds(shape);
    if (shape.type === 'person')
        return personVisibleBounds(shape);
    if (shape.type === 'database2')
        return databaseIconVisibleBounds(shape);
    return shapeBounds(shape);
};
const interactionCenter = (shape: CanvasShape): Point => {
    const bounds = interactionBounds(shape);
    return { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 };
};
const rotatePoint = (point: Point, center: Point, degrees: number): Point => {
    if (!degrees)
        return point;
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos,
    };
};
export const pointOnShapeBorder = (shape: CanvasShape, toward: Point): Point => {
    const rotationCenter = shapeCenter(shape);
    const center = interactionCenter(shape);
    const rotation = shape.rotation ?? 0;
    const localToward = rotatePoint(toward, rotationCenter, -rotation);
    const delta = { x: localToward.x - center.x, y: localToward.y - center.y };
    if (delta.x === 0 && delta.y === 0)
        return center;
    const bounds = interactionBounds(shape);
    const radiusX = (bounds.right - bounds.left) / 2;
    const radiusY = (bounds.bottom - bounds.top) / 2;
    if (radiusX === 0 || radiusY === 0)
        return center;
    if (getShapeDefinition(shape.type).geometry === 'ellipse') {
        const scale = 1 / Math.sqrt((delta.x / radiusX) ** 2 + (delta.y / radiusY) ** 2);
        return rotatePoint({ x: center.x + delta.x * scale, y: center.y + delta.y * scale }, rotationCenter, rotation);
    }
    if (getShapeDefinition(shape.type).geometry === 'diamond') {
        const scale = 1 / (Math.abs(delta.x) / radiusX + Math.abs(delta.y) / radiusY);
        return rotatePoint({ x: center.x + delta.x * scale, y: center.y + delta.y * scale }, rotationCenter, rotation);
    }
    const geometry = getShapeDefinition(shape.type).geometry;
    if (geometry === 'cloud' || geometry === 'cylinder' || geometry === 'arrow') {
        const polygon = geometry === 'cloud' ? cloudOutlinePoints(shape) : geometry === 'cylinder' ? cylinderOutlinePoints(shape) : arrowOutlinePoints(shape);
        const ray = { x: localToward.x - center.x, y: localToward.y - center.y };
        let nearest: {
            point: Point;
            distance: number;
        } | null = null;
        polygon.forEach((start, index) => {
            const end = polygon[(index + 1) % polygon.length];
            const edge = { x: end.x - start.x, y: end.y - start.y };
            const denominator = ray.x * edge.y - ray.y * edge.x;
            if (Math.abs(denominator) < 1e-9)
                return;
            const offset = { x: start.x - center.x, y: start.y - center.y };
            const rayScale = (offset.x * edge.y - offset.y * edge.x) / denominator;
            const edgeScale = (offset.x * ray.y - offset.y * ray.x) / denominator;
            if (rayScale < 0 || edgeScale < 0 || edgeScale > 1)
                return;
            const point = { x: center.x + ray.x * rayScale, y: center.y + ray.y * rayScale };
            if (!nearest || rayScale < nearest.distance)
                nearest = { point, distance: rayScale };
        });
        if (nearest)
            return rotatePoint((nearest as {
                point: Point;
                distance: number;
            }).point, rotationCenter, rotation);
    }
    const scale = 1 / Math.max(Math.abs(delta.x) / radiusX, Math.abs(delta.y) / radiusY);
    return rotatePoint({ x: center.x + delta.x * scale, y: center.y + delta.y * scale }, rotationCenter, rotation);
};
const interactionRadii = (shape: CanvasShape) => {
    const bounds = interactionBounds(shape);
    return { x: Math.max((bounds.right - bounds.left) / 2, 0.001), y: Math.max((bounds.bottom - bounds.top) / 2, 0.001) };
};
const pointAtShapeBorderPosition = (shape: CanvasShape, position: number): Point => {
    const center = interactionCenter(shape);
    const radii = interactionRadii(shape);
    const angle = Math.max(0, Math.min(1, position)) * Math.PI * 2;
    const localToward = { x: center.x + Math.cos(angle) * radii.x, y: center.y + Math.sin(angle) * radii.y };
    return pointOnShapeBorder(shape, rotatePoint(localToward, shapeCenter(shape), shape.rotation ?? 0));
};
export const nearestPointOnSegment = (point: Point, start: Point, end: Point): Point => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared)
        return start;
    const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
    return { x: start.x + dx * ratio, y: start.y + dy * ratio };
};
export const polylineLength = (points: Point[]) => points.slice(1).reduce((total, point, index) => total + segmentLength(points[index], point), 0);
export const pointAtPolylinePosition = (points: Point[], position: number): Point => {
    if (points.length === 0)
        return { x: 0, y: 0 };
    if (points.length === 1)
        return points[0];
    const target = polylineLength(points) * Math.max(0, Math.min(1, position));
    let traversed = 0;
    for (let index = 0; index < points.length - 1; index += 1) {
        const length = segmentLength(points[index], points[index + 1]);
        if (traversed + length >= target)
            return pointAtSegmentPosition(points[index], points[index + 1], length ? (target - traversed) / length : 0);
        traversed += length;
    }
    return points.at(-1)!;
};
export const nearestPolylinePoint = (point: Point, points: Point[]) => {
    let nearest = { point: points[0] ?? point, segmentIndex: 0, distance: Number.POSITIVE_INFINITY, position: 0 };
    const totalLength = polylineLength(points);
    let traversed = 0;
    for (let index = 0; index < points.length - 1; index += 1) {
        const candidate = nearestPointOnSegment(point, points[index], points[index + 1]);
        const distance = segmentLength(point, candidate);
        const segment = segmentLength(points[index], points[index + 1]);
        if (distance < nearest.distance)
            nearest = { point: candidate, segmentIndex: index, distance, position: totalLength ? (traversed + segmentLength(points[index], candidate)) / totalLength : 0 };
        traversed += segment;
    }
    return nearest;
};
export const smoothRoutePoints = (points: Point[], samplesPerSegment = 32): Point[] => {
    if (points.length < 3)
        return points.map((point) => ({ ...point }));
    const sampled: Point[] = [{ ...points[0] }];
    for (let index = 0; index < points.length - 1; index += 1) {
        const first = points[Math.max(0, index - 1)];
        const start = points[index];
        const end = points[index + 1];
        const last = points[Math.min(points.length - 1, index + 2)];
        for (let step = 1; step <= samplesPerSegment; step += 1) {
            const t = step / samplesPerSegment;
            const t2 = t * t;
            const t3 = t2 * t;
            sampled.push({
                x: 0.5 * (2 * start.x + (-first.x + end.x) * t + (2 * first.x - 5 * start.x + 4 * end.x - last.x) * t2 + (-first.x + 3 * start.x - 3 * end.x + last.x) * t3),
                y: 0.5 * (2 * start.y + (-first.y + end.y) * t + (2 * first.y - 5 * start.y + 4 * end.y - last.y) * t2 + (-first.y + 3 * start.y - 3 * end.y + last.y) * t3),
            });
        }
    }
    return sampled;
};
export const roundedRoutePoints = (points: Point[], radius = ROUTE_CORNER_RADIUS, samplesPerCorner = 8): Point[] => {
    if (points.length < 3 || radius <= 0)
        return points.map((point) => ({ ...point }));
    const rounded: Point[] = [{ ...points[0] }];
    for (let index = 1; index < points.length - 1; index += 1) {
        const previous = points[index - 1];
        const corner = points[index];
        const next = points[index + 1];
        const incomingLength = segmentLength(previous, corner);
        const outgoingLength = segmentLength(corner, next);
        if (!incomingLength || !outgoingLength)
            continue;
        const trim = Math.min(radius, incomingLength / 2, outgoingLength / 2);
        const entry = pointAtSegmentPosition(corner, previous, trim / incomingLength);
        const exit = pointAtSegmentPosition(corner, next, trim / outgoingLength);
        rounded.push(entry);
        for (let step = 1; step <= samplesPerCorner; step += 1) {
            const t = step / samplesPerCorner;
            const inverse = 1 - t;
            rounded.push({
                x: inverse * inverse * entry.x + 2 * inverse * t * corner.x + t * t * exit.x,
                y: inverse * inverse * entry.y + 2 * inverse * t * corner.y + t * t * exit.y,
            });
        }
    }
    rounded.push({ ...points.at(-1)! });
    return rounded;
};
const fallbackConnectorPoints = (shape: CanvasShape) => ({
    start: shape.start?.type === 'free' ? shape.start : { x: shape.x, y: shape.y },
    end: shape.end?.type === 'free' ? shape.end : { x: shape.x + shape.width, y: shape.y + shape.height },
});
const endpointCenter = (endpoint: ConnectorEndpoint, shapes: CanvasShape[], visited: Set<string>): Point => {
    if (endpoint.type === 'free')
        return endpoint;
    const shape = shapes.find((candidate) => candidate.id === endpoint.shapeId);
    if (shape?.type === 'line') {
        const points = connectorPoints(shape, shapes, visited);
        return { x: (points.start.x + points.end.x) / 2, y: (points.start.y + points.end.y) / 2 };
    }
    return shape ? shapeCenter(shape) : { x: 0, y: 0 };
};
const connectorEndpointCache = new WeakMap<CanvasShape[], WeakMap<CanvasShape, {
    start: Point;
    end: Point;
}>>();
export const connectorPoints = (shape: CanvasShape, shapes: CanvasShape[], ancestors = new Set<string>()): {
    start: Point;
    end: Point;
} => {
    if (ancestors.size > 0)
        return computeConnectorPoints(shape, shapes, ancestors);
    let cached = connectorEndpointCache.get(shapes);
    if (!cached) {
        cached = new WeakMap();
        connectorEndpointCache.set(shapes, cached);
    }
    const existing = cached.get(shape);
    if (existing)
        return existing;
    const points = computeConnectorPoints(shape, shapes, ancestors);
    cached.set(shape, points);
    return points;
};
const ELLIPSE_POLYLINE_SAMPLES = 64;
export const shapeBorderPolyline = (shape: CanvasShape): Point[] => {
    const geometry = getShapeDefinition(shape.type).geometry;
    const bounds = interactionBounds(shape);
    const center = interactionCenter(shape);
    const outline = geometry === 'cloud' ? cloudOutlinePoints(shape)
        : geometry === 'cylinder' ? cylinderOutlinePoints(shape)
            : geometry === 'arrow' ? arrowOutlinePoints(shape)
                : geometry === 'diamond' ? [{ x: center.x, y: bounds.top }, { x: bounds.right, y: center.y }, { x: center.x, y: bounds.bottom }, { x: bounds.left, y: center.y }]
                    : geometry === 'ellipse' ? Array.from({ length: ELLIPSE_POLYLINE_SAMPLES }, (_, index) => {
                        const angle = (index / ELLIPSE_POLYLINE_SAMPLES) * Math.PI * 2;
                        return { x: center.x + Math.cos(angle) * (bounds.right - bounds.left) / 2, y: center.y + Math.sin(angle) * (bounds.bottom - bounds.top) / 2 };
                    })
                        : [{ x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top }, { x: bounds.right, y: bounds.bottom }, { x: bounds.left, y: bounds.bottom }];
    const rotationCenter = shapeCenter(shape);
    return [...outline, outline[0]].map((point) => rotatePoint(point, rotationCenter, shape.rotation ?? 0));
};
const lockedSlidePath = (target: CanvasShape, shapes: CanvasShape[], visited?: Set<string>): Point[] => target.type === 'line' ? connectorPathPoints(target, shapes, visited) : shapeBorderPolyline(target);
export const pointOnPathAtAngle = (anchor: Point, fallback: Point, angleDegrees: number, path: Point[] | null): Point => {
    const angle = angleDegrees * Math.PI / 180;
    const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
    if (!path || path.length < 2)
        return pointFromSegmentGeometry(anchor, segmentLength(anchor, fallback), angleDegrees);
    const offsetOf = (point: Point) => (point.x - anchor.x) * normal.x + (point.y - anchor.y) * normal.y;
    let best: {
        point: Point;
        offset: number;
        distance: number;
    } | null = null;
    for (let index = 1; index < path.length; index += 1) {
        const from = path[index - 1];
        const to = path[index];
        const span = offsetOf(to) - offsetOf(from);
        const candidate = pointAtSegmentPosition(from, to, span === 0 ? 0 : -offsetOf(from) / span);
        const offset = Math.abs(offsetOf(candidate));
        const distance = segmentLength(candidate, fallback);
        const better = !best || offset < best.offset - 0.001 || (offset < best.offset + 0.001 && distance < best.distance);
        if (better)
            best = { point: candidate, offset, distance };
    }
    return best!.point;
};
const computeConnectorPoints = (shape: CanvasShape, shapes: CanvasShape[], ancestors: Set<string>): {
    start: Point;
    end: Point;
} => {
    if (ancestors.has(shape.id))
        return fallbackConnectorPoints(shape);
    const visited = new Set(ancestors).add(shape.id);
    const start = shape.start ?? { type: 'free' as const, x: shape.x, y: shape.y };
    const end = shape.end ?? { type: 'free' as const, x: shape.x + shape.width, y: shape.y + shape.height };
    const routePoints = shape.routePoints ?? [];
    const startCenter = endpointCenter(start, shapes, visited);
    const endCenter = endpointCenter(end, shapes, visited);
    const startShape = start.type === 'shape' ? shapes.find((candidate) => candidate.id === start.shapeId) : null;
    const endShape = end.type === 'shape' ? shapes.find((candidate) => candidate.id === end.shapeId) : null;
    const resolveBoundPoint = (endpoint: ConnectorEndpoint, target: CanvasShape, toward: Point): Point => {
        if (target.type !== 'line')
            return endpoint.type === 'shape' && endpoint.position !== undefined
                ? pointAtShapeBorderPosition(target, endpoint.position)
                : pointOnShapeBorder(target, toward);
        const path = connectorPathPoints(target, shapes, visited);
        if (endpoint.type === 'shape' && endpoint.position !== undefined)
            return pointAtPolylinePosition(path, endpoint.position);
        return nearestPolylinePoint(toward, path).point;
    };
    const resolved = {
        start: startShape ? resolveBoundPoint(start, startShape, routePoints[0] ?? endCenter) : startCenter,
        end: endShape ? resolveBoundPoint(end, endShape, routePoints.at(-1) ?? startCenter) : endCenter,
    };
    if (shape.lockAngle === undefined || routePoints.length > 0)
        return resolved;
    const endPath = endShape ? lockedSlidePath(endShape, shapes, visited) : null;
    return { start: resolved.start, end: pointOnPathAtAngle(resolved.start, resolved.end, shape.lockAngle, endPath) };
};
export const orthogonalRoutePoints = (points: Point[]): Point[] => {
    if (points.length < 2)
        return points.map((point) => ({ x: point.x, y: point.y }));
    const routed: Point[] = [{ x: points[0].x, y: points[0].y }];
    points.slice(1).forEach((end) => {
        const start = routed.at(-1)!;
        if (start.x !== end.x && start.y !== end.y) {
            const middleX = (start.x + end.x) / 2;
            routed.push({ x: middleX, y: start.y }, { x: middleX, y: end.y });
        }
        routed.push({ x: end.x, y: end.y });
    });
    return routed.filter((point, index) => index === 0 || point.x !== routed[index - 1].x || point.y !== routed[index - 1].y);
};
type AttachmentSide = 'left' | 'right' | 'top' | 'bottom';
const attachmentSide = (shape: CanvasShape, point: Point): AttachmentSide => {
    const center = interactionCenter(shape);
    const deltaX = point.x - center.x;
    const deltaY = point.y - center.y;
    if (Math.abs(deltaX) >= Math.abs(deltaY))
        return deltaX < 0 ? 'left' : 'right';
    return deltaY < 0 ? 'top' : 'bottom';
};
const outwardPoint = (point: Point, side: AttachmentSide, clearance: number): Point => {
    if (side === 'left')
        return { x: point.x - clearance, y: point.y };
    if (side === 'right')
        return { x: point.x + clearance, y: point.y };
    if (side === 'top')
        return { x: point.x, y: point.y - clearance };
    return { x: point.x, y: point.y + clearance };
};
const ROUTE_OBSTACLE_LIMIT = 10;
const routeObstacleShapes = (connector: CanvasShape, shapes: CanvasShape[], startTarget: CanvasShape, endTarget: CanvasShape, region: Bounds) => {
    const excluded = new Set<string>([connector.id, startTarget.id, endTarget.id]);
    for (const target of [startTarget, endTarget]) {
        let parentId = target.parentId;
        while (parentId && !excluded.has(parentId)) {
            excluded.add(parentId);
            parentId = findShapeById(parentId, shapes)?.parentId ?? null;
        }
    }
    const candidates = shapes.filter((candidate) => {
        if (excluded.has(candidate.id))
            return false;
        if (candidate.type === 'line' || candidate.type === 'plain-line' || candidate.type === 'group' || candidate.type === 'frame' || candidate.type === 'text')
            return false;
        const bounds = interactionBounds(candidate);
        return bounds.right > region.left && bounds.left < region.right && bounds.bottom > region.top && bounds.top < region.bottom;
    });
    if (candidates.length <= ROUTE_OBSTACLE_LIMIT)
        return candidates;
    const regionCenter = { x: (region.left + region.right) / 2, y: (region.top + region.bottom) / 2 };
    return candidates
        .map((candidate) => ({ candidate, distance: segmentLength(regionCenter, interactionCenter(candidate)) }))
        .sort((first, second) => first.distance - second.distance)
        .slice(0, ROUTE_OBSTACLE_LIMIT)
        .map((entry) => entry.candidate);
};
const borderAttachmentSides = (shape: CanvasShape, shapes: CanvasShape[], start: Point, end: Point) => {
    if (shape.start?.type !== 'shape' || shape.end?.type !== 'shape')
        return null;
    const startTarget = findShapeById(shape.start.shapeId, shapes);
    const endTarget = findShapeById(shape.end.shapeId, shapes);
    if (!startTarget || !endTarget || startTarget.type === 'line' || endTarget.type === 'line')
        return null;
    return { startSide: attachmentSide(startTarget, start), endSide: attachmentSide(endTarget, end), startTarget, endTarget };
};
const paddedBounds = (shape: CanvasShape, clearance: number): Bounds => {
    const bounds = interactionBounds(shape);
    return { left: bounds.left - clearance, top: bounds.top - clearance, right: bounds.right + clearance, bottom: bounds.bottom + clearance };
};
const orthogonalClearance = (shape: CanvasShape) => {
    const arrowLength = shape.arrowDirection && shape.arrowDirection !== 'none' ? Math.max(10, (shape.strokeWidth ?? 2) * 4) : 0;
    return Math.max(ROUTE_CORNER_RADIUS, arrowLength + ROUTE_CORNER_RADIUS);
};
type RouteRail = {
    axis: 'horizontal' | 'vertical';
    coordinate: number;
};
const orthogonalMiddleRoute = (shape: CanvasShape, shapes: CanvasShape[], start: Point, end: Point): {
    points: Point[];
    rail: RouteRail | null;
} | null => {
    const clearance = orthogonalClearance(shape);
    const stubs = borderRouteStubs(shape, shapes, start, end, clearance);
    if (!stubs)
        return null;
    const dragged = shape.routeOffset !== undefined && shape.routeOffset !== 0;
    const elbow = dragged ? null : perpendicularElbow(stubs);
    if (elbow && routeClearsObstacles(elbow, stubs.obstacles))
        return { points: elbow, rail: null };
    const preferred = stubs.sharedRail
        ? {
            points: orthogonalRoutePoints([stubs.startStub, stubs.endStub]),
            rail: verticalSide(stubs.startSide)
                ? { axis: 'horizontal' as const, coordinate: stubs.startStub.y }
                : { axis: 'vertical' as const, coordinate: stubs.startStub.x },
        }
        : midpointCorridorRoute(stubs.startStub, stubs.endStub, stubs.startBounds, stubs.endBounds, clearance, stubs.stubAxis, shape.routeOffset ?? 0);
    return preferred && (dragged || routeClearsObstacles(preferred.points, stubs.obstacles))
        ? preferred
        : { points: obstacleAvoidingRoute(stubs.startStub, stubs.endStub, stubs.obstacles), rail: null };
};
const borderRouteStubs = (shape: CanvasShape, shapes: CanvasShape[], start: Point, end: Point, clearance: number): {
    startStub: Point;
    endStub: Point;
    startSide: AttachmentSide;
    endSide: AttachmentSide;
    startBounds: Bounds;
    endBounds: Bounds;
    obstacles: Bounds[];
    stubAxis: 'horizontal' | 'vertical' | null;
    sharedRail: boolean;
} | null => {
    const startEndpoint = shape.start;
    const endEndpoint = shape.end;
    if (shape.routePoints?.length || startEndpoint?.type !== 'shape' || endEndpoint?.type !== 'shape')
        return null;
    const startTarget = shapes.find((candidate) => candidate.id === startEndpoint.shapeId);
    const endTarget = shapes.find((candidate) => candidate.id === endEndpoint.shapeId);
    if (!startTarget || !endTarget || startTarget.type === 'line' || endTarget.type === 'line')
        return null;
    const startSide = attachmentSide(startTarget, start);
    const endSide = attachmentSide(endTarget, end);
    const startBounds = interactionBounds(startTarget);
    const endBounds = interactionBounds(endTarget);
    const margin = clearance * 4;
    const region = {
        left: Math.min(startBounds.left, endBounds.left) - margin,
        top: Math.min(startBounds.top, endBounds.top) - margin,
        right: Math.max(startBounds.right, endBounds.right) + margin,
        bottom: Math.max(startBounds.bottom, endBounds.bottom) + margin,
    };
    const horizontalSides = (side: AttachmentSide) => side === 'left' || side === 'right';
    const stubAxis = horizontalSides(startSide) === horizontalSides(endSide) ? (horizontalSides(startSide) ? 'horizontal' : 'vertical') : null;
    const stubs = startSide === endSide
        ? sameSideStubs(startSide, start, end, startBounds, endBounds, clearance, shape.routeOffset ?? 0)
        : { startStub: outwardPoint(start, startSide, clearance), endStub: outwardPoint(end, endSide, clearance) };
    const padded = (target: CanvasShape) => {
        const bounds = interactionBounds(target);
        return { left: bounds.left - clearance, top: bounds.top - clearance, right: bounds.right + clearance, bottom: bounds.bottom + clearance };
    };
    const contains = (bounds: Bounds, point: Point) => point.x > bounds.left && point.x < bounds.right && point.y > bounds.top && point.y < bounds.bottom;
    const blocking = startTarget.id === endTarget.id ? [startTarget] : [startTarget, endTarget];
    const extra = routeObstacleShapes(shape, shapes, startTarget, endTarget, region)
        .map(padded)
        .filter((bounds) => !contains(bounds, stubs.startStub) && !contains(bounds, stubs.endStub));
    return { ...stubs, startSide, endSide, startBounds, endBounds, obstacles: [...blocking.map(padded), ...extra], stubAxis, sharedRail: startSide === endSide };
};
const verticalSide = (side: AttachmentSide) => side === 'top' || side === 'bottom';
const leavesOutward = (from: Point, to: Point, side: AttachmentSide) => {
    if (side === 'left')
        return to.x <= from.x + 0.001;
    if (side === 'right')
        return to.x >= from.x - 0.001;
    if (side === 'top')
        return to.y <= from.y + 0.001;
    return to.y >= from.y - 0.001;
};
const perpendicularElbow = (stubs: NonNullable<ReturnType<typeof borderRouteStubs>>): Point[] | null => {
    if (verticalSide(stubs.startSide) === verticalSide(stubs.endSide))
        return null;
    const corner = verticalSide(stubs.startSide)
        ? { x: stubs.startStub.x, y: stubs.endStub.y }
        : { x: stubs.endStub.x, y: stubs.startStub.y };
    if (!leavesOutward(stubs.startStub, corner, stubs.startSide) || !leavesOutward(stubs.endStub, corner, stubs.endSide))
        return null;
    return orthogonalRoutePoints([stubs.startStub, corner, stubs.endStub]);
};
const sameSideStubs = (side: AttachmentSide, start: Point, end: Point, startBounds: Bounds, endBounds: Bounds, clearance: number, offset: number) => {
    if (side === 'left') {
        const x = Math.min(startBounds.left, endBounds.left) - clearance + Math.min(0, offset);
        return { startStub: { x, y: start.y }, endStub: { x, y: end.y } };
    }
    if (side === 'right') {
        const x = Math.max(startBounds.right, endBounds.right) + clearance + Math.max(0, offset);
        return { startStub: { x, y: start.y }, endStub: { x, y: end.y } };
    }
    if (side === 'top') {
        const y = Math.min(startBounds.top, endBounds.top) - clearance + Math.min(0, offset);
        return { startStub: { x: start.x, y }, endStub: { x: end.x, y } };
    }
    const y = Math.max(startBounds.bottom, endBounds.bottom) + clearance + Math.max(0, offset);
    return { startStub: { x: start.x, y }, endStub: { x: end.x, y } };
};
const midpointCorridorRoute = (start: Point, end: Point, startBounds: Bounds, endBounds: Bounds, clearance: number, preferredAxis: 'horizontal' | 'vertical' | null, offset: number): {
    points: Point[];
    rail: RouteRail;
} | null => {
    const verticalCorridor = () => {
        const startAbove = startBounds.bottom <= endBounds.top;
        const endAbove = endBounds.bottom <= startBounds.top;
        if (!startAbove && !endAbove)
            return null;
        const upperBottom = startAbove ? startBounds.bottom : endBounds.bottom;
        const lowerTop = startAbove ? endBounds.top : startBounds.top;
        if (lowerTop - upperBottom < clearance * 2)
            return null;
        const y = clamp((upperBottom + lowerTop) / 2 + offset, upperBottom + clearance, lowerTop - clearance);
        return { points: orthogonalRoutePoints([start, { x: start.x, y }, { x: end.x, y }, end]), rail: { axis: 'horizontal' as const, coordinate: y } };
    };
    const horizontalCorridor = () => {
        const startLeft = startBounds.right <= endBounds.left;
        const endLeft = endBounds.right <= startBounds.left;
        if (!startLeft && !endLeft)
            return null;
        const leftRight = startLeft ? startBounds.right : endBounds.right;
        const rightLeft = startLeft ? endBounds.left : startBounds.left;
        if (rightLeft - leftRight < clearance * 2)
            return null;
        const x = clamp((leftRight + rightLeft) / 2 + offset, leftRight + clearance, rightLeft - clearance);
        return { points: orthogonalRoutePoints([start, { x, y: start.y }, { x, y: end.y }, end]), rail: { axis: 'vertical' as const, coordinate: x } };
    };
    return preferredAxis === 'horizontal'
        ? horizontalCorridor() ?? verticalCorridor()
        : verticalCorridor() ?? horizontalCorridor();
};
const routeIntersectsBounds = (start: Point, end: Point, bounds: Bounds) => {
    if (start.y === end.y) {
        return start.y > bounds.top && start.y < bounds.bottom
            && Math.max(start.x, end.x) > bounds.left && Math.min(start.x, end.x) < bounds.right;
    }
    if (start.x === end.x) {
        return start.x > bounds.left && start.x < bounds.right
            && Math.max(start.y, end.y) > bounds.top && Math.min(start.y, end.y) < bounds.bottom;
    }
    return true;
};
const routeClearsObstacles = (route: Point[], obstacles: Bounds[]) => !route.slice(1)
    .some((point, index) => obstacles.some((bounds) => routeIntersectsBounds(route[index], point, bounds)));
const obstacleAvoidingRoute = (start: Point, end: Point, obstacles: Bounds[]): Point[] => {
    const direct = orthogonalRoutePoints([start, end]);
    if (!direct.slice(1).some((point, index) => obstacles.some((bounds) => routeIntersectsBounds(direct[index], point, bounds))))
        return direct;
    const xValues = [...new Set([start.x, end.x, ...obstacles.flatMap((bounds) => [bounds.left, bounds.right])])].sort((first, second) => first - second);
    const yValues = [...new Set([start.y, end.y, ...obstacles.flatMap((bounds) => [bounds.top, bounds.bottom])])].sort((first, second) => first - second);
    const pointKey = (point: Point) => `${point.x},${point.y}`;
    const isBlocked = (point: Point) => obstacles.some((bounds) => point.x > bounds.left && point.x < bounds.right && point.y > bounds.top && point.y < bounds.bottom);
    const points = xValues.flatMap((x) => yValues.map((y) => ({ x, y }))).filter((point) => !isBlocked(point) || pointKey(point) === pointKey(start) || pointKey(point) === pointKey(end));
    const pointIndexes = new Map(points.map((point, index) => [pointKey(point), index]));
    const neighbors = new Map<number, number[]>();
    const connectLine = (line: Point[]) => line.sort((first, second) => first.x - second.x || first.y - second.y).slice(1).forEach((point, index) => {
        const previous = line[index];
        if (obstacles.some((bounds) => routeIntersectsBounds(previous, point, bounds)))
            return;
        const previousIndex = pointIndexes.get(pointKey(previous))!;
        const pointIndex = pointIndexes.get(pointKey(point))!;
        neighbors.set(previousIndex, [...(neighbors.get(previousIndex) ?? []), pointIndex]);
        neighbors.set(pointIndex, [...(neighbors.get(pointIndex) ?? []), previousIndex]);
    });
    xValues.forEach((x) => connectLine(points.filter((point) => point.x === x)));
    yValues.forEach((y) => connectLine(points.filter((point) => point.y === y)));
    type Direction = 'horizontal' | 'vertical' | 'none';
    type SearchState = {
        pointIndex: number;
        direction: Direction;
        cost: number;
        previous?: string;
    };
    const startIndex = pointIndexes.get(pointKey(start));
    const endIndex = pointIndexes.get(pointKey(end));
    if (startIndex === undefined || endIndex === undefined)
        return direct;
    const stateKey = (pointIndex: number, direction: Direction) => `${pointIndex}:${direction}`;
    const pending: SearchState[] = [{ pointIndex: startIndex, direction: 'none', cost: 0 }];
    const pushPending = (state: SearchState) => {
        pending.push(state);
        let index = pending.length - 1;
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (pending[parent].cost <= pending[index].cost)
                break;
            [pending[parent], pending[index]] = [pending[index], pending[parent]];
            index = parent;
        }
    };
    const popPending = () => {
        const first = pending[0];
        const last = pending.pop()!;
        if (pending.length) {
            pending[0] = last;
            let index = 0;
            while (true) {
                const left = index * 2 + 1;
                const right = left + 1;
                let smallest = index;
                if (left < pending.length && pending[left].cost < pending[smallest].cost)
                    smallest = left;
                if (right < pending.length && pending[right].cost < pending[smallest].cost)
                    smallest = right;
                if (smallest === index)
                    break;
                [pending[index], pending[smallest]] = [pending[smallest], pending[index]];
                index = smallest;
            }
        }
        return first;
    };
    const best = new Map<string, SearchState>([[stateKey(startIndex, 'none'), pending[0]]]);
    let result: SearchState | undefined;
    while (pending.length) {
        const current = popPending();
        if (best.get(stateKey(current.pointIndex, current.direction))?.cost !== current.cost)
            continue;
        if (current.pointIndex === endIndex) {
            result = current;
            break;
        }
        for (const neighborIndex of neighbors.get(current.pointIndex) ?? []) {
            const currentPoint = points[current.pointIndex];
            const neighbor = points[neighborIndex];
            const direction: Direction = currentPoint.x === neighbor.x ? 'vertical' : 'horizontal';
            const bendCost = current.direction !== 'none' && current.direction !== direction ? 8 : 0;
            const cost = current.cost + segmentLength(currentPoint, neighbor) + bendCost;
            const key = stateKey(neighborIndex, direction);
            if (cost >= (best.get(key)?.cost ?? Number.POSITIVE_INFINITY))
                continue;
            const next = { pointIndex: neighborIndex, direction, cost, previous: stateKey(current.pointIndex, current.direction) };
            best.set(key, next);
            pushPending(next);
        }
    }
    if (!result)
        return direct;
    const routed: Point[] = [];
    let current: SearchState | undefined = result;
    while (current) {
        routed.unshift(points[current.pointIndex]);
        current = current.previous ? best.get(current.previous) : undefined;
    }
    return routed.filter((point, index) => {
        if (index === 0 || index === routed.length - 1)
            return true;
        const previous = routed[index - 1];
        const next = routed[index + 1];
        return !((previous.x === point.x && point.x === next.x) || (previous.y === point.y && point.y === next.y));
    });
};
const connectorRouteCache = new WeakMap<CanvasShape[], WeakMap<CanvasShape, Point[]>>();
export const connectorPathPoints = (shape: CanvasShape, shapes: CanvasShape[], ancestors = new Set<string>()): Point[] => {
    if (ancestors.size > 0)
        return computeConnectorPathPoints(shape, shapes, ancestors);
    let cached = connectorRouteCache.get(shapes);
    if (!cached) {
        cached = new WeakMap();
        connectorRouteCache.set(shapes, cached);
    }
    const existing = cached.get(shape);
    if (existing)
        return existing;
    const points = computeConnectorPathPoints(shape, shapes, ancestors);
    cached.set(shape, points);
    return points;
};
const computeConnectorPathPoints = (shape: CanvasShape, shapes: CanvasShape[], ancestors: Set<string>): Point[] => {
    const points = connectorPoints(shape, shapes, ancestors);
    const route = [points.start, ...(shape.routePoints ?? []), points.end];
    const cornerRadius = shape.cornerStyle === 'sharp' ? 0 : ROUTE_CORNER_RADIUS;
    if (shape.routeStyle === 'orthogonal') {
        const clearance = orthogonalClearance(shape);
        if (shape.routePoints?.length) {
            const sides = borderAttachmentSides(shape, shapes, points.start, points.end);
            if (!sides)
                return roundedRoutePoints(orthogonalRoutePoints(route), cornerRadius);
            const bends = shape.routePoints;
            const blocking = [sides.startTarget, ...(sides.endTarget.id === sides.startTarget.id ? [] : [sides.endTarget])]
                .map((target) => paddedBounds(target, clearance));
            const head = obstacleAvoidingRoute(outwardPoint(points.start, sides.startSide, clearance), bends[0], blocking);
            const tail = obstacleAvoidingRoute(bends.at(-1)!, outwardPoint(points.end, sides.endSide, clearance), blocking);
            return roundedRoutePoints(orthogonalRoutePoints([points.start, ...head, ...bends.slice(1, -1), ...tail, points.end]), cornerRadius);
        }
        const middle = orthogonalMiddleRoute(shape, shapes, points.start, points.end);
        if (middle)
            return roundedRoutePoints([points.start, ...middle.points, points.end], cornerRadius);
        return roundedRoutePoints(orthogonalRoutePoints(route), cornerRadius);
    }
    if (shape.routeStyle === 'curved')
        return smoothRoutePoints(route);
    return shape.routePoints?.length ? roundedRoutePoints(route, cornerRadius) : route;
};
export const boundsForShape = (shape: CanvasShape, shapes: CanvasShape[]): Bounds => {
    if (shape.type === 'line' || shape.type === 'plain-line') {
        const points = connectorPathPoints(shape, shapes);
        return {
            left: Math.min(...points.map((point) => point.x)), top: Math.min(...points.map((point) => point.y)),
            right: Math.max(...points.map((point) => point.x)), bottom: Math.max(...points.map((point) => point.y)),
        };
    }
    if (shape.type !== 'group')
        return shapeBounds(shape);
    const children = childShapes(shape.id, shapes);
    if (children.length === 0)
        return shapeBounds(shape);
    const bounds = children.map((child) => boundsForShape(child, shapes));
    return {
        left: Math.min(...bounds.map((item) => item.left)), top: Math.min(...bounds.map((item) => item.top)),
        right: Math.max(...bounds.map((item) => item.right)), bottom: Math.max(...bounds.map((item) => item.bottom)),
    };
};
export const visualBoundsForShape = (shape: CanvasShape, shapes: CanvasShape[]): Bounds => {
    const bounds = shape.type === 'image' && shape.label?.trim() ? imageLabelBounds(shape) : boundsForShape(shape, shapes);
    if (shape.type === 'group') {
        const children = childShapes(shape.id, shapes);
        if (children.length === 0)
            return bounds;
        const childBounds = children.map((child) => visualBoundsForShape(child, shapes));
        return {
            left: Math.min(...childBounds.map((item) => item.left)), top: Math.min(...childBounds.map((item) => item.top)),
            right: Math.max(...childBounds.map((item) => item.right)), bottom: Math.max(...childBounds.map((item) => item.bottom)),
        };
    }
    if (!shape.rotation || shape.type === 'line' || shape.type === 'plain-line')
        return bounds;
    const center = shapeCenter(shape);
    const corners = [
        { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
        { x: bounds.right, y: bounds.bottom }, { x: bounds.left, y: bounds.bottom },
    ].map((point) => rotatePoint(point, center, shape.rotation ?? 0));
    return {
        left: Math.min(...corners.map((point) => point.x)),
        top: Math.min(...corners.map((point) => point.y)),
        right: Math.max(...corners.map((point) => point.x)),
        bottom: Math.max(...corners.map((point) => point.y)),
    };
};
export const shapesInPaintOrder = (shapes: CanvasShape[]) => {
    const knownIds = new Set(shapes.map((shape) => shape.id));
    const childrenByParent = new Map<string, CanvasShape[]>();
    const roots: CanvasShape[] = [];
    shapes.forEach((shape) => {
        if (shape.parentId === null || !knownIds.has(shape.parentId)) {
            roots.push(shape);
            return;
        }
        const siblings = childrenByParent.get(shape.parentId);
        if (siblings)
            siblings.push(shape);
        else
            childrenByParent.set(shape.parentId, [shape]);
    });
    const ordered: CanvasShape[] = [];
    const visited = new Set<string>();
    const visit = (shape: CanvasShape) => {
        if (visited.has(shape.id))
            return;
        visited.add(shape.id);
        ordered.push(shape);
        const children = childrenByParent.get(shape.id);
        if (children)
            [...children].reverse().forEach(visit);
    };
    roots.reverse().forEach(visit);
    [...shapes].reverse().forEach(visit);
    return ordered;
};
