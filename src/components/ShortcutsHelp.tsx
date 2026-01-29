import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ShortcutItem {
    keys: string[];
    description: string;
}

interface ShortcutCategory {
    title: string;
    shortcuts: ShortcutItem[];
}

interface ShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

// Detect OS
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? 'Cmd' : 'Ctrl';

const shortcuts: ShortcutCategory[] = [
    {
        title: 'Tools',
        shortcuts: [
            { keys: ['V'], description: 'Select tool' },
            { keys: ['D'], description: 'Draw / Pen tool' },
            { keys: ['E'], description: 'Eraser tool' },
            { keys: ['R'], description: 'Rectangle' },
            { keys: ['C'], description: 'Circle' },
            { keys: ['Shift', 'D'], description: 'Diamond' },
            { keys: ['A'], description: 'Arrow' },
            { keys: ['T'], description: 'Text' },
        ],
    },
    {
        title: 'Actions',
        shortcuts: [
            { keys: [modKey, 'Z'], description: 'Undo' },
            { keys: [modKey, 'Shift', 'Z'], description: 'Redo' },
            { keys: [modKey, 'Y'], description: 'Redo (alt)' },
            { keys: [modKey, 'A'], description: 'Select all' },
            { keys: ['Delete'], description: 'Delete selected' },
            { keys: ['Backspace'], description: 'Delete selected' },
            { keys: ['Esc'], description: 'Deselect all' },
        ],
    },
    {
        title: 'Navigation',
        shortcuts: [
            { keys: ['Middle Click'], description: 'Pan canvas' },
            { keys: [modKey, 'Click'], description: 'Pan canvas' },
            { keys: ['Scroll'], description: 'Zoom in/out' },
        ],
    },
    {
        title: 'View',
        shortcuts: [
            { keys: [modKey, "'"], description: 'Toggle grid' },
            { keys: [modKey, 'Shift', 'L'], description: 'Toggle theme' },
            { keys: ['?'], description: 'Show shortcuts' },
        ],
    },
];

export default function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto"
                    >
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        Keyboard Shortcuts
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Master these shortcuts to boost your productivity
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </button>
                            </div>

                            {/* Shortcuts List */}
                            <div className="space-y-8">
                                {shortcuts.map((category, idx) => (
                                    <motion.div
                                        key={category.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                    >
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                            {category.title}
                                        </h3>
                                        <div className="space-y-2">
                                            {category.shortcuts.map((shortcut, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                                >
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                        {shortcut.description}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {shortcut.keys.map((key, keyIdx) => (
                                                            <span key={keyIdx} className="flex items-center gap-1">
                                                                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow-sm">
                                                                    {key}
                                                                </kbd>
                                                                {keyIdx < shortcut.keys.length - 1 && (
                                                                    <span className="text-gray-400 text-xs">+</span>
                                                                )}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
