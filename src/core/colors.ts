export const isCssColor = (value: unknown): value is string => typeof value === 'string' && (value === 'transparent' || value === 'none' || value === 'currentColor'
    || /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)
    || /^(?:rgb|rgba|hsl|hsla)\([0-9a-z.,%\s/+-]+\)$/i.test(value));
