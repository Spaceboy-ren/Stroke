import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import {
    Undo2,
    Redo2,
    Sun,
    Moon,
    Grid3x3,
    Lightbulb,
    Share2,
    Check,
    Pencil,
} from 'lucide-react';
import useStore from '../../store/useStore';
import ShortcutsHelp from '../ShortcutsHelp';

interface ToolbarProps {
    isConnected?: boolean;
    nickname?: string;
    onShare?: () => void;
    onNicknameChange?: (name: string) => void;
}

export default function Toolbar({ isConnected = false, nickname = '', onShare, onNicknameChange }: ToolbarProps) {
    const { theme, gridVisible, toggleTheme, toggleGrid, undo, redo, canUndo, canRedo } = useStore();
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [copied, setCopied] = useState(false);

    // Nickname edit popover state
    const [showNickEdit, setShowNickEdit] = useState(false);
    const [nickInput, setNickInput] = useState(nickname);
    const nickContainerRef = useRef<HTMLDivElement>(null);
    const nickInputRef = useRef<HTMLInputElement>(null);

    // Sync input if prop changes
    useEffect(() => { setNickInput(nickname); }, [nickname]);

    // Auto-focus when popover opens
    useEffect(() => {
        if (showNickEdit) {
            setNickInput(nickname);
            setTimeout(() => { nickInputRef.current?.focus(); nickInputRef.current?.select(); }, 30);
        }
    }, [showNickEdit, nickname]);

    // Close on outside click
    useEffect(() => {
        if (!showNickEdit) return;
        const handler = (e: MouseEvent) => {
            if (nickContainerRef.current && !nickContainerRef.current.contains(e.target as Node)) {
                setShowNickEdit(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showNickEdit]);

    const applyNickname = () => {
        const trimmed = nickInput.trim().slice(0, 8);
        if (trimmed) {
            localStorage.setItem('stroke-nickname', trimmed);
            onNicknameChange?.(trimmed);
        }
        setShowNickEdit(false);
    };

    const handleShare = () => {
        onShare?.();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const displayName = nickname || 'Anonymous';

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

                    {/* Nickname badge — clickable to edit, replaces the plain "Live" pill */}
                    <div ref={nickContainerRef} className="relative">
                        <button
                            onClick={() => setShowNickEdit(prev => !prev)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-background/60 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors duration-150 cursor-pointer group"
                            title="Click to change your name"
                        >
                            {/* Live/Offline status indicator */}
                            <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' : 'bg-muted-foreground/40'}`}
                            />
                            <span className={nickname ? 'text-foreground' : 'text-muted-foreground/60 italic'}>
                                {displayName}
                            </span>
                            <Pencil size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                        </button>

                        {/* Edit popover */}
                        {showNickEdit && (
                            <div className="absolute top-full left-0 mt-2 p-3 bg-background/95 backdrop-blur-xl rounded-xl border border-border shadow-xl w-48 z-50">
                                <label className="text-xs text-muted-foreground mb-1.5 block">Your name (max 8 chars)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={nickInputRef}
                                        type="text"
                                        maxLength={8}
                                        value={nickInput}
                                        onChange={e => setNickInput(e.target.value.slice(0, 8))}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') applyNickname();
                                            if (e.key === 'Escape') setShowNickEdit(false);
                                        }}
                                        placeholder="Your name"
                                        className="flex-1 min-w-0 px-2 py-1.5 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary/60 transition-colors"
                                    />
                                    <span className="text-xs text-muted-foreground/50 tabular-nums flex-shrink-0">{nickInput.length}/8</span>
                                </div>
                                <button
                                    onClick={applyNickname}
                                    className="mt-2 w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                                >
                                    Update
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <ToolbarButton icon={<Undo2 size={18} />} onClick={undo} disabled={!canUndo()} tooltip="Undo (Cmd+Z)" />
                    <ToolbarButton icon={<Redo2 size={18} />} onClick={redo} disabled={!canRedo()} tooltip="Redo (Cmd+Shift+Z)" />

                    <div className="w-px h-6 bg-border mx-2" />

                    <ToolbarButton icon={<Grid3x3 size={18} />} onClick={toggleGrid} active={gridVisible} tooltip="Toggle Grid (Cmd+')" />
                    <ToolbarButton
                        icon={theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        onClick={toggleTheme}
                        tooltip="Toggle Theme (Cmd+Shift+L)"
                    />

                    <div className="w-px h-6 bg-border mx-2" />

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleShare}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                        title="Copy invite link"
                    >
                        {copied ? <><Check size={14} /> Copied!</> : <><Share2 size={14} /> Share</>}
                    </motion.button>

                    <div className="w-px h-6 bg-border mx-2" />

                    <ToolbarButton icon={<Lightbulb size={18} />} onClick={() => setShowShortcuts(true)} tooltip="Keyboard Shortcuts" />
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
