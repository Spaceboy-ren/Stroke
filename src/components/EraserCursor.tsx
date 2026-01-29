interface EraserCursorProps {
    x: number;
    y: number;
}

export default function EraserCursor({ x, y }: EraserCursorProps) {
    const size = 20;

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
            <div
                className="w-full h-full rounded-full border-2 border-gray-500"
                style={{
                    backgroundColor: 'transparent',
                }}
            />
        </div>
    );
}
