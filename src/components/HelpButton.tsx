import { HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface HelpButtonProps {
    onClick: () => void;
}

export default function HelpButton({ onClick }: HelpButtonProps) {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className="fixed bottom-6 right-6 z-30 bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg transition-colors group"
            title="Keyboard Shortcuts (Press ?)"
            aria-label="Show keyboard shortcuts"
        >
            <HelpCircle className="w-6 h-6" />

            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Keyboard Shortcuts <kbd className="ml-1 px-1.5 py-0.5 bg-gray-700 rounded text-xs">?</kbd>
            </div>
        </motion.button>
    );
}
