import { motion } from 'framer-motion';
import { Pipette } from 'lucide-react';
import { useRef } from 'react';
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
    const colorInputRef = useRef<HTMLInputElement>(null);

    const handleColorChange = (color: string) => {
        setCurrentColor(color);

        // Apply color to selected elements
        if (selectedIds.size > 0) {
            selectedIds.forEach(id => {
                updateElement(id, { strokeColor: color, fillColor: color });
            });
        }
    };

    const isPresetColor = colors.some(c => c.value.toLowerCase() === currentColor.toLowerCase());

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
              ${currentColor.toLowerCase() === color.value.toLowerCase() ? 'border-primary scale-110 shadow-md' : 'border-border'}
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

            {/* Custom color picker — styled as a swatch button with an eyedropper icon */}
            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => colorInputRef.current?.click()}
                className={`
                    relative w-full h-8 rounded-lg border-2 transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer overflow-hidden
                    ${!isPresetColor ? 'border-primary shadow-md' : 'border-border hover:border-muted-foreground/40'}
                `}
                title="Pick custom color"
            >
                {/* Color fill background */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{ backgroundColor: currentColor }}
                />
                <Pipette size={13} className="relative text-muted-foreground" />
                <span className="relative text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {currentColor}
                </span>
            </motion.button>

            {/* Hidden native color input */}
            <input
                ref={colorInputRef}
                type="color"
                value={currentColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="sr-only"
                tabIndex={-1}
            />
        </motion.div>
    );
}
