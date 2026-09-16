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
