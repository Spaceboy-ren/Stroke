import { create } from 'zustand';
import type { WhiteboardState, Element, Viewport, ToolType } from '../types';

const useStore = create<WhiteboardState>((set, get) => ({
    // Initial state
    elements: [],
    selectedIds: new Set<string>(),

    viewport: {
        x: 0,
        y: 0,
        zoom: 1,
    },

    activeTool: 'select',

    theme: 'light',
    gridVisible: true,
    snapToGrid: false,
    gridSize: 20,

    currentColor: '#000000',
    currentFillColor: 'transparent',
    currentStrokeWidth: 2,
    currentFontFamily: 'Inter',

    history: {
        past: [],
        future: [],
    },

    remotePreviews: new Map(),

    // Element actions
    addElement: (element: Element) => {
        set((state) => {
            const newElements = [...state.elements, element];
            return {
                elements: newElements,
                history: {
                    past: [...state.history.past, state.elements],
                    future: [],
                },
            };
        });
    },

    updateElement: (id: string, updates: Partial<Element>) => {
        set((state) => {
            const newElements = state.elements.map((el) =>
                el.id === id ? ({ ...el, ...updates } as Element) : el
            );
            return { elements: newElements };
        });
    },

    deleteElements: (ids: string[]) => {
        set((state) => {
            const idsSet = new Set(ids);
            const newElements = state.elements.filter((el) => !idsSet.has(el.id));
            return {
                elements: newElements,
                selectedIds: new Set<string>(),
                history: {
                    past: [...state.history.past, state.elements],
                    future: [],
                },
            };
        });
    },

    duplicateElements: (ids: string[]) => {
        set((state) => {
            const idsSet = new Set(ids);
            const elementsToDuplicate = state.elements.filter((el) => idsSet.has(el.id));

            const duplicatedElements = elementsToDuplicate.map((el) => ({
                ...el,
                id: crypto.randomUUID(),
                x: el.x + 20,
                y: el.y + 20,
            }));

            const newElements = [...state.elements, ...duplicatedElements];
            const newSelectedIds = new Set(duplicatedElements.map(el => el.id));

            return {
                elements: newElements,
                selectedIds: newSelectedIds,
                history: {
                    past: [...state.history.past, state.elements],
                    future: [],
                },
            };
        });
    },

    bringToFront: (ids: string[]) => {
        set((state) => {
            const idsSet = new Set(ids);
            const selectedElements = state.elements.filter((el) => idsSet.has(el.id));
            const otherElements = state.elements.filter((el) => !idsSet.has(el.id));

            const newElements = [...otherElements, ...selectedElements];

            return {
                elements: newElements,
                history: {
                    past: [...state.history.past, state.elements],
                    future: [],
                },
            };
        });
    },

    sendToBack: (ids: string[]) => {
        set((state) => {
            const idsSet = new Set(ids);
            const selectedElements = state.elements.filter((el) => idsSet.has(el.id));
            const otherElements = state.elements.filter((el) => !idsSet.has(el.id));

            const newElements = [...selectedElements, ...otherElements];

            return {
                elements: newElements,
                history: {
                    past: [...state.history.past, state.elements],
                    future: [],
                },
            };
        });
    },

    // Selection actions
    setSelectedIds: (ids: Set<string>) => {
        set({ selectedIds: ids });
    },

    toggleSelection: (id: string) => {
        set((state) => {
            const newSelectedIds = new Set(state.selectedIds);
            if (newSelectedIds.has(id)) {
                newSelectedIds.delete(id);
            } else {
                newSelectedIds.add(id);
            }
            return { selectedIds: newSelectedIds };
        });
    },

    clearSelection: () => {
        set({ selectedIds: new Set<string>() });
    },

    // Tool actions
    setActiveTool: (tool: ToolType) => {
        set({ activeTool: tool, selectedIds: new Set<string>() });
    },

    setViewport: (viewport: Partial<Viewport>) => {
        set((state) => ({
            viewport: { ...state.viewport, ...viewport },
        }));
    },

    // UI actions
    toggleTheme: () => {
        set((state) => {
            const newTheme = state.theme === 'light' ? 'dark' : 'light';
            const newColor = newTheme === 'dark' ? '#ffffff' : '#000000';

            if (typeof document !== 'undefined') {
                if (newTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                localStorage.setItem('theme', newTheme);
            }
            // Only update the UI theme + default pen color.
            // Do NOT mutate elements — that would broadcast inverted colors to all collaborators.
            return {
                theme: newTheme,
                currentColor: newColor,
            };
        });
    },

    toggleGrid: () => {
        set((state) => ({ gridVisible: !state.gridVisible }));
    },

    setSnapToGrid: (snap: boolean) => {
        set({ snapToGrid: snap });
    },

    setGridSize: (size: number) => {
        set({ gridSize: size });
    },

    // Drawing settings
    setCurrentColor: (color: string) => {
        set({ currentColor: color });
    },

    setCurrentFillColor: (color: string) => {
        set({ currentFillColor: color });
    },

    setCurrentStrokeWidth: (width: number) => {
        set({ currentStrokeWidth: width });
    },

    setCurrentFontFamily: (fontFamily: string) => {
        set({ currentFontFamily: fontFamily });
    },

    // History actions
    undo: () => {
        set((state) => {
            if (state.history.past.length === 0) return state;

            const previous = state.history.past[state.history.past.length - 1];
            const newPast = state.history.past.slice(0, -1);

            return {
                elements: previous,
                history: {
                    past: newPast,
                    future: [state.elements, ...state.history.future],
                },
                selectedIds: new Set<string>(),
            };
        });
    },

    redo: () => {
        set((state) => {
            if (state.history.future.length === 0) return state;

            const next = state.history.future[0];
            const newFuture = state.history.future.slice(1);

            return {
                elements: next,
                history: {
                    past: [...state.history.past, state.elements],
                    future: newFuture,
                },
                selectedIds: new Set<string>(),
            };
        });
    },

    canUndo: () => get().history.past.length > 0,
    canRedo: () => get().history.future.length > 0,

    // Text in shape feature
    clipTextToShape: (textId: string, shapeId: string) => {
        set((state) => {
            const shape = state.elements.find((el) => el.id === shapeId && el.type === 'shape');
            const text = state.elements.find((el) => el.id === textId && el.type === 'text');

            if (!shape || !text) return state;

            // Center the text in the shape
            const centeredX = shape.x + (shape.type === 'shape' ? shape.width / 2 : 0);
            const centeredY = shape.y + (shape.type === 'shape' ? shape.height / 2 : 0);

            const newElements = state.elements.map((el) => {
                if (el.id === textId) {
                    return {
                        ...el,
                        x: centeredX,
                        y: centeredY,
                        parentId: shapeId,
                        clippedToShape: true,
                    };
                }
                return el;
            });

            return {
                elements: newElements,
                history: {
                    past: [...state.history.past, state.elements],
                    future: [],
                },
            };
        });
    },
}));

// Initialize theme from localStorage
if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
        useStore.setState({ theme: savedTheme });
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        }
    }
}

export default useStore;
