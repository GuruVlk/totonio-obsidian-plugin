import type { ArrowDirection, Point } from './types';
export type Arrowhead = {
    tip: Point;
    left: Point;
    right: Point;
};
export type ArrowGeometry = {
    shaftStart: Point;
    shaftEnd: Point;
    start?: Arrowhead;
    end?: Arrowhead;
};
const includesStart = (direction: ArrowDirection) => direction === 'start' || direction === 'both';
const includesEnd = (direction: ArrowDirection) => direction === 'end' || direction === 'both';
export const arrowGeometry = (start: Point, end: Point, direction: ArrowDirection = 'none', strokeWidth = 2, scale = 1): ArrowGeometry => {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (!distance || direction === 'none')
        return { shaftStart: start, shaftEnd: end };
    const unitX = deltaX / distance;
    const unitY = deltaY / distance;
    const requestedLength = Math.max(10, strokeWidth * 4) * scale;
    const length = Math.min(requestedLength, distance * 0.45);
    const halfWidth = Math.min(Math.max(4, strokeWidth * 1.75) * scale, length * 0.8);
    const createHead = (tip: Point, directionX: number, directionY: number): Arrowhead => {
        const baseX = tip.x - directionX * length;
        const baseY = tip.y - directionY * length;
        return {
            tip,
            left: { x: baseX - directionY * halfWidth, y: baseY + directionX * halfWidth },
            right: { x: baseX + directionY * halfWidth, y: baseY - directionX * halfWidth },
        };
    };
    const startHead = includesStart(direction) ? createHead(start, -unitX, -unitY) : undefined;
    const endHead = includesEnd(direction) ? createHead(end, unitX, unitY) : undefined;
    return {
        shaftStart: startHead ? { x: start.x + unitX * length, y: start.y + unitY * length } : start,
        shaftEnd: endHead ? { x: end.x - unitX * length, y: end.y - unitY * length } : end,
        start: startHead,
        end: endHead,
    };
};
