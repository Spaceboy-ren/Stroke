import { useState, useEffect, useRef } from 'react';

interface NicknameDialogProps {
    onConfirm: (nickname: string) => void;
}

export default function NicknameDialog({ onConfirm }: NicknameDialogProps) {
    const [value, setValue] = useState('');
    const [shake, setShake] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Slight delay so the animation feels intentional
        const t = setTimeout(() => inputRef.current?.focus(), 120);
        return () => clearTimeout(t);
    }, []);

    const handleSubmit = () => {
        const trimmed = value.trim().slice(0, 8);
        if (!trimmed) {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            inputRef.current?.focus();
            return;
        }
        localStorage.setItem('stroke-nickname', trimmed);
        onConfirm(trimmed);
    };

    return (
        // Backdrop
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
            {/* Card */}
            <div
                className="relative flex flex-col gap-5 bg-background border border-border rounded-2xl shadow-2xl p-8 w-80"
                style={{
                    animation: 'dialog-enter 0.22s cubic-bezier(0.22,1,0.36,1)',
                }}
            >
                {/* Icon */}
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mx-auto">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                </div>

                {/* Text */}
                <div className="text-center">
                    <h2 className="text-base font-semibold text-foreground">Join the canvas</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Others will see this name next to your cursor
                    </p>
                </div>

                {/* Input */}
                <div
                    className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl bg-background transition-all duration-150 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 ${shake ? 'border-red-400 ring-2 ring-red-200/40' : 'border-border'}`}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        maxLength={8}
                        value={value}
                        onChange={e => setValue(e.target.value.slice(0, 8))}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        placeholder="Your name"
                        className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
                    />
                    <span className="text-xs text-muted-foreground/50 tabular-nums">{value.length}/8</span>
                </div>

                {/* Button */}
                <button
                    onClick={handleSubmit}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-100 cursor-pointer"
                >
                    Join Canvas
                </button>
            </div>

            <style>{`
                @keyframes dialog-enter {
                    from { opacity: 0; transform: scale(0.93) translateY(8px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
