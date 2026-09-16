import type { ArrowDirection, AutoResizeAxis, BorderStyle, CanvasShape, CanvasState, CornerStyle, IconCorner, LabelSize, LegendIconType, LegendItem, Padding, Point, RouteStyle, ShapeType, TextAlign, VerticalAlign } from './types';
import { isCssColor } from './colors';
import { MAX_TAGS_PER_SHAPE, normalizeTags } from './tags';
import { ICON_CORNERS, MAX_SHAPE_ICON_SIZE, MIN_SHAPE_ICON_SIZE, shapeSupportsIcon } from './appearance';
export const TOTONIO_DOCUMENT_VERSION = 3 as const;
const DOCUMENT_FORMAT = 'totonio';
const isDocumentFormat = (value: unknown) => value === DOCUMENT_FORMAT;
const isDocumentVersion = (value: unknown): value is number => value === 3;
type DocumentEndpoint = {
    type: 'free';
    x: number;
    y: number;
} | {
    type: 'shape';
    shapeId: string;
    position?: number;
};
type DocumentShape = {
    id: string;
    type: ShapeType;
    name?: string;
    tags?: string[];
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    locked?: boolean;
    frameOrder?: number;
    frameFitContent?: boolean;
    parentId: string | null;
    color: string;
    label?: string;
    fill?: string;
    borderStyle?: BorderStyle;
    cornerStyle?: CornerStyle;
    strokeWidth?: number;
    labelColor?: string;
    labelAlign?: TextAlign;
    labelVerticalAlign?: VerticalAlign;
    labelSize?: LabelSize;
    labelBold?: boolean;
    labelItalic?: boolean;
    labelUnderline?: boolean;
    labelStrike?: boolean;
    labelWrap?: boolean;
    body?: string;
    bodyColor?: string;
    bodyAlign?: TextAlign;
    bodyVerticalAlign?: VerticalAlign;
    bodySize?: LabelSize;
    bodyBold?: boolean;
    bodyItalic?: boolean;
    bodyUnderline?: boolean;
    bodyStrike?: boolean;
    bodyWrap?: boolean;
    separatorColor?: string;
    separatorStyle?: BorderStyle;
    separatorWidth?: number;
    headerFill?: string;
    legendItems?: LegendItem[];
    imageData?: string;
    imageAssetId?: string;
    iconData?: string;
    iconAssetId?: string;
    iconCorner?: IconCorner;
    iconSize?: number;
    scaleTextWithBounds?: boolean;
    padding?: Padding;
    autoNest?: boolean;
    autoResize?: boolean;
    autoResizeAxis?: AutoResizeAxis;
    keepAspectRatio?: boolean;
    arrowDirection?: ArrowDirection;
    labelPosition?: number;
    labelRotation?: number;
    routeStyle?: RouteStyle;
    routePoints?: Point[];
    routeOffset?: number;
    lockAngle?: number;
    start?: DocumentEndpoint;
    end?: DocumentEndpoint;
};
export type TotonioDocument = {
    format: typeof DOCUMENT_FORMAT;
    version: typeof TOTONIO_DOCUMENT_VERSION;
    assets: Array<{
        id: string;
        data: string;
    }>;
    shapes: DocumentShape[];
    viewport: {
        x: number;
        y: number;
        zoom: number;
    };
    settings: {
        gridEnabled: boolean;
    };
};
const shapeTypes = new Set<ShapeType>(['rect', 'brackets', 'arrow', 'circle', 'decision', 'cloud', 'person', 'panel', 'database', 'database2', 'firewall', 'legend', 'image', 'plain-line', 'line', 'text', 'frame', 'group']);
const legendIconTypes = new Set<LegendIconType>(['rect', 'brackets', 'arrow', 'circle', 'decision', 'cloud', 'person', 'panel', 'database', 'database2', 'firewall', 'image', 'plain-line', 'line', 'text']);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const autoResizeAxes = new Set<AutoResizeAxis>(['both', 'width', 'height']);
const borderStyles = new Set<BorderStyle>(['solid', 'dashed', 'dotted']);
const cornerStyles = new Set<CornerStyle>(['rounded', 'sharp']);
const connectorStyles = new Set<BorderStyle>([...borderStyles, 'double']);
const arrowDirections = new Set<ArrowDirection>(['none', 'start', 'end', 'both']);
const routeStyles = new Set<RouteStyle>(['straight', 'orthogonal', 'curved']);
const textAlignments = new Set<TextAlign>(['left', 'center', 'right', 'justify']);
const verticalAlignments = new Set<VerticalAlign>(['top', 'middle', 'bottom']);
const labelSizes = new Set<LabelSize>(['extra-small', 'small', 'medium', 'large', 'extra-large', 'extra-extra-large']);
const iconCorners = new Set<IconCorner>(ICON_CORNERS);
const isEmbeddedImageData = (value: unknown): value is string => typeof value === 'string'
    && /^data:image\/(?:png|jpeg|webp|gif|svg\+xml);base64,[a-z0-9+/=]+$/i.test(value)
    && value.length <= 3000000;
