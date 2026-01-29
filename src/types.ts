export type ToolType = 'select' | 'draw' | 'rectangle' | 'circle' | 'ellipse' | 'diamond' | 'arrow' | 'text' | 'eraser';

export type ShapeType = 'rectangle' | 'circle' | 'ellipse' | 'diamond';

export interface Point {
    x: number;
    y: number;
}

export interface BaseElement {
    id: string;
    type: 'shape' | 'stroke' | 'text' | 'arrow';
    x: number;
    y: number;
    rotation: number;
    strokeColor: string;
    fillColor: string;
    strokeWidth: number;
    parentId?: string;
    clippedToShape?: boolean;
}

export interface Shape extends BaseElement {
    type: 'shape';
    shapeType: ShapeType;
    width: number;
    height: number;
}

export interface Stroke extends BaseElement {
    type: 'stroke';
    points: Point[];
}

export interface TextElement extends BaseElement {
    type: 'text';
    text: string;
    fontSize: number;
    fontWeight: number;
    fontFamily?: string;
    textAlign: 'left' | 'center' | 'right';
    width?: number;
    height?: number;
}

export interface Arrow extends BaseElement {
    type: 'arrow';
    endX: number;
    endY: number;
    startArrowhead?: boolean;
    endArrowhead?: boolean;
}

export type Element = Shape | Stroke | TextElement | Arrow;

export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

export interface HistoryState {
    past: Element[][];
    future: Element[][];
}

export interface WhiteboardState {
    // Elements
    elements: Element[];
    selectedIds: Set<string>;

    // Canvas state
    viewport: Viewport;

    // Tool state
    activeTool: ToolType;

    // UI state
    theme: 'light' | 'dark';
    gridVisible: boolean;
    snapToGrid: boolean;
    gridSize: number;

    // Drawing state
    currentColor: string;
    currentFillColor: string;
    currentStrokeWidth: number;
    currentFontFamily: string;

    // History
    history: HistoryState;

    // Actions
    addElement: (element: Element) => void;
    updateElement: (id: string, updates: Partial<Element>) => void;
    deleteElements: (ids: string[]) => void;
    duplicateElements: (ids: string[]) => void;
    bringToFront: (ids: string[]) => void;
    sendToBack: (ids: string[]) => void;
    setSelectedIds: (ids: Set<string>) => void;
    toggleSelection: (id: string) => void;
    clearSelection: () => void;

    setActiveTool: (tool: ToolType) => void;
    setViewport: (viewport: Partial<Viewport>) => void;

    toggleTheme: () => void;
    toggleGrid: () => void;
    setSnapToGrid: (snap: boolean) => void;
    setGridSize: (size: number) => void;

    setCurrentColor: (color: string) => void;
    setCurrentFillColor: (color: string) => void;
    setCurrentStrokeWidth: (width: number) => void;
    setCurrentFontFamily: (fontFamily: string) => void;

    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;

    clipTextToShape: (textId: string, shapeId: string) => void;
}
