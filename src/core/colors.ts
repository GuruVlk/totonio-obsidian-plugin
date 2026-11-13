export const CANVAS_BACKGROUND = '#f8f7f3';
export const isCssColor = (value: unknown): value is string => typeof value === 'string' && (value === 'transparent' || value === 'none' || value === 'currentColor'
    || /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)
    || /^(?:rgb|rgba|hsl|hsla)\([0-9a-z.,%\s/+-]+\)$/i.test(value));
