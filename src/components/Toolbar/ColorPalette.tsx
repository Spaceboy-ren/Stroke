import { motion } from 'framer-motion';
import useStore from '../../store/useStore';

const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Yellow', value: '#EAB308' },
    { name: 'Green', value: '#22C55E' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#A855F7' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Gray', value: '#6B7280' },
];

export default function ColorPalette() {
    const { currentColor, setCurrentColor, theme, selectedIds, updateElement } = useStore();

    const handleColorChange = (color: string) => {
        setCurrentColor(color);

        // Apply color to selected elements
        if (selectedIds.size > 0) {
            selectedIds.forEach(id => {
                updateElement(id, { strokeColor: color, fillColor: color });
            });
        }
    };

    return (
        <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="fixed right-6 bottom-6 z-40 flex flex-col gap-2 p-2 bg-background/80 backdrop-blur-xl rounded-xl border border-border shadow-lg"
        >
            <div className="text-xs font-medium text-muted-foreground px-1 mb-1">Colors</div>
            <div className="grid grid-cols-2 gap-2">
                {colors.map((color) => (
                    <motion.button
                        key={color.value}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleColorChange(color.value)}
                        className={`
              w-8 h-8 rounded-lg border-2 transition-all duration-150
              ${currentColor === color.value ? 'border-primary scale-110 shadow-md' : 'border-border'}
            `}
                        style={{
                            backgroundColor: color.value,
                            // Add border for white color visibility
                            ...(color.value === '#FFFFFF' && theme === 'light' ? { borderColor: '#e5e7eb' } : {})
                        }}
                        title={color.name}
                    />
                ))}
            </div>

            <div className="w-full h-px bg-border my-1" />

            <div className="text-xs text-muted-foreground px-1">
                <div className="flex items-center justify-between mb-1">
                    <span>Custom</span>
                </div>
                <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-full h-8 rounded-lg border border-border cursor-pointer bg-transparent"
                />
            </div>
        </motion.div>
    );
}
