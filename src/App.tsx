import { useState, useRef, useEffect, useCallback } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar/Toolbar';
import ToolPalette from './components/Toolbar/ToolPalette';
import ColorPalette from './components/Toolbar/ColorPalette';
import ShortcutsHelp from './components/ShortcutsHelp';
import RemoteCursors from './components/RemoteCursors';
import NicknameDialog from './components/NicknameDialog';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useCollaboration from './hooks/useCollaboration';
import useStore from './store/useStore';
import './index.css';

export default function App() {
    const { showShortcuts, setShowShortcuts } = useKeyboardShortcuts();
    const viewport = useStore((state) => state.viewport);
    const setViewport = useStore((state) => state.setViewport);
    const zoomPercent = Math.round(viewport.zoom * 100);
    const [showInput, setShowInput] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Nickname — read from localStorage on mount, show dialog if not set
    const [nickname, setNickname] = useState<string>(() =>
        localStorage.getItem('stroke-nickname') ?? ''
    );

    // Real-time collaboration — starts once nickname is known
    const { isConnected, userColor, remoteCursors, shareUrl, sendPreview } = useCollaboration(nickname);

    const handleNicknameChange = (newName: string) => {
        setNickname(newName);
    };

    // Close input when clicking outside
    useEffect(() => {
        if (!showInput) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowInput(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showInput]);

    // Auto-focus and select input on open
    useEffect(() => {
        if (showInput && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [showInput]);

    const handleZoomChange = useCallback((newZoom: number) => {
        const clamped = Math.max(0.3, Math.min(5, newZoom));
        const currentZoom = viewport.zoom;
        if (clamped === currentZoom) return;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const scale = clamped / currentZoom;
        const newX = centerX - (centerX - viewport.x) * scale;
        const newY = centerY - (centerY - viewport.y) * scale;

        setViewport({ zoom: clamped, x: newX, y: newY });
    }, [viewport, setViewport]);

    const applyInputValue = () => {
        const parsed = parseInt(inputValue, 10);
        if (!isNaN(parsed) && parsed > 0) handleZoomChange(parsed / 100);
        setShowInput(false);
    };

    const openInput = () => {
        setInputValue(String(zoomPercent));
        setShowInput(true);
    };

    return (
        <div className="w-screen h-screen overflow-hidden bg-background">
            {/* Nickname dialog — shown only when no nickname is stored */}
            {!nickname && (
                <NicknameDialog onConfirm={(name) => setNickname(name)} />
            )}

            <Toolbar
                isConnected={isConnected}
                userColor={userColor}
                nickname={nickname}
                onShare={shareUrl}
                onNicknameChange={handleNicknameChange}
            />
            <ToolPalette />
            <ColorPalette />

            <main className="w-full h-full pt-14">
                <Canvas sendPreview={sendPreview} />
            </main>

            {/* Remote collaborator cursors */}
            <RemoteCursors cursors={remoteCursors} viewport={viewport} />

            {/* Zoom level indicator + input */}
            <div ref={containerRef} className="fixed bottom-6 left-6 z-40 select-none">
                {showInput && (
                    <div className="absolute bottom-full left-0 mb-2 p-3 bg-background/90 backdrop-blur-xl rounded-xl border border-border shadow-xl w-44">
                        <label className="text-xs text-muted-foreground mb-1.5 block">Zoom (30–500%)</label>
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="number"
                                min="30"
                                max="500"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') applyInputValue();
                                    if (e.key === 'Escape') setShowInput(false);
                                }}
                                className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary/60 transition-colors"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                        </div>
                    </div>
                )}

                <button
                    onClick={openInput}
                    className="px-3 py-1.5 bg-background/80 backdrop-blur-xl rounded-lg border border-border shadow-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors duration-150 cursor-pointer"
                >
                    {zoomPercent}%
                </button>
            </div>

            <ShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        </div>
    );
}
