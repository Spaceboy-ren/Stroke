import { motion } from 'framer-motion';
import {
    MousePointer2,
    Pencil,
    Square,
    Circle,
    Diamond,
    ArrowRight,
    Type,
    Eraser,
} from 'lucide-react';
import useStore from '../../store/useStore';
import type { ToolType } from '../../types';

const tools = [
    { type: 'select' as ToolType, icon: MousePointer2, label: 'Select', shortcut: 'V' },
    { type: 'draw' as ToolType, icon: Pencil, label: 'Draw', shortcut: 'D' },
    { type: 'eraser' as ToolType, icon: Eraser, label: 'Eraser', shortcut: 'E' },
    { type: 'rectangle' as ToolType, icon: Square, label: 'Rectangle', shortcut: 'R' },
    { type: 'circle' as ToolType, icon: Circle, label: 'Circle', shortcut: 'C' },
    { type: 'diamond' as ToolType, icon: Diamond, label: 'Diamond', shortcut: 'Shift+D' },
    { type: 'arrow' as ToolType, icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
    { type: 'text' as ToolType, icon: Type, label: 'Text', shortcut: 'T' },
];

export default function ToolPalette() {
    const { activeTool, setActiveTool } = useStore();

    return (
        <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="fixed left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 p-2 bg-background/80 backdrop-blur-xl rounded-xl border border-border shadow-lg"
        >
            {tools.map((tool, index) => (
                <motion.button
                    key={tool.type}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05, duration: 0.2 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTool(tool.type)}
                    className={`
            relative group p-3 rounded-lg transition-all duration-150
            ${activeTool === tool.type
                            ? 'bg-primary text-primary-foreground shadow-md scale-105'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }
          `}
                    title={`${tool.label} (${tool.shortcut})`}
                >
                    <tool.icon size={20} strokeWidth={activeTool === tool.type ? 2.5 : 2} />

                    {/* Tooltip */}
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-foreground text-background text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap">
                        {tool.label}
                        <span className="ml-2 text-xs opacity-70">{tool.shortcut}</span>
                    </div>
                </motion.button>
            ))}
        </motion.div>
    );
}
