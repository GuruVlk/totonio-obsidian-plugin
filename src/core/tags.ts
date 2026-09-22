import { childShapes } from './model';
import type { CanvasShape } from './types';

export const MAX_TAG_LENGTH = 30;
export const MAX_TAGS_PER_SHAPE = 24;
export const normalizeTag = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH).trim();
const dedupe = (tags: string[]) => {
    const seen = new Set<string>();
    return tags.filter((tag) => {
        const key = tag.toLocaleLowerCase();
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
};
export const normalizeTags = (values: string[]) => dedupe(values.map(normalizeTag).filter(Boolean)).slice(0, MAX_TAGS_PER_SHAPE);

export type TagFilter = { tags: string[]; untagged: boolean; bridgeConnectors: boolean; inheritChildren: boolean };
export type TagSummary = { tag: string; count: number };

export const emptyTagFilter = (): TagFilter => ({ tags: [], untagged: false, bridgeConnectors: true, inheritChildren: true });
export const sameTag = (first: string, second: string): boolean => first.toLocaleLowerCase() === second.toLocaleLowerCase();
export const isTagFilterActive = (filter: TagFilter): boolean => filter.tags.length > 0 || filter.untagged;

export function canvasTags(shapes: CanvasShape[]): TagSummary[] {
    const counts = new Map<string, TagSummary>();
    for (const shape of shapes) for (const tag of shape.tags ?? []) {
        const key = tag.toLocaleLowerCase();
        const existing = counts.get(key);
        if (existing) existing.count++;
        else counts.set(key, { tag, count: 1 });
    }
    return [...counts.values()].sort((first, second) => first.tag.localeCompare(second.tag));
}

export const untaggedCount = (shapes: CanvasShape[]): number => shapes.filter((shape) => !shape.tags?.length).length;

export function tagFilterMatchIds(shapes: CanvasShape[], filter: TagFilter): Set<string> | null {
    if (!isTagFilterActive(filter)) return null;
    const matched = new Set<string>();
    const inherit = (shape: CanvasShape) => {
        if (matched.has(shape.id)) return;
        matched.add(shape.id);
        if (filter.inheritChildren) childShapes(shape.id, shapes).forEach(inherit);
    };
    for (const shape of shapes) {
        if (filter.tags.some((tag) => shape.tags?.some((value) => sameTag(value, tag)))) inherit(shape);
    }
    if (filter.untagged) for (const shape of shapes) if (!shape.tags?.length) matched.add(shape.id);
    if (filter.bridgeConnectors) for (const shape of shapes) {
        if (shape.type !== 'line' || matched.has(shape.id) || shape.tags?.length) continue;
        if ([shape.start, shape.end].every((endpoint) => endpoint?.type === 'shape' && matched.has(endpoint.shapeId))) matched.add(shape.id);
    }
    return matched;
}

export function reconcileTagFilter(shapes: CanvasShape[], filter: TagFilter): TagFilter {
    const available = canvasTags(shapes);
    return {
        ...filter,
        tags: filter.tags.filter((tag) => available.some((item) => sameTag(item.tag, tag))),
        untagged: filter.untagged && untaggedCount(shapes) > 0,
    };
}