const parsePadding = (value: unknown): Padding | undefined => {
    if (!isRecord(value))
        return undefined;
    if (!isFiniteNumber(value.top) || !isFiniteNumber(value.right) || !isFiniteNumber(value.bottom) || !isFiniteNumber(value.left))
        return undefined;
    if (value.top < 0 || value.right < 0 || value.bottom < 0 || value.left < 0)
        return undefined;
    return { top: value.top, right: value.right, bottom: value.bottom, left: value.left };
};
const parseEndpoint = (value: unknown): DocumentEndpoint | undefined => {
    if (!isRecord(value))
        return undefined;
    if (value.type === 'free' && isFiniteNumber(value.x) && isFiniteNumber(value.y)) {
        return { type: 'free', x: value.x, y: value.y };
    }
    if (value.type === 'shape' && typeof value.shapeId === 'string') {
        if (value.position !== undefined && (!isFiniteNumber(value.position) || value.position < 0 || value.position > 1))
            return undefined;
        return { type: 'shape', shapeId: value.shapeId, ...(value.position !== undefined ? { position: value.position } : {}) };
    }
    return undefined;
};
const parseLegendItems = (value: unknown): LegendItem[] | undefined => {
    if (!Array.isArray(value))
        return undefined;
    const items = value.map((item): LegendItem | null => {
        if (!isRecord(item) || typeof item.id !== 'string' || !legendIconTypes.has(item.icon as LegendIconType))
            return null;
        if (typeof item.label !== 'string' || !isCssColor(item.color) || !isCssColor(item.fill))
            return null;
        if (item.borderStyle !== undefined && !borderStyles.has(item.borderStyle as BorderStyle))
            return null;
        return { id: item.id, icon: item.icon as LegendIconType, label: item.label, color: item.color, fill: item.fill, ...(item.borderStyle ? { borderStyle: item.borderStyle as BorderStyle } : {}) };
    });
    if (items.some((item) => item === null))
        return undefined;
    const parsed = items as LegendItem[];
    return new Set(parsed.map((item) => item.id)).size === parsed.length ? parsed : undefined;
};
const parseTags = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value) || value.length > MAX_TAGS_PER_SHAPE)
        return undefined;
    if (!value.every((tag) => typeof tag === 'string'))
        return undefined;
    const tags = normalizeTags(value);
    return tags.length > 0 ? tags : undefined;
};
const parseShape = (value: unknown): DocumentShape | null => {
    if (!isRecord(value) || typeof value.id !== 'string' || !shapeTypes.has(value.type as ShapeType))
        return null;
    if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y) || !isFiniteNumber(value.width) || !isFiniteNumber(value.height))
        return null;
    if (value.parentId !== null && typeof value.parentId !== 'string')
        return null;
    if (!isCssColor(value.color) || (value.name !== undefined && typeof value.name !== 'string'))
        return null;
    const shape: DocumentShape = {
        id: value.id,
        type: value.type as ShapeType,
        x: value.x,
        y: value.y,
        width: value.width,
        height: value.height,
        parentId: value.parentId,
        color: value.color,
    };
    if (value.rotation !== undefined && isFiniteNumber(value.rotation))
        shape.rotation = value.rotation;
    if (value.rotation !== undefined && shape.rotation === undefined)
        return null;
    if (value.locked !== undefined && typeof value.locked === 'boolean')
        shape.locked = value.locked;
    if (value.locked !== undefined && shape.locked === undefined)
        return null;
    if (value.frameOrder !== undefined && Number.isInteger(value.frameOrder) && (value.frameOrder as number) >= 0)
        shape.frameOrder = value.frameOrder as number;
    if (value.frameOrder !== undefined && shape.frameOrder === undefined)
        return null;
    if (value.frameFitContent !== undefined && typeof value.frameFitContent === 'boolean')
        shape.frameFitContent = value.frameFitContent;
    if (value.frameFitContent !== undefined && shape.frameFitContent === undefined)
        return null;
    if (value.name !== undefined)
        shape.name = value.name;
    if (value.label !== undefined && typeof value.label === 'string')
        shape.label = value.label;
    if (value.fill !== undefined && isCssColor(value.fill))
        shape.fill = value.fill;
    const supportedBorderStyles = shape.type === 'line' || shape.type === 'plain-line' ? connectorStyles : borderStyles;
    if (value.borderStyle !== undefined && supportedBorderStyles.has(value.borderStyle as BorderStyle))
        shape.borderStyle = value.borderStyle as BorderStyle;
    if (value.cornerStyle !== undefined && cornerStyles.has(value.cornerStyle as CornerStyle))
        shape.cornerStyle = value.cornerStyle as CornerStyle;
    if (value.strokeWidth !== undefined && isFiniteNumber(value.strokeWidth) && value.strokeWidth >= 0)
        shape.strokeWidth = value.strokeWidth;
    if (value.labelColor !== undefined && isCssColor(value.labelColor))
        shape.labelColor = value.labelColor;
    if (value.labelAlign !== undefined && textAlignments.has(value.labelAlign as TextAlign))
        shape.labelAlign = value.labelAlign as TextAlign;
    if (value.labelVerticalAlign !== undefined && verticalAlignments.has(value.labelVerticalAlign as VerticalAlign))
        shape.labelVerticalAlign = value.labelVerticalAlign as VerticalAlign;
    if (value.labelSize !== undefined && labelSizes.has(value.labelSize as LabelSize))
        shape.labelSize = value.labelSize as LabelSize;
    if (value.labelBold !== undefined && typeof value.labelBold === 'boolean')
        shape.labelBold = value.labelBold;
    if (value.labelItalic !== undefined && typeof value.labelItalic === 'boolean')
        shape.labelItalic = value.labelItalic;
    if (value.labelUnderline !== undefined && typeof value.labelUnderline === 'boolean')
        shape.labelUnderline = value.labelUnderline;
    if (value.labelStrike !== undefined && typeof value.labelStrike === 'boolean')
        shape.labelStrike = value.labelStrike;
    if (value.labelWrap !== undefined && typeof value.labelWrap === 'boolean')
        shape.labelWrap = value.labelWrap;
    if (value.body !== undefined && typeof value.body === 'string')
        shape.body = value.body;
    if (value.bodyColor !== undefined && isCssColor(value.bodyColor))
        shape.bodyColor = value.bodyColor;
    if (value.bodyAlign !== undefined && textAlignments.has(value.bodyAlign as TextAlign))
        shape.bodyAlign = value.bodyAlign as TextAlign;
    if (value.bodyVerticalAlign !== undefined && verticalAlignments.has(value.bodyVerticalAlign as VerticalAlign))
        shape.bodyVerticalAlign = value.bodyVerticalAlign as VerticalAlign;
    if (value.bodySize !== undefined && labelSizes.has(value.bodySize as LabelSize))
        shape.bodySize = value.bodySize as LabelSize;
    if (value.bodyBold !== undefined && typeof value.bodyBold === 'boolean')
        shape.bodyBold = value.bodyBold;
    if (value.bodyItalic !== undefined && typeof value.bodyItalic === 'boolean')
        shape.bodyItalic = value.bodyItalic;
    if (value.bodyUnderline !== undefined && typeof value.bodyUnderline === 'boolean')
        shape.bodyUnderline = value.bodyUnderline;
    if (value.bodyStrike !== undefined && typeof value.bodyStrike === 'boolean')
        shape.bodyStrike = value.bodyStrike;
    if (value.bodyWrap !== undefined && typeof value.bodyWrap === 'boolean')
        shape.bodyWrap = value.bodyWrap;
    if (value.separatorColor !== undefined && isCssColor(value.separatorColor))
        shape.separatorColor = value.separatorColor;
    if (value.separatorStyle !== undefined && borderStyles.has(value.separatorStyle as BorderStyle))
        shape.separatorStyle = value.separatorStyle as BorderStyle;
    if (value.separatorWidth !== undefined && isFiniteNumber(value.separatorWidth) && value.separatorWidth >= 0)
        shape.separatorWidth = value.separatorWidth;
    if (value.headerFill !== undefined && isCssColor(value.headerFill))
        shape.headerFill = value.headerFill;
    if (value.legendItems !== undefined)
        shape.legendItems = parseLegendItems(value.legendItems);
    if (value.tags !== undefined)
        shape.tags = parseTags(value.tags);
    if (value.tags !== undefined && shape.tags === undefined)
        return null;
    if (value.imageData !== undefined && isEmbeddedImageData(value.imageData))
        shape.imageData = value.imageData;
    if (value.imageAssetId !== undefined && typeof value.imageAssetId === 'string')
        shape.imageAssetId = value.imageAssetId;
    if (value.iconData !== undefined && isEmbeddedImageData(value.iconData))
        shape.iconData = value.iconData;
    if (value.iconAssetId !== undefined && typeof value.iconAssetId === 'string')
        shape.iconAssetId = value.iconAssetId;
    if ((shape.imageData && shape.imageAssetId) || (shape.iconData && shape.iconAssetId))
        return null;
    if (value.iconCorner !== undefined && iconCorners.has(value.iconCorner as IconCorner))
        shape.iconCorner = value.iconCorner as IconCorner;
    if (value.iconSize !== undefined && isFiniteNumber(value.iconSize) && value.iconSize >= MIN_SHAPE_ICON_SIZE && value.iconSize <= MAX_SHAPE_ICON_SIZE)
        shape.iconSize = value.iconSize;
    if ((value.iconData !== undefined && shape.iconData === undefined) || (value.imageAssetId !== undefined && !shape.imageAssetId) || (value.iconAssetId !== undefined && !shape.iconAssetId) || (value.iconCorner !== undefined && !shape.iconCorner) || (value.iconSize !== undefined && shape.iconSize === undefined))
        return null;
    if ((shape.iconData || shape.iconAssetId) && !shapeSupportsIcon(shape.type))
        return null;
    if (value.scaleTextWithBounds !== undefined && typeof value.scaleTextWithBounds === 'boolean')
        shape.scaleTextWithBounds = value.scaleTextWithBounds;
    if ((value.label !== undefined && shape.label === undefined) || (value.fill !== undefined && shape.fill === undefined) || (value.borderStyle !== undefined && !shape.borderStyle) || (value.cornerStyle !== undefined && !shape.cornerStyle) || (value.strokeWidth !== undefined && shape.strokeWidth === undefined) || (value.labelColor !== undefined && shape.labelColor === undefined) || (value.labelAlign !== undefined && !shape.labelAlign) || (value.labelVerticalAlign !== undefined && !shape.labelVerticalAlign) || (value.labelSize !== undefined && !shape.labelSize) || (value.labelBold !== undefined && shape.labelBold === undefined) || (value.labelItalic !== undefined && shape.labelItalic === undefined) || (value.labelUnderline !== undefined && shape.labelUnderline === undefined) || (value.labelStrike !== undefined && shape.labelStrike === undefined) || (value.labelWrap !== undefined && shape.labelWrap === undefined) || (value.body !== undefined && shape.body === undefined) || (value.bodyColor !== undefined && shape.bodyColor === undefined) || (value.bodyAlign !== undefined && !shape.bodyAlign) || (value.bodyVerticalAlign !== undefined && !shape.bodyVerticalAlign) || (value.bodySize !== undefined && !shape.bodySize) || (value.bodyBold !== undefined && shape.bodyBold === undefined) || (value.bodyItalic !== undefined && shape.bodyItalic === undefined) || (value.bodyUnderline !== undefined && shape.bodyUnderline === undefined) || (value.bodyStrike !== undefined && shape.bodyStrike === undefined) || (value.bodyWrap !== undefined && shape.bodyWrap === undefined) || (value.separatorColor !== undefined && shape.separatorColor === undefined) || (value.separatorStyle !== undefined && !shape.separatorStyle) || (value.separatorWidth !== undefined && shape.separatorWidth === undefined) || (value.headerFill !== undefined && shape.headerFill === undefined) || (value.legendItems !== undefined && shape.legendItems === undefined) || (value.imageData !== undefined && shape.imageData === undefined) || (value.scaleTextWithBounds !== undefined && shape.scaleTextWithBounds === undefined))
        return null;
    if (shape.type === 'image' && !shape.imageData && !shape.imageAssetId)
        return null;
    if (value.padding !== undefined)
        shape.padding = parsePadding(value.padding);
    if (value.autoNest !== undefined && typeof value.autoNest === 'boolean')
        shape.autoNest = value.autoNest;
    if (value.autoResize !== undefined && typeof value.autoResize === 'boolean')
        shape.autoResize = value.autoResize;
    if (value.autoResizeAxis !== undefined && autoResizeAxes.has(value.autoResizeAxis as AutoResizeAxis))
        shape.autoResizeAxis = value.autoResizeAxis as AutoResizeAxis;
    if (value.keepAspectRatio !== undefined && typeof value.keepAspectRatio === 'boolean')
        shape.keepAspectRatio = value.keepAspectRatio;
    if (value.arrowDirection !== undefined && arrowDirections.has(value.arrowDirection as ArrowDirection))
        shape.arrowDirection = value.arrowDirection as ArrowDirection;
    if (value.labelPosition !== undefined && isFiniteNumber(value.labelPosition) && value.labelPosition >= 0 && value.labelPosition <= 1)
        shape.labelPosition = value.labelPosition;
    if (value.labelRotation !== undefined && isFiniteNumber(value.labelRotation))
        shape.labelRotation = value.labelRotation;
    if (value.routeStyle !== undefined && routeStyles.has(value.routeStyle as RouteStyle))
        shape.routeStyle = value.routeStyle as RouteStyle;
    if (Array.isArray(value.routePoints) && value.routePoints.length <= 100 && value.routePoints.every((point: unknown): point is Point => isRecord(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y))) {
        shape.routePoints = value.routePoints.map((point) => ({ x: point.x, y: point.y }));
    }
    if (value.routeOffset !== undefined && isFiniteNumber(value.routeOffset))
        shape.routeOffset = value.routeOffset;
    if (value.lockAngle !== undefined && isFiniteNumber(value.lockAngle))
        shape.lockAngle = value.lockAngle;
    if ((value.padding !== undefined && !shape.padding) || (value.autoNest !== undefined && shape.autoNest === undefined) || (value.autoResize !== undefined && shape.autoResize === undefined) || (value.autoResizeAxis !== undefined && !shape.autoResizeAxis) || (value.keepAspectRatio !== undefined && shape.keepAspectRatio === undefined) || (value.arrowDirection !== undefined && !shape.arrowDirection) || (value.labelPosition !== undefined && shape.labelPosition === undefined) || (value.labelRotation !== undefined && shape.labelRotation === undefined) || (value.routeStyle !== undefined && !shape.routeStyle) || (value.routePoints !== undefined && !shape.routePoints) || (value.routeOffset !== undefined && shape.routeOffset === undefined) || (value.lockAngle !== undefined && shape.lockAngle === undefined))
        return null;
    if (value.start !== undefined)
        shape.start = parseEndpoint(value.start);
    if (value.end !== undefined)
        shape.end = parseEndpoint(value.end);
    if ((value.start !== undefined && !shape.start) || (value.end !== undefined && !shape.end))
        return null;
    if ((shape.type === 'line' || shape.type === 'plain-line') && (!shape.start || !shape.end))
        return null;
    if (shape.routePoints && shape.type !== 'line' && shape.type !== 'plain-line')
        return null;
    if (shape.routeOffset !== undefined && shape.type !== 'line' && shape.type !== 'plain-line')
        return null;
    if (shape.lockAngle !== undefined && shape.type !== 'line' && shape.type !== 'plain-line')
        return null;
    if (shape.type === 'plain-line' && (shape.start?.type !== 'free' || shape.end?.type !== 'free'))
        return null;
    if (shape.type === 'frame' && shape.frameOrder === undefined)
        return null;
    if (shape.frameFitContent !== undefined && shape.type !== 'frame')
        return null;
    return shape;
};
const fromDocumentShape = (shape: DocumentShape, assets: Map<string, string>): CanvasShape => {
    const { imageAssetId, iconAssetId, ...rest } = shape;
    return {
        ...rest,
        imageData: imageAssetId ? assets.get(imageAssetId) : shape.imageData,
        iconData: iconAssetId ? assets.get(iconAssetId) : shape.iconData,
        tags: shape.tags ? [...shape.tags] : undefined,
        legendItems: shape.legendItems?.map((item) => ({ ...item })),
        routePoints: shape.routePoints?.map((point) => ({ ...point })),
        start: shape.start ? { ...shape.start } : undefined,
        end: shape.end ? { ...shape.end } : undefined,
    };
};
const hasParentCycle = (shapes: DocumentShape[]) => {
    const parentById = new Map(shapes.map((shape) => [shape.id, shape.parentId]));
    return shapes.some((shape) => {
        const visited = new Set<string>([shape.id]);
        let parentId = shape.parentId;
        while (parentId) {
            if (visited.has(parentId))
                return true;
            visited.add(parentId);
            parentId = parentById.get(parentId) ?? null;
        }
        return false;
    });
};
export const parseTotonioDocument = (value: unknown): TotonioDocument | null => {
    if (!isRecord(value) || !isDocumentFormat(value.format) || !isDocumentVersion(value.version))
        return null;
    if (!Array.isArray(value.shapes) || !isRecord(value.viewport) || !isRecord(value.settings))
        return null;
    if (!isFiniteNumber(value.viewport.x) || !isFiniteNumber(value.viewport.y) || !isFiniteNumber(value.viewport.zoom) || value.viewport.zoom <= 0)
        return null;
    if (typeof value.settings.gridEnabled !== 'boolean')
        return null;
    const shapes = value.shapes.map(parseShape);
    if (shapes.some((shape) => shape === null))
        return null;
    const parsedShapes = shapes as DocumentShape[];
    const rawAssets = value.assets;
    if (!Array.isArray(rawAssets))
        return null;
    const assets = rawAssets.map((asset) => isRecord(asset) && typeof asset.id === 'string' && isEmbeddedImageData(asset.data) ? { id: asset.id, data: asset.data } : null);
    if (assets.some((asset) => asset === null))
        return null;
    const parsedAssets = assets as Array<{
        id: string;
        data: string;
    }>;
    const assetData = new Map(parsedAssets.map((asset) => [asset.id, asset.data]));
    if (assetData.size !== parsedAssets.length)
        return null;
    if (parsedShapes.some((shape) => (shape.imageAssetId && !assetData.has(shape.imageAssetId)) || (shape.iconAssetId && !assetData.has(shape.iconAssetId))))
        return null;
    const ids = new Set(parsedShapes.map((shape) => shape.id));
    if (ids.size !== parsedShapes.length)
        return null;
    if (parsedShapes.some((shape) => shape.parentId !== null && !ids.has(shape.parentId)))
        return null;
    const typeById = new Map(parsedShapes.map((shape) => [shape.id, shape.type]));
    if (parsedShapes.some((shape) => shape.type === 'frame' && shape.parentId !== null && typeById.get(shape.parentId) !== 'group'))
        return null;
    if (parsedShapes.some((shape) => [shape.start, shape.end].some((endpoint) => endpoint?.type === 'shape' && !ids.has(endpoint.shapeId))))
        return null;
    if (hasParentCycle(parsedShapes))
        return null;
    return {
        format: DOCUMENT_FORMAT,
        version: TOTONIO_DOCUMENT_VERSION,
        assets: parsedAssets,
        shapes: parsedShapes,
        viewport: { x: value.viewport.x, y: value.viewport.y, zoom: value.viewport.zoom },
        settings: { gridEnabled: value.settings.gridEnabled },
    };
};
export const canvasStateFromDocument = (document: TotonioDocument): CanvasState => {
    const assets = new Map(document.assets.map((asset) => [asset.id, asset.data]));
    return {
        shapes: document.shapes.map((shape) => fromDocumentShape(shape, assets)),
        view: { ...document.viewport },
        showGrid: document.settings.gridEnabled,
    };
};
