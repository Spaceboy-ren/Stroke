import type { RemoteCursor } from '../hooks/useCollaboration';
import type { Viewport } from '../types';

interface RemoteCursorsProps {
    cursors: Map<string, RemoteCursor>;
    viewport: Viewport;
}

function CursorArrow({ color }: { color: string }) {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
                d="M2 2L16 8.5L9.5 10L7 16.5L2 2Z"
                fill={color}
                stroke="white"
                strokeWidth="1.2"
                strokeLinejoin="round"
            />
        </svg>
    );
}

interface CursorProps {
    cursor: RemoteCursor;
    viewport: Viewport;
}

function RemoteCursorItem({ cursor, viewport }: CursorProps) {
    const { userColor, nickname, x, y } = cursor;
    const screenX = x * viewport.zoom + viewport.x;
    const screenY = y * viewport.zoom + viewport.y;

    return (
        <div
            className="pointer-events-none fixed z-[9999] top-0 left-0"
            style={{
                // GPU-accelerated positioning — no layout recalc
                transform: `translate(${screenX}px, ${screenY}px)`,
                transition: 'transform 50ms linear',
                willChange: 'transform',
            }}
        >
            {/* Arrow sits at origin of the translate */}
            <CursorArrow color={userColor} />

            {/* Label flows naturally below the arrow — no absolute positioning that could clip */}
            <div
                style={{
                    marginTop: 2,
                    marginLeft: 4,
                    backgroundColor: userColor,
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                    lineHeight: 1.4,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    letterSpacing: '0.01em',
                }}
            >
                {nickname || '?'}
            </div>
        </div>
    );
}

export default function RemoteCursors({ cursors, viewport }: RemoteCursorsProps) {
    if (cursors.size === 0) return null;
    return (
        <>
            {Array.from(cursors.values()).map(cursor => (
                <RemoteCursorItem key={cursor.userId} cursor={cursor} viewport={viewport} />
            ))}
        </>
    );
}
