import type { CanvasShape, Point } from './types';
const CLOUD_ARC_RX = 0.2276;
const CLOUD_ARC_RY = 0.2938;
const CLOUD_START: [
    number,
    number
] = [0.1828, 0.7553];
const CLOUD_ARCS: [
    number,
    number,
    number
][] = [
    [0.2896, 0.1845, 1], [0.6892, 0.1288, 0], [0.8837, 0.6585, 0],
    [0.5243, 0.943, 0], [0.1828, 0.7553, 0],
];
const CLOUD_OUTLINE: [
    number,
    number
][] = [
    [0.1828, 0.7553], [0.1145, 0.7221], [0.0578, 0.6629], [0.0186, 0.5835], [0.0008, 0.4921],
    [0.0064, 0.3983], [0.0346, 0.3115], [0.0827, 0.2407], [0.1457, 0.1931], [0.2171, 0.1738],
    [0.2896, 0.1845], [0.3254, 0.1067], [0.3778, 0.0467], [0.4419, 0.01], [0.5116, 0.0003],
    [0.5802, 0.0184], [0.6414, 0.0626], [0.6892, 0.1288], [0.7593, 0.109], [0.8306, 0.1182],
    [0.8961, 0.1557], [0.9494, 0.2176], [0.9851, 0.2979], [0.9997, 0.3885], [0.9918, 0.4804],
    [0.9621, 0.5646], [0.9135, 0.6327], [0.8837, 0.6585], [0.884, 0.7509], [0.8622, 0.8388],
    [0.8202, 0.9136], [0.7624, 0.968], [0.6943, 0.9965], [0.6228, 0.9962], [0.5548, 0.9674],
    [0.5243, 0.943], [0.4577, 0.9785], [0.3859, 0.9854], [0.316, 0.963], [0.255, 0.9134],
    [0.209, 0.8418],
];
export const cloudOutlinePoints = (shape: CanvasShape): Point[] => CLOUD_OUTLINE.map(([x, y]) => ({
    x: shape.x + x * shape.width,
    y: shape.y + y * shape.height,
}));
const normalizedBounds = (shape: CanvasShape) => ({
    left: Math.min(shape.x, shape.x + shape.width),
    top: Math.min(shape.y, shape.y + shape.height),
    width: Math.abs(shape.width),
    height: Math.abs(shape.height),
});
const pointToward = (from: Point, to: Point, distance: number): Point => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (!length || distance <= 0)
        return from;
    const ratio = Math.min(distance / length, 0.49);
    return { x: from.x + dx * ratio, y: from.y + dy * ratio };
};
export const panelHeaderPathData = (shape: CanvasShape, headerBottom: number, radius: number): string => {
    const left = shape.x;
    const top = shape.y;
    const right = shape.x + shape.width;
    const bottom = Math.max(top, headerBottom);
    const r = Math.max(0, Math.min(radius, shape.width / 2, bottom - top));
    if (!r)
        return `M ${left} ${top} H ${right} V ${bottom} H ${left} Z`;
    return `M ${left + r} ${top} H ${right - r} Q ${right} ${top} ${right} ${top + r} V ${bottom} H ${left} V ${top + r} Q ${left} ${top} ${left + r} ${top} Z`;
};
export const roundedDiamondPath = (shape: CanvasShape, radius: number): string => {
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;
    const top = { x: centerX, y: shape.y };
    const right = { x: shape.x + shape.width, y: centerY };
    const bottom = { x: centerX, y: shape.y + shape.height };
    const left = { x: shape.x, y: centerY };
    const corners = [top, right, bottom, left];
    const maxRadius = Math.max(0, Math.min(radius, Math.abs(shape.width) / 4, Math.abs(shape.height) / 4));
    if (!maxRadius)
        return `M ${top.x} ${top.y} L ${right.x} ${right.y} L ${bottom.x} ${bottom.y} L ${left.x} ${left.y} Z`;
    const segments = corners.map((corner, index) => {
        const previous = corners[(index + corners.length - 1) % corners.length];
        const next = corners[(index + 1) % corners.length];
        return { corner, start: pointToward(corner, previous, maxRadius), end: pointToward(corner, next, maxRadius) };
    });
    let path = `M ${segments[0].end.x} ${segments[0].end.y}`;
    for (let index = 1; index < segments.length; index += 1) {
        path += ` L ${segments[index].start.x} ${segments[index].start.y}`;
        path += ` Q ${segments[index].corner.x} ${segments[index].corner.y} ${segments[index].end.x} ${segments[index].end.y}`;
    }
    path += ` L ${segments[0].start.x} ${segments[0].start.y}`;
    path += ` Q ${segments[0].corner.x} ${segments[0].corner.y} ${segments[0].end.x} ${segments[0].end.y} Z`;
    return path;
};
export const bracketsPathData = (shape: CanvasShape): string => {
    const { left, top, width, height } = normalizedBounds(shape);
    const arm = Math.max(1, Math.min(width / 2, height / 4, 26));
    const right = left + width;
    const bottom = top + height;
    return `M ${left + arm} ${top} H ${left} V ${bottom} H ${left + arm} M ${right - arm} ${top} H ${right} V ${bottom} H ${right - arm}`;
};
export const arrowOutlinePoints = (shape: CanvasShape): Point[] => {
    const { left, top, width, height } = normalizedBounds(shape);
    const head = Math.min(width, height / 2);
    const neck = left + width - head;
    const shaftTop = top + height * 0.28;
    const shaftBottom = top + height * 0.72;
    return [
        { x: left, y: shaftTop },
        { x: neck, y: shaftTop },
        { x: neck, y: top },
        { x: left + width, y: top + height / 2 },
        { x: neck, y: top + height },
        { x: neck, y: shaftBottom },
        { x: left, y: shaftBottom },
    ];
};
export const arrowPathData = (shape: CanvasShape): string => `${arrowOutlinePoints(shape)
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${Number(point.x.toFixed(2))} ${Number(point.y.toFixed(2))}`)
    .join(' ')} Z`;
export const cloudPathData = (shape: CanvasShape, strokeWidth = 0): string => {
    const inset = strokeWidth / 2;
    const width = Math.max(1, shape.width - strokeWidth);
    const height = Math.max(1, shape.height - strokeWidth);
    const x = (value: number) => Number((shape.x + inset + value * width).toFixed(2));
    const y = (value: number) => Number((shape.y + inset + value * height).toFixed(2));
    const radiusX = Number((CLOUD_ARC_RX * width).toFixed(2));
    const radiusY = Number((CLOUD_ARC_RY * height).toFixed(2));
    const arcs = CLOUD_ARCS.map(([endX, endY, large]) => `A ${radiusX} ${radiusY} 0 ${large} 1 ${x(endX)} ${y(endY)}`);
    return `M ${x(CLOUD_START[0])} ${y(CLOUD_START[1])} ${arcs.join(' ')} Z`;
};
export const cylinderMetrics = (shape: CanvasShape) => {
    const radiusY = Math.max(4, Math.min(Math.abs(shape.height) / 8, Math.abs(shape.width) / 8, 18));
    return { centerX: shape.x + shape.width / 2, topCenterY: shape.y + radiusY, bottomCenterY: shape.y + shape.height - radiusY, radiusX: Math.abs(shape.width) / 2, radiusY };
};
export const cylinderPathData = (shape: CanvasShape): string => {
    const { topCenterY, bottomCenterY, radiusX, radiusY } = cylinderMetrics(shape);
    const left = shape.x;
    const right = shape.x + shape.width;
    return `M ${left} ${topCenterY} L ${left} ${bottomCenterY} A ${radiusX} ${radiusY} 0 0 0 ${right} ${bottomCenterY} L ${right} ${topCenterY}`;
};
export const cylinderOutlinePoints = (shape: CanvasShape): Point[] => {
    const { centerX, topCenterY, bottomCenterY, radiusX, radiusY } = cylinderMetrics(shape);
    const points: Point[] = [];
    for (let step = 0; step <= 12; step += 1) {
        const angle = Math.PI + (Math.PI * step) / 12;
        points.push({ x: centerX + Math.cos(angle) * radiusX, y: topCenterY + Math.sin(angle) * radiusY });
    }
    for (let step = 0; step <= 12; step += 1) {
        const angle = (Math.PI * step) / 12;
        points.push({ x: centerX + Math.cos(angle) * radiusX, y: bottomCenterY + Math.sin(angle) * radiusY });
    }
    return points;
};
