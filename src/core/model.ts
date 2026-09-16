import type { CanvasShape } from './types';
const shapesById = new WeakMap<CanvasShape[], Map<string, CanvasShape>>();
const childrenByParent = new WeakMap<CanvasShape[], Map<string | null, CanvasShape[]>>();
const shapeIndex = (shapes: CanvasShape[]) => {
    let index = shapesById.get(shapes);
    if (!index) {
        index = new Map(shapes.map((shape) => [shape.id, shape]));
        shapesById.set(shapes, index);
    }
    return index;
};
const childIndex = (shapes: CanvasShape[]) => {
    let index = childrenByParent.get(shapes);
    if (!index) {
        index = new Map<string | null, CanvasShape[]>();
        shapes.forEach((shape) => {
            const siblings = index!.get(shape.parentId);
            if (siblings)
                siblings.push(shape);
            else
                index!.set(shape.parentId, [shape]);
        });
        childrenByParent.set(shapes, index);
    }
    return index;
};
export const findShapeById = (id: string, shapes: CanvasShape[]): CanvasShape | undefined => shapeIndex(shapes).get(id);
export const childShapes = (id: string | null, shapes: CanvasShape[]): CanvasShape[] => childIndex(shapes).get(id) ?? [];
