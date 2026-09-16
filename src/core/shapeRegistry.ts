import type { AutoResizeAxis, Padding, ShapeType } from './types';
export const DEFAULT_CONTAINER_PADDING: Padding = { top: 16, right: 16, bottom: 16, left: 16 };
export type ShapeDefinition = {
    type: ShapeType;
    label: string;
    geometry: 'rectangle' | 'brackets' | 'arrow' | 'ellipse' | 'diamond' | 'cloud' | 'person' | 'panel' | 'cylinder' | 'database-icon' | 'firewall' | 'legend' | 'image' | 'connector' | 'text' | 'frame' | 'group';
    defaultSize: {
        width: number;
        height: number;
    };
    defaultColor: string;
    canContain: boolean;
    lockAspectRatio: boolean;
    editableProperties: readonly ('name' | 'label' | 'color' | 'fill' | 'stroke' | 'text' | 'size' | 'padding' | 'autoResize')[];
    containerDefaults?: {
        padding: Padding;
        autoResize: boolean;
        autoResizeAxis: AutoResizeAxis;
        keepAspectRatio: boolean;
    };
};
export const shapeDefinitions = {
    rect: {
        type: 'rect', label: 'Rectangle', geometry: 'rectangle', defaultSize: { width: 160, height: 120 },
        defaultColor: '#2f7d6d', canContain: true, lockAspectRatio: false, editableProperties: ['name', 'label', 'color', 'fill', 'stroke', 'text', 'size', 'padding', 'autoResize'],
        containerDefaults: { padding: DEFAULT_CONTAINER_PADDING, autoResize: false, autoResizeAxis: 'both', keepAspectRatio: false },
    },
    brackets: {
        type: 'brackets', label: 'Brackets', geometry: 'brackets', defaultSize: { width: 220, height: 150 },
        defaultColor: '#232323', canContain: true, lockAspectRatio: false, editableProperties: ['name', 'label', 'color', 'fill', 'stroke', 'text', 'size', 'padding', 'autoResize'],
        containerDefaults: { padding: DEFAULT_CONTAINER_PADDING, autoResize: false, autoResizeAxis: 'both', keepAspectRatio: false },
    },
    arrow: {
        type: 'arrow', label: 'Arrow', geometry: 'arrow', defaultSize: { width: 170, height: 96 },
        defaultColor: '#232323', canContain: false, lockAspectRatio: false, editableProperties: ['name', 'label', 'color', 'fill', 'stroke', 'text', 'size'],
    },
    circle: {
        type: 'circle', label: 'Circle', geometry: 'ellipse', defaultSize: { width: 100, height: 100 },
        defaultColor: '#ef6351', canContain: true, lockAspectRatio: true, editableProperties: ['name', 'label', 'color', 'fill', 'stroke', 'text', 'size', 'padding', 'autoResize'],
        containerDefaults: { padding: DEFAULT_CONTAINER_PADDING, autoResize: false, autoResizeAxis: 'both', keepAspectRatio: true },
    },
    decision: {
        type: 'decision', label: 'Decision', geometry: 'diamond', defaultSize: { width: 100, height: 100 },
        defaultColor: '#e5a93d', canContain: true, lockAspectRatio: true, editableProperties: ['name', 'label', 'color', 'fill', 'stroke', 'text', 'size', 'padding', 'autoResize'],
        containerDefaults: { padding: DEFAULT_CONTAINER_PADDING, autoResize: false, autoResizeAxis: 'both', keepAspectRatio: true },
    },
    cloud: {
        type: 'cloud', label: 'Cloud', geometry: 'cloud', defaultSize: { width: 176, height: 136 },
        defaultColor: '#5375d6', canContain: true, lockAspectRatio: false, editableProperties: ['name', 'label', 'color', 'fill', 'stroke', 'text', 'size', 'padding', 'autoResize'],
        containerDefaults: { padding: DEFAULT_CONTAINER_PADDING, autoResize: false, autoResizeAxis: 'both', keepAspectRatio: false },
    },
    person: {
        type: 'person', label: 'Person', geometry: 'person', defaultSize: { width: 64, height: 80 },
        defaultColor: '#9d422c', canContain: false, lockAspectRatio: true, editableProperties: ['name', 'label', 'color', 'fill', 'stroke', 'text', 'size'],
    },
    panel: {
        type: 'panel', label: 'Panel', geometry: 'panel', defaultSize: { width: 260, height: 180 },
        defaultColor: '#2f7d6d', canContain: true, lockAspectRatio: false, editableProperties: ['name', 'label', 'color', 'fill', 'stroke', 'text', 'size', 'padding', 'autoResize'],
        containerDefaults: { padding: DEFAULT_CONTAINER_PADDING, autoResize: false, autoResizeAxis: 'both', keepAspectRatio: false },
    },
    database: {
        type: 'database', label: 'Cylinder', geometry: 'cylinder', defaultSize: { width: 100, height: 120 },
        defaultColor: '#5375d6', canContain: false, lockAspectRatio: false, editableProperties: ['name', 'label', 'color', 'fill', 'stroke', 'text', 'size'],
    },
    database2: {
        type: 'database2', label: 'Database', geometry: 'database-icon', defaultSize: { width: 100, height: 124 },
        defaultColor: '#5375d6', canContain: false, lockAspectRatio: true, editableProperties: ['name', 'label', 'color', 'fill', 'stroke', 'text', 'size'],
    },
    firewall: {
        type: 'firewall', label: 'Firewall', geometry: 'firewall', defaultSize: { width: 64, height: 77 },
        defaultColor: '#9d422c', canContain: false, lockAspectRatio: true, editableProperties: ['name', 'label', 'color', 'fill', 'stroke', 'text', 'size'],
    },
    legend: {
        type: 'legend', label: 'Legend', geometry: 'legend', defaultSize: { width: 184, height: 96 },
        defaultColor: '#2f7d6d', canContain: false, lockAspectRatio: false, editableProperties: ['name', 'label', 'color', 'fill', 'stroke', 'text', 'size'],
    },
    image: {
        type: 'image', label: 'Image', geometry: 'image', defaultSize: { width: 320, height: 240 },
        defaultColor: 'transparent', canContain: false, lockAspectRatio: true, editableProperties: ['name', 'size'],
    },
    'plain-line': {
        type: 'plain-line', label: 'Line', geometry: 'connector', defaultSize: { width: 120, height: 0 },
        defaultColor: '#232323', canContain: false, lockAspectRatio: false, editableProperties: ['name', 'color', 'stroke'],
    },
    line: {
        type: 'line', label: 'Connector', geometry: 'connector', defaultSize: { width: 120, height: 0 },
        defaultColor: '#232323', canContain: false, lockAspectRatio: false, editableProperties: ['name', 'color', 'stroke'],
    },
    text: {
        type: 'text', label: 'Text', geometry: 'text', defaultSize: { width: 80, height: 50 },
        defaultColor: 'transparent', canContain: false, lockAspectRatio: false, editableProperties: ['name', 'label', 'text', 'size', 'padding'],
    },
    frame: {
        type: 'frame', label: 'Presentation Frame', geometry: 'frame', defaultSize: { width: 640, height: 360 },
        defaultColor: '#5375d6', canContain: false, lockAspectRatio: false, editableProperties: ['name', 'label', 'size'],
    },
    group: {
        type: 'group', label: 'Group', geometry: 'group', defaultSize: { width: 0, height: 0 },
        defaultColor: '#2f7d6d', canContain: false, lockAspectRatio: false, editableProperties: ['name'],
    },
} as const satisfies Record<ShapeType, ShapeDefinition>;
export const getShapeDefinition = (type: ShapeType): ShapeDefinition => shapeDefinitions[type];
