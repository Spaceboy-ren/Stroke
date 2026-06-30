import { useEffect, useRef, useCallback, useState } from 'react';
import useStore from '../store/useStore';
import type { Element, Viewport, PreviewData } from '../types';

// Use env var in production (set VITE_WS_URL in Vercel/Netlify)
// Falls back to localhost for local dev
const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:1999';
const CURSOR_THROTTLE_MS = 33;   // ~30fps cursor
const PREVIEW_THROTTLE_MS = 33;  // ~30fps live preview

export interface RemoteCursor {
    userId: string;
    userColor: string;
    nickname: string;
    x: number;
    y: number;
}

export interface CollabState {
    roomId: string;
    userId: string;
    userColor: string;
    remoteCursors: Map<string, RemoteCursor>;
    isConnected: boolean;
    shareUrl: () => void;
    sendPreview: (data: PreviewData | null) => void;
}

function getOrCreateRoomId(): string {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash.startsWith('room-')) return hash;
    const newId = `room-${Math.random().toString(36).slice(2, 9)}`;
    window.location.hash = newId;
    return newId;
}

export default function useCollaboration(nickname: string): CollabState {
    const wsRef = useRef<WebSocket | null>(null);
    const mountedRef = useRef(false);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastCursorSend = useRef<number>(0);
    const lastPreviewSend = useRef<number>(0);
    const roomId = useRef<string>(getOrCreateRoomId());
    const nicknameRef = useRef(nickname);

    const [userId, setUserId] = useState('');
    const [userColor, setUserColor] = useState('#3B82F6');
    const userColorRef = useRef('#3B82F6');
    const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const applyingRemote = useRef(false);

    // ── Apply incoming server messages ─────────────────────────────────────
    const applyMessage = useCallback((msg: any) => {
        applyingRemote.current = true;
        try {
            switch (msg.type) {
                case 'welcome': {
                    setUserId(msg.userId);
                    setUserColor(msg.userColor);
                    userColorRef.current = msg.userColor;
                    if (msg.elements && msg.elements.length > 0) {
                        useStore.setState({
                            elements: msg.elements,
                            history: { past: [], future: [] },
                        });
                    }
                    break;
                }
                case 'add': {
                    const existing = useStore.getState().elements.find(e => e.id === msg.element.id);
                    if (!existing) {
                        useStore.setState(state => ({
                            elements: [...state.elements, msg.element],
                        }));
                    }
                    break;
                }
                case 'update': {
                    useStore.setState(state => ({
                        elements: state.elements.map(el =>
                            el.id === msg.id ? ({ ...el, ...msg.updates } as Element) : el
                        ),
                    }));
                    break;
                }
                case 'delete': {
                    const ids = new Set<string>(msg.ids);
                    useStore.setState(state => ({
                        elements: state.elements.filter(el => !ids.has(el.id)),
                        selectedIds: new Set<string>(),
                    }));
                    break;
                }
                case 'cursor': {
                    setRemoteCursors(prev => {
                        const next = new Map(prev);
                        next.set(msg.userId, {
                            userId: msg.userId,
                            userColor: msg.userColor,
                            nickname: msg.nickname,
                            x: msg.x,
                            y: msg.y,
                        });
                        return next;
                    });
                    break;
                }
                case 'cursor-leave': {
                    setRemoteCursors(prev => {
                        const next = new Map(prev);
                        next.delete(msg.userId);
                        return next;
                    });
                    // Also clear their preview
                    useStore.setState(state => {
                        const next = new Map(state.remotePreviews);
                        next.delete(msg.userId);
                        return { remotePreviews: next };
                    });
                    break;
                }
                case 'preview': {
                    useStore.setState(state => {
                        const next = new Map(state.remotePreviews);
                        next.set(msg.userId, msg.data as PreviewData);
                        return { remotePreviews: next };
                    });
                    break;
                }
                case 'preview-clear': {
                    useStore.setState(state => {
                        const next = new Map(state.remotePreviews);
                        next.delete(msg.userId);
                        return { remotePreviews: next };
                    });
                    break;
                }
                case 'undo': {
                    useStore.getState().undo();
                    break;
                }
                case 'redo': {
                    useStore.getState().redo();
                    break;
                }
            }
        } finally {
            applyingRemote.current = false;
        }
    }, []);

    // ── Nickname update effect ─────────────────────────────────────────────
    useEffect(() => {
        if (!nickname || nickname === nicknameRef.current) return;
        nicknameRef.current = nickname;
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'update-nickname', nickname }));
        }
    }, [nickname]);

    // ── WebSocket connection ───────────────────────────────────────────────
    useEffect(() => {
        if (!nickname) return;
        if (mountedRef.current) return;
        mountedRef.current = true;

        function connect() {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                ws.send(JSON.stringify({ type: 'join', roomId: roomId.current, nickname: nicknameRef.current }));
            };
            ws.onmessage = (ev) => {
                try { applyMessage(JSON.parse(ev.data)); } catch { }
            };
            ws.onclose = () => {
                setIsConnected(false);
                reconnectTimerRef.current = setTimeout(connect, 2000);
            };
            ws.onerror = () => ws.close();
        }

        connect();
        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            wsRef.current?.close();
            mountedRef.current = false;
        };
    }, [nickname, applyMessage]);

    // ── Broadcast store element mutations ─────────────────────────────────
    useEffect(() => {
        if (!nickname) return;
        let prevElements: Element[] = useStore.getState().elements;

        const unsub = useStore.subscribe((state) => {
            if (applyingRemote.current) return;
            const ws = wsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) return;

            const currElements = state.elements;
            const prevIds = new Set(prevElements.map(e => e.id));
            const currIds = new Set(currElements.map(e => e.id));

            currElements.forEach(el => {
                if (!prevIds.has(el.id)) ws.send(JSON.stringify({ type: 'add', element: el }));
            });
            prevElements.forEach(el => {
                if (!currIds.has(el.id)) ws.send(JSON.stringify({ type: 'delete', ids: [el.id] }));
            });
            currElements.forEach(el => {
                if (prevIds.has(el.id)) {
                    const prev = prevElements.find(p => p.id === el.id);
                    if (prev && JSON.stringify(prev) !== JSON.stringify(el)) {
                        ws.send(JSON.stringify({ type: 'update', id: el.id, updates: el }));
                    }
                }
            });

            ws.send(JSON.stringify({ type: 'sync-elements', elements: currElements }));
            prevElements = currElements;
        });

        return unsub;
    }, [nickname]);

    // ── Throttled cursor broadcast ─────────────────────────────────────────
    const sendCursor = useCallback((x: number, y: number) => {
        const now = performance.now();
        if (now - lastCursorSend.current < CURSOR_THROTTLE_MS) return;
        lastCursorSend.current = now;
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: 'cursor', x, y }));
    }, []);

    useEffect(() => {
        if (!nickname) return;
        const handleMouseMove = (e: MouseEvent) => {
            const vp: Viewport = useStore.getState().viewport;
            sendCursor((e.clientX - vp.x) / vp.zoom, (e.clientY - vp.y) / vp.zoom);
        };
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [nickname, sendCursor]);

    // ── Throttled live preview broadcast ──────────────────────────────────
    const sendPreview = useCallback((data: PreviewData | null) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        if (data === null) {
            ws.send(JSON.stringify({ type: 'preview-clear' }));
            return;
        }

        const now = performance.now();
        if (now - lastPreviewSend.current < PREVIEW_THROTTLE_MS) return;
        lastPreviewSend.current = now;
        ws.send(JSON.stringify({ type: 'preview', data: { ...data, userColor: userColorRef.current } }));
    }, []);

    // ── Share URL ──────────────────────────────────────────────────────────
    const shareUrl = useCallback(() => {
        const url = `${window.location.origin}${window.location.pathname}#${roomId.current}`;
        navigator.clipboard.writeText(url).catch(() => { prompt('Copy this URL:', url); });
    }, []);

    return { roomId: roomId.current, userId, userColor, remoteCursors, isConnected, shareUrl, sendPreview };
}
