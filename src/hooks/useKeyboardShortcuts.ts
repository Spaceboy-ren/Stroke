import { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import type { ToolType } from '../types';

export default function useKeyboardShortcuts() {
    const [showShortcuts, setShowShortcuts] = useState(false);

    const {
        activeTool,
        selectedIds,
        setActiveTool,
        toggleTheme,
        toggleGrid,
        undo,
        redo,
        deleteElements,
        elements,
        setSelectedIds,
    } = useStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore shortcuts when typing in input/textarea
            const activeElement = document.activeElement;
            if (
                activeElement?.tagName === 'INPUT' ||
                activeElement?.tagName === 'TEXTAREA'
            ) {
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdKey = isMac ? e.metaKey : e.ctrlKey;

            // Prevent default for our shortcuts
            const preventDefaults = ['KeyZ', 'KeyY', 'Quote', 'KeyL', 'Digit0', 'Equal', 'Minus'];
            if (cmdKey && preventDefaults.includes(e.code)) {
                e.preventDefault();
            }

            // Tool shortcuts
            if (!cmdKey && !e.shiftKey && !e.altKey) {
                const toolMap: Record<string, ToolType> = {
                    KeyV: 'select',
                    KeyD: 'draw',
                    KeyE: 'eraser',
                    KeyR: 'rectangle',
                    KeyC: 'circle',
                    KeyA: 'arrow',
                    KeyT: 'text',
                };

                if (toolMap[e.code]) {
                    e.preventDefault();
                    setActiveTool(toolMap[e.code]);
                }
            }

            // Diamond (Shift+D)
            if (e.shiftKey && e.code === 'KeyD' && !cmdKey) {
                e.preventDefault();
                setActiveTool('diamond');
            }

            // Undo/Redo
            if (cmdKey && e.code === 'KeyZ') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }

            if (cmdKey && e.code === 'KeyY') {
                e.preventDefault();
                redo();
            }

            // Toggle grid (Cmd+')
            if (cmdKey && e.code === 'Quote') {
                e.preventDefault();
                toggleGrid();
            }

            // Toggle theme (Cmd+Shift+L)
            if (cmdKey && e.shiftKey && e.code === 'KeyL') {
                e.preventDefault();
                toggleTheme();
            }

            // Delete selected elements
            if ((e.code === 'Delete' || e.code === 'Backspace') && selectedIds.size > 0) {
                e.preventDefault();
                deleteElements(Array.from(selectedIds));
            }

            // Select all (Cmd+A)
            if (cmdKey && e.code === 'KeyA') {
                e.preventDefault();
                setSelectedIds(new Set(elements.map((el) => el.id)));
            }

            // Toggle shortcuts help (? key = Shift+/)
            if (e.shiftKey && e.code === 'Slash' && !cmdKey) {
                e.preventDefault();
                setShowShortcuts(prev => !prev);
            }

            // Escape to deselect or close shortcuts
            if (e.code === 'Escape') {
                if (showShortcuts) {
                    setShowShortcuts(false);
                } else {
                    setSelectedIds(new Set());
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        activeTool,
        selectedIds,
        elements,
        setActiveTool,
        toggleTheme,
        toggleGrid,
        undo,
        redo,
        deleteElements,
        setSelectedIds,
        showShortcuts,
    ]);

    return { showShortcuts, setShowShortcuts };
}
