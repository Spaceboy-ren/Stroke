import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onEditText?: () => void;
    hasTextElement?: boolean;
}

export default function ContextMenu({ x, y, onClose, onEditText, hasTextElement }: ContextMenuProps) {
    const { selectedIds, elements, clipTextToShape, deleteElements, duplicateElements, bringToFront, sendToBack } = useStore();

    // Check if we have one text and one shape selected
    const selectedElements = Array.from(selectedIds).map(id =>
        elements.find(el => el.id === id)
    ).filter(Boolean);

    const hasTextAndShape = selectedElements.length === 2 &&
        selectedElements.some(el => el?.type === 'text') &&
        selectedElements.some(el => el?.type === 'shape');

    const handleClipText = () => {
        const textElement = selectedElements.find(el => el?.type === 'text');
        const shapeElement = selectedElements.find(el => el?.type === 'shape');

        if (textElement && shapeElement) {
            clipTextToShape(textElement.id, shapeElement.id);
        }
        onClose();
    };

    const handleEditText = () => {
        if (onEditText) {
            onEditText();
        }
        onClose();
    };

    const handleDelete = () => {
        deleteElements(Array.from(selectedIds));
        onClose();
    };

    const handleDuplicate = () => {
        duplicateElements(Array.from(selectedIds));
        onClose();
    };

    const handleBringToFront = () => {
        bringToFront(Array.from(selectedIds));
        onClose();
    };

    const handleSendToBack = () => {
        sendToBack(Array.from(selectedIds));
        onClose();
    };

    useEffect(() => {
        const handleClickOutside = () => onClose();
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('click', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    if (selectedIds.size === 0) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className="fixed z-50 min-w-[180px] bg-background border border-border rounded-lg shadow-lg overflow-hidden"
                style={{ left: x, top: y }}
                onClick={(e) => e.stopPropagation()}
            >
                {hasTextElement && (
                    <>
                        <button
                            onClick={handleEditText}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors duration-150"
                        >
                            Edit Text
                        </button>
                        <div className="border-t border-border my-1"></div>
                    </>
                )}
                <button
                    onClick={handleDuplicate}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors duration-150"
                >
                    Duplicate
                </button>
                <button
                    onClick={handleBringToFront}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors duration-150"
                >
                    Bring to Front
                </button>
                <button
                    onClick={handleSendToBack}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors duration-150"
                >
                    Send to Back
                </button>
                {hasTextAndShape && (
                    <>
                        <div className="border-t border-border my-1"></div>
                        <button
                            onClick={handleClipText}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors duration-150"
                        >
                            Clip Text to Shape
                        </button>
                    </>
                )}
                <div className="border-t border-border my-1"></div>
                <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-100 transition-colors duration-150"
                >
                    Delete
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
