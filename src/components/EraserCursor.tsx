interface EraserCursorProps {
    x: number;
    y: number;
    isErasing?: boolean;
}

export default function EraserCursor({ x, y, isErasing }: EraserCursorProps) {
    const size = 24;

    return (
        <div
            className="pointer-events-none fixed z-[9999]"
            style={{
                left: x,
                top: y,
                width: size,
                height: size,
                transform: 'translate(-50%, -50%)',
            }}
        >
            {/* Outer ring — pulses when actively erasing */}
            <div
                className="absolute inset-0 rounded-full border-2 transition-all duration-150"
                style={{
                    borderColor: isErasing ? 'rgba(239, 68, 68, 0.8)' : 'rgba(120, 120, 120, 0.6)',
                    transform: isErasing ? 'scale(1.4)' : 'scale(1)',
                    opacity: isErasing ? 0.6 : 1,
                }}
            />
            {/* Inner dot */}
            <div
                className="absolute rounded-full transition-all duration-100"
                style={{
                    width: 6,
                    height: 6,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: isErasing ? 'rgba(239, 68, 68, 0.9)' : 'rgba(120, 120, 120, 0.7)',
                }}
            />
        </div>
    );
}
