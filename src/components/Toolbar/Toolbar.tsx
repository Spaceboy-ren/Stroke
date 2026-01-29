import { motion } from 'framer-motion';
import { useState } from 'react';
import {
    Undo2,
    Redo2,
    Sun,
    Moon,
    Grid3x3,
    Lightbulb,
} from 'lucide-react';
import useStore from '../../store/useStore';
import ShortcutsHelp from '../ShortcutsHelp';

export default function Toolbar() {
    const { theme, gridVisible, toggleTheme, toggleGrid, undo, redo, canUndo, canRedo } = useStore();
    const [showShortcuts, setShowShortcuts] = useState(false);

    return (
        <>
            <motion.header
                initial={{ y: -60 }}
                animate={{ y: 0 }}
                className="fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-6 backdrop-blur-xl bg-background/80 border-b border-border"
            >
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="Stroke" className="w-8 h-8 rounded-md" />
                        <h1 className="text-lg font-semibold">Stroke</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <ToolbarButton
                        icon={<Undo2 size={18} />}
                        onClick={undo}
                        disabled={!canUndo()}
                        tooltip="Undo (Cmd+Z)"
                    />
                    <ToolbarButton
                        icon={<Redo2 size={18} />}
                        onClick={redo}
                        disabled={!canRedo()}
                        tooltip="Redo (Cmd+Shift+Z)"
                    />

                    <div className="w-px h-6 bg-border mx-2" />

                    <ToolbarButton
                        icon={<Grid3x3 size={18} />}
                        onClick={toggleGrid}
                        active={gridVisible}
                        tooltip="Toggle Grid (Cmd+')"
                    />

                    <ToolbarButton
                        icon={theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        onClick={toggleTheme}
                        tooltip="Toggle Theme (Cmd+Shift+L)"
                    />

                    <div className="w-px h-6 bg-border mx-2" />

                    <ToolbarButton
                        icon={<Lightbulb size={18} />}
                        onClick={() => setShowShortcuts(true)}
                        tooltip="Keyboard Shortcuts"
                    />
                </div>
            </motion.header>

            <ShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        </>
    );
}

interface ToolbarButtonProps {
    icon: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    tooltip?: string;
}

function ToolbarButton({ icon, onClick, active, disabled, tooltip }: ToolbarButtonProps) {
    return (
        <motion.button
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            onClick={onClick}
            disabled={disabled}
            className={`
        relative p-2 rounded-lg transition-colors duration-150
        ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
            title={tooltip}
        >
            {icon}
        </motion.button>
    );
}
