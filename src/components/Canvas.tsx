import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import useStore from '../store/useStore';
import { drawGrid, drawElement, screenToCanvas } from '../utils/canvas';
import { snapPointToGrid, simplifyStroke } from '../utils/geometry';
import type { Point, Element, Shape, Stroke, Arrow, TextElement, PreviewData } from '../types';
import EraserCursor from './EraserCursor';
import ContextMenu from './ContextMenu';

type ResizeHandle = 'TL' | 'TR' | 'BR' | 'BL' | null;

interface CanvasProps {
    sendPreview?: (data: PreviewData | null) => void;
}

export default function Canvas({ sendPreview }: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const lastEraserPos = useRef<Point | null>(null); // Track last eraser position for interpolation
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
    const [startPoint, setStartPoint] = useState<Point | null>(null); // This is also used as 'previous point' for some tools
    const [dragOffset, setDragOffset] = useState<Point | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
    const [clientMousePos, setClientMousePos] = useState<Point>({ x: 0, y: 0 });
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId?: string } | null>(null);
    const [marqueeStart, setMarqueeStart] = useState<Point | null>(null);
    const [marqueeCurrent, setMarqueeCurrent] = useState<Point | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [eraserPath, setEraserPath] = useState<Point[]>([]);
    const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [initialResizeState, setInitialResizeState] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
        textChildren: TextElement[];
    } | null>(null);

    const store = useStore();
    // Destructure specifically to ensure we have values
    const {
        elements = [],
        selectedIds = new Set(),
        viewport = { x: 0, y: 0, zoom: 1 },
        activeTool = 'select',
        gridVisible = true,
        snapToGrid: snapEnabled = false,
        gridSize = 20,
        currentColor = '#000000',
        currentFillColor = 'transparent',
        currentStrokeWidth = 2,
        addElement,
        updateElement,
        setSelectedIds,
        setViewport,
        deleteElements,
        setActiveTool,
        remotePreviews = new Map(),
    } = store;

    // Focus text input when editing starts
    useEffect(() => {
        if (editingTextId && textInputRef.current) {
            textInputRef.current.focus();
            textInputRef.current.select();
        }
    }, [editingTextId]);

    // Render loop
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        if (gridVisible) {
            drawGrid(ctx, viewport, gridSize, canvas.width, canvas.height);
        }

        // Draw elements
        elements.forEach((element) => {
            // Don't draw the text being edited
            if (element.id === editingTextId) return;
            const isSelected = selectedIds.has(element.id);
            try {
                drawElement(ctx, element, viewport, isSelected);
            } catch (e) {
                console.error("Error drawing element:", element, e);
            }
        });

        // Draw marquee selection box
        if (marqueeStart && marqueeCurrent) {
            const minX = Math.min(marqueeStart.x, marqueeCurrent.x);
            const minY = Math.min(marqueeStart.y, marqueeCurrent.y);
            const width = Math.abs(marqueeCurrent.x - marqueeStart.x);
            const height = Math.abs(marqueeCurrent.y - marqueeStart.y);

            ctx.save();
            ctx.strokeStyle = '#5B9FFF';
            ctx.fillStyle = 'rgba(91, 159, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(minX, minY, width, height);
            ctx.fillRect(minX, minY, width, height);
            ctx.restore();
        }

        // Draw eraser path trace with fading gradient tail
        if (eraserPath.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw segments with fading opacity (oldest = transparent, newest = visible)
            const maxTrailLength = 40;
            const startIdx = Math.max(0, eraserPath.length - maxTrailLength);
            const trailPoints = eraserPath.slice(startIdx);

            for (let i = 1; i < trailPoints.length; i++) {
                const progress = i / trailPoints.length;
                const alpha = progress * 0.35;
                const width = 4 + progress * 16;

                ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
                ctx.lineWidth = width;
                ctx.beginPath();
                ctx.moveTo(trailPoints[i - 1].x, trailPoints[i - 1].y);
                ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Draw remote previews (peers drawing in real-time)
        remotePreviews.forEach((preview) => {
            if (!preview.startPoint) return;
            ctx.save();
            ctx.translate(viewport.x, viewport.y);
            ctx.scale(viewport.zoom, viewport.zoom);
            ctx.strokeStyle = preview.userColor;
            ctx.fillStyle = preview.fillColor !== 'transparent' ? preview.fillColor : 'transparent';
            ctx.lineWidth = preview.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.55;
            ctx.setLineDash([5, 4]); // dashed = in-progress indicator

            if (preview.tool === 'draw' && preview.points && preview.points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(preview.points[0].x, preview.points[0].y);
                preview.points.forEach((p: { x: number; y: number }) => ctx.lineTo(p.x, p.y));
                ctx.stroke();
            } else if (preview.endPoint) {
                const sp = preview.startPoint;
                const ep = preview.endPoint;
                const w = Math.abs(ep.x - sp.x);
                const h = Math.abs(ep.y - sp.y);
                const x = Math.min(sp.x, ep.x);
                const y = Math.min(sp.y, ep.y);
                ctx.beginPath();
                switch (preview.tool) {
                    case 'rectangle': ctx.rect(x, y, w, h); break;
                    case 'circle': ctx.arc(x + w/2, y + h/2, Math.min(w,h)/2, 0, Math.PI*2); break;
                    case 'ellipse': ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI*2); break;
                    case 'diamond':
                        ctx.moveTo(x+w/2, y); ctx.lineTo(x+w, y+h/2);
                        ctx.lineTo(x+w/2, y+h); ctx.lineTo(x, y+h/2); ctx.closePath(); break;
                    case 'arrow': ctx.moveTo(sp.x, sp.y); ctx.lineTo(ep.x, ep.y); break;
                }
                if (preview.fillColor !== 'transparent') ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        });

        // Draw preview while drawing
        if (isDrawing && activeTool !== 'select' && activeTool !== 'eraser') {
            drawPreview(ctx);
        }
    }, [elements, selectedIds, viewport, gridVisible, gridSize, isDrawing, activeTool, currentPoints, startPoint, marqueeStart, marqueeCurrent, editingTextId, eraserPath, remotePreviews]);

    // Draw preview for current tool - reusing logic
    const drawPreview = (ctx: CanvasRenderingContext2D) => {
        if (!startPoint) return;
        ctx.save();
        ctx.translate(viewport.x, viewport.y);
        ctx.scale(viewport.zoom, viewport.zoom);
        ctx.strokeStyle = currentColor;
        ctx.fillStyle = currentFillColor;
        ctx.lineWidth = currentStrokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.7;

        if (activeTool === 'draw' && currentPoints.length > 0) {
            ctx.beginPath();
            ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
            currentPoints.forEach((point) => ctx.lineTo(point.x, point.y));
            ctx.stroke();
        } else if (currentPoints.length > 0 && startPoint) {
            const endPoint = currentPoints[currentPoints.length - 1];
            const width = Math.abs(endPoint.x - startPoint.x);
            const height = Math.abs(endPoint.y - startPoint.y);
            const x = Math.min(startPoint.x, endPoint.x);
            const y = Math.min(startPoint.y, endPoint.y);
            ctx.beginPath();
            switch (activeTool) {
                case 'rectangle': ctx.rect(x, y, width, height); break;
                case 'circle': ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, Math.PI * 2); break;
                case 'ellipse': ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2); break;
                case 'diamond':
                    ctx.moveTo(x + width / 2, y); ctx.lineTo(x + width, y + height / 2); ctx.lineTo(x + width / 2, y + height); ctx.lineTo(x, y + height / 2); ctx.closePath(); break;
                case 'arrow': ctx.moveTo(startPoint.x, startPoint.y); ctx.lineTo(endPoint.x, endPoint.y); break;
                case 'text':
                    // Preview for text tool
                    ctx.font = '16px Inter, sans-serif';
                    ctx.fillStyle = currentColor;
                    ctx.fillText('Text', x, y);
                    break;
            }
            if (currentFillColor !== 'transparent' && activeTool !== 'arrow' && activeTool !== 'text') ctx.fill();
            if (activeTool !== 'text') ctx.stroke();
        }
        ctx.restore();
    };

    useEffect(() => {
        render();
    }, [render]);

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = canvasRef.current.getBoundingClientRect().width;
                canvasRef.current.height = canvasRef.current.getBoundingClientRect().height;
                render();
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [render]);

    // Use a smaller threshold for resize handles to avoid accidental activation
    const getResizeHandleAtPoint = useCallback((point: Point): ResizeHandle => {
        if (!selectedIds || selectedIds.size !== 1) return null;
        const id = Array.from(selectedIds)[0];
        const element = elements.find(el => el.id === id);
        if (!element || (element.type !== 'shape' && element.type !== 'text')) return null;

        const zoom = viewport.zoom || 1;
        const threshold = 8 / zoom;

        let handles: Record<string, Point> = {};

        if (element.type === 'shape') {
            const shape = element as Shape;
            handles = {
                TL: { x: shape.x, y: shape.y },
                TR: { x: shape.x + shape.width, y: shape.y },
                BR: { x: shape.x + shape.width, y: shape.y + shape.height },
                BL: { x: shape.x, y: shape.y + shape.height },
            };
        } else if (element.type === 'text') {
            const text = element as TextElement;
            // Calculate text bounds
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const fontFamily = text.fontFamily || 'Inter';
                ctx.font = `${text.fontWeight || 400} ${text.fontSize}px ${fontFamily}, sans-serif`;
                const metrics = ctx.measureText(text.text);
                const textWidth = metrics.width;
                const textHeight = text.fontSize * 1.2;

                handles = {
                    TL: { x: text.x - 6, y: text.y - textHeight / 2 - 4 },
                    TR: { x: text.x + textWidth + 6, y: text.y - textHeight / 2 - 4 },
                    BR: { x: text.x + textWidth + 6, y: text.y + textHeight / 2 + 4 },
                    BL: { x: text.x - 6, y: text.y + textHeight / 2 + 4 },
                };
            }
        }

        for (const [key, pos] of Object.entries(handles)) {
            if (Math.abs(point.x - pos.x) < threshold && Math.abs(point.y - pos.y) < threshold) {
                return key as ResizeHandle;
            }
        }
        return null;
    }, [selectedIds, elements, viewport.zoom]);

    const handlePointerDown = (e: React.PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const canvasPoint = screenToCanvas(screenPoint, viewport);
        const snappedPoint = snapPointToGrid(canvasPoint, gridSize, snapEnabled);

        // Handle Text Input Blur
        if (editingTextId && !textInputRef.current?.contains(e.target as Node)) {
            setEditingTextId(null);
        }

        if (e.button === 2) { // Context menu
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
            return;
        }

        if (e.button === 1 || (e.buttons === 1 && e.ctrlKey)) { // Pan
            setIsPanning(true);
            setLastPanPoint(screenPoint);
            canvas.style.cursor = 'grabbing';
            return;
        }

        // Check for resize handles first
        const handle = getResizeHandleAtPoint(canvasPoint);
        if (handle && activeTool === 'select') {
            const id = Array.from(selectedIds)[0];
            const element = elements.find(el => el.id === id);

            if (element) {
                setIsResizing(true);
                setResizeHandle(handle);
                setStartPoint(canvasPoint);

                if (element.type === 'shape') {
                    const shape = element as Shape;
                    // Find children text
                    const children = elements.filter(el => el.type === 'text' && (el as TextElement).parentId === id) as TextElement[];

                    setInitialResizeState({
                        x: shape.x,
                        y: shape.y,
                        width: shape.width,
                        height: shape.height,
                        textChildren: children
                    });
                } else if (element.type === 'text') {
                    const text = element as TextElement;
                    // Calculate initial text bounds
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const fontFamily = text.fontFamily || 'Inter';
                        ctx.font = `${text.fontWeight || 400} ${text.fontSize}px ${fontFamily}, sans-serif`;
                        const metrics = ctx.measureText(text.text);
                        const textWidth = metrics.width;
                        const textHeight = text.fontSize * 1.2;

                        setInitialResizeState({
                            x: text.x - 6,
                            y: text.y - textHeight / 2 - 4,
                            width: textWidth + 12,
                            height: textHeight + 8,
                            textChildren: []
                        });
                    }
                }
                return;
            }
        }

        if (e.button === 2) { // Context menu
            e.preventDefault();
            const clickedElement = findElementAtPoint(canvasPoint);
            if (clickedElement && !selectedIds.has(clickedElement.id)) {
                setSelectedIds(new Set([clickedElement.id]));
            }
            if (selectedIds.size > 0 || clickedElement) {
                // Store clicked element for Edit Text action
                if (clickedElement?.type === 'text') {
                    setContextMenu({ x: e.clientX, y: e.clientY, elementId: clickedElement.id });
                } else {
                    setContextMenu({ x: e.clientX, y: e.clientY });
                }
            }
            return;
        }

        if (activeTool === 'select') {
            const clickedElement = findElementAtPoint(canvasPoint); // Use raw point for accurate hit detection
            if (clickedElement) {
                if (!selectedIds.has(clickedElement.id)) {
                    if (e.shiftKey) {
                        const newSelection = new Set(selectedIds);
                        newSelection.add(clickedElement.id);
                        setSelectedIds(newSelection);
                    } else {
                        setSelectedIds(new Set([clickedElement.id]));
                    }
                }
                setDragOffset({
                    x: canvasPoint.x - clickedElement.x, // Use raw point for drag offset
                    y: canvasPoint.y - clickedElement.y,
                });
                setStartPoint(canvasPoint); // Store raw point for delta calculation
            } else {
                setMarqueeStart(screenPoint);
                setMarqueeCurrent(screenPoint);
                if (!e.shiftKey) setSelectedIds(new Set());
            }
        } else if (activeTool === 'eraser') {
            const clickedElement = findElementAtPoint(canvasPoint); // Use raw point for smooth erasing
            if (clickedElement) deleteElements([clickedElement.id]);
            lastEraserPos.current = canvasPoint;
            // Store in screen coordinates for path trace
            const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            setEraserPath([screenPoint]);
            setIsDrawing(true);
        } else {
            setIsDrawing(true);
            setStartPoint(snappedPoint);
            setCurrentPoints([snappedPoint]);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setMousePos(screenPoint);
        setClientMousePos({ x: e.clientX, y: e.clientY });

        if (isPanning && lastPanPoint) {
            const dx = screenPoint.x - lastPanPoint.x;
            const dy = screenPoint.y - lastPanPoint.y;
            setViewport({ x: viewport.x + dx, y: viewport.y + dy });
            setLastPanPoint(screenPoint);
            return;
        }

        const canvasPoint = screenToCanvas(screenPoint, viewport);
        const snappedPoint = snapPointToGrid(canvasPoint, gridSize, snapEnabled);

        // Handle Resizing
        if (isResizing && resizeHandle && initialResizeState && selectedIds.size === 1) {
            const id = Array.from(selectedIds)[0];
            const element = elements.find(el => el.id === id);
            const dx = canvasPoint.x - (startPoint?.x || 0);
            const dy = canvasPoint.y - (startPoint?.y || 0);

            if (element?.type === 'shape') {
                let newX = initialResizeState.x;
                let newY = initialResizeState.y;
                let newW = initialResizeState.width;
                let newH = initialResizeState.height;

                if (resizeHandle.includes('L')) { newX += dx; newW -= dx; }
                if (resizeHandle.includes('R')) { newW += dx; }
                if (resizeHandle.includes('T')) { newY += dy; newH -= dy; }
                if (resizeHandle.includes('B')) { newH += dy; }

                if (newW < 10) newW = 10;
                if (newH < 10) newH = 10;

                updateElement(id, { x: newX, y: newY, width: newW, height: newH });

                // Update Children Text
                initialResizeState.textChildren.forEach(child => {
                    const cx = newX + newW / 2;
                    const cy = newY + newH / 2;
                    updateElement(child.id, { x: cx, y: cy });
                });
            } else if (element?.type === 'text') {
                // For text, we'll scale the font size based on the resize
                const text = element as TextElement;

                let newW = initialResizeState.width;
                let newH = initialResizeState.height;

                if (resizeHandle.includes('L')) { newW -= dx; }
                if (resizeHandle.includes('R')) { newW += dx; }
                if (resizeHandle.includes('T')) { newH -= dy; }
                if (resizeHandle.includes('B')) { newH += dy; }

                // Calculate scale factor based on diagonal resize or just width/height
                const scaleW = newW / initialResizeState.width;
                const scaleH = newH / initialResizeState.height;
                const scale = Math.max(0.5, Math.min(scaleW, scaleH, 5)); // Clamp scale

                const newFontSize = Math.max(8, Math.min(text.fontSize * scale, 200));

                updateElement(id, { fontSize: newFontSize });
            }
            return;
        }

        if (marqueeStart && activeTool === 'select') {
            setMarqueeCurrent(screenPoint);
            render();
            return;
        }

        if (activeTool === 'select' && dragOffset && selectedIds.size > 0) {
            // Move Elements using raw canvas point for smooth dragging
            selectedIds.forEach(id => {
                const element = elements.find((el) => el.id === id);
                if (element) {
                    const newX = canvasPoint.x - dragOffset.x; // Use raw point for smooth movement
                    const newY = canvasPoint.y - dragOffset.y;

                    // Calculate movement delta for children
                    const dx = newX - element.x;
                    const dy = newY - element.y;

                    if (selectedIds.size === 1) {
                        updateElement(element.id, { x: newX, y: newY });

                        // Move child text elements
                        if (element.type === 'shape') {
                            const children = elements.filter(el => el.type === 'text' && (el as TextElement).parentId === element.id);
                            children.forEach(child => {
                                updateElement(child.id, { x: child.x + dx, y: child.y + dy });
                            });
                        }
                    }
                }
            });
            return;
        }

        if (activeTool === 'eraser' && isDrawing) {
            // Optimized interpolation for instant deletion
            const startIdx = lastEraserPos.current || canvasPoint;
            const dist = Math.sqrt(Math.pow(canvasPoint.x - startIdx.x, 2) + Math.pow(canvasPoint.y - startIdx.y, 2));
            const steps = Math.ceil(dist / 3); // Smaller steps for better detection

            const elementsToDelete = new Set<string>();

            for (let i = 0; i <= steps; i++) {
                const t = steps > 0 ? i / steps : 1;
                const px = startIdx.x + (canvasPoint.x - startIdx.x) * t;
                const py = startIdx.y + (canvasPoint.y - startIdx.y) * t;
                const element = findElementAtPoint({ x: px, y: py });
                if (element) elementsToDelete.add(element.id);
            }

            // Delete immediately for instant feedback
            if (elementsToDelete.size > 0) {
                deleteElements(Array.from(elementsToDelete));
            }

            // Update path trace with screen coordinates
            setEraserPath(prev => [...prev, screenPoint]);
            lastEraserPos.current = canvasPoint;
            return;
        }

        if (isDrawing && startPoint) {
            if (activeTool === 'draw') {
                setCurrentPoints([...currentPoints, snappedPoint]);
            } else {
                setCurrentPoints([...currentPoints.slice(0, 1), snappedPoint]);
            }
            // Broadcast live preview to peers
            sendPreview?.({
                tool: activeTool,
                strokeColor: currentColor,
                fillColor: currentFillColor,
                strokeWidth: currentStrokeWidth,
                startPoint,
                endPoint: snappedPoint,
                points: activeTool === 'draw' ? [...currentPoints, snappedPoint] : null,
                userColor: currentColor,
            });
            render();
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (isPanning) {
            setIsPanning(false);
            setLastPanPoint(null);
            canvas.style.cursor = 'default';
            return;
        }

        // Handle marquee selection completion
        if (marqueeStart && marqueeCurrent && activeTool === 'select') {
            const minX = Math.min(marqueeStart.x, marqueeCurrent.x);
            const minY = Math.min(marqueeStart.y, marqueeCurrent.y);
            const maxX = Math.max(marqueeStart.x, marqueeCurrent.x);
            const maxY = Math.max(marqueeCurrent.y, marqueeCurrent.y);

            const selectedElements = elements.filter(el => {
                if (el.type === 'shape') {
                    const shape = el as Shape;
                    const screenTopLeft = { x: shape.x * viewport.zoom + viewport.x, y: shape.y * viewport.zoom + viewport.y };
                    const screenBottomRight = { x: (shape.x + shape.width) * viewport.zoom + viewport.x, y: (shape.y + shape.height) * viewport.zoom + viewport.y };

                    // Element must be fully inside marquee
                    return screenTopLeft.x >= minX && screenTopLeft.y >= minY &&
                        screenBottomRight.x <= maxX && screenBottomRight.y <= maxY;
                }
                return false;
            });

            if (e.shiftKey) {
                const newSelection = new Set(selectedIds);
                selectedElements.forEach(el => newSelection.add(el.id));
                setSelectedIds(newSelection);
            } else {
                setSelectedIds(new Set(selectedElements.map(el => el.id)));
            }

            setMarqueeStart(null);
            setMarqueeCurrent(null);
            render();
            return;
        }

        // Reset resize state
        if (isResizing) {
            setIsResizing(false);
            setResizeHandle(null);
            setInitialResizeState(null);
            return;
        }

        if (dragOffset) {
            setDragOffset(null);
            return;
        }

        if (isDrawing && startPoint && currentPoints.length > 0 && activeTool !== 'eraser') {
            // Clear live preview now that we're committing the element
            sendPreview?.(null);
            const endPoint = currentPoints[currentPoints.length - 1];

            switch (activeTool) {
                case 'draw':
                    const simplified = simplifyStroke(currentPoints, 2);
                    if (simplified.length > 1) {
                        const stroke: Stroke = {
                            id: crypto.randomUUID(),
                            type: 'stroke',
                            x: startPoint.x,
                            y: startPoint.y,
                            rotation: 0,
                            strokeColor: currentColor,
                            fillColor: 'transparent',
                            strokeWidth: currentStrokeWidth,
                            points: simplified,
                        };
                        addElement(stroke);
                    }
                    break;

                case 'rectangle':
                case 'circle':
                case 'ellipse':
                case 'diamond': {
                    const width = Math.abs(endPoint.x - startPoint.x);
                    const height = Math.abs(endPoint.y - startPoint.y);
                    if (width > 5 && height > 5) {
                        const shape: Shape = {
                            id: crypto.randomUUID(),
                            type: 'shape',
                            shapeType: activeTool,
                            x: Math.min(startPoint.x, endPoint.x),
                            y: Math.min(startPoint.y, endPoint.y),
                            width,
                            height,
                            rotation: 0,
                            strokeColor: currentColor,
                            fillColor: currentFillColor,
                            strokeWidth: currentStrokeWidth,
                        };
                        addElement(shape);
                    }
                    break;
                }

                case 'arrow': {
                    const arrow: Arrow = {
                        id: crypto.randomUUID(),
                        type: 'arrow',
                        x: startPoint.x,
                        y: startPoint.y,
                        endX: endPoint.x,
                        endY: endPoint.y,
                        rotation: 0,
                        strokeColor: currentColor,
                        fillColor: currentColor,
                        strokeWidth: currentStrokeWidth,
                        endArrowhead: true,
                    };
                    addElement(arrow);
                    break;
                }

                case 'text': {
                    const text: TextElement = {
                        id: crypto.randomUUID(),
                        type: 'text',
                        x: startPoint.x,
                        y: startPoint.y,
                        text: '',  // Start with empty text like Excalidraw
                        fontSize: 16,
                        fontWeight: 400,
                        textAlign: 'left',
                        rotation: 0,
                        strokeColor: currentColor,
                        fillColor: currentColor,
                        strokeWidth: currentStrokeWidth,
                    };
                    addElement(text);
                    setEditingTextId(text.id);
                    // Auto-switch to select tool after creating text
                    setActiveTool('select');
                    break;
                }
            }
        }

        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoints([]);
        setMarqueeStart(null);
        setMarqueeCurrent(null);
        // Clear eraser path immediately when pointer is released
        if (eraserPath.length > 0) {
            setEraserPath([]);
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const canvasPoint = screenToCanvas(screenPoint, viewport);

        const clickedElement = findElementAtPoint(canvasPoint);
        if (clickedElement && clickedElement.type === 'text') {
            setEditingTextId(clickedElement.id);
        }
    };

    const updateTextValue = (id: string, value: string) => {
        updateElement(id, { text: value });
    };

    const finishEditing = () => {
        // Delete text element if it's empty (Excalidraw behavior)
        if (editingTextId) {
            const element = elements.find(el => el.id === editingTextId) as TextElement;
            if (element && element.text.trim() === '') {
                deleteElements([element.id]);
            }
        }
        setEditingTextId(null);
    };

    // Find element at point 
    // Helper function to calculate distance from point to line segment
    const distanceToLineSegment = (point: Point, p1: Point, p2: Point): number => {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lengthSquared = dx * dx + dy * dy;

        if (lengthSquared === 0) {
            // p1 and p2 are the same point
            const pdx = point.x - p1.x;
            const pdy = point.y - p1.y;
            return Math.sqrt(pdx * pdx + pdy * pdy);
        }

        // Calculate projection parameter
        let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]

        // Find closest point on segment
        const closestX = p1.x + t * dx;
        const closestY = p1.y + t * dy;

        // Calculate distance
        const distX = point.x - closestX;
        const distY = point.y - closestY;
        return Math.sqrt(distX * distX + distY * distY);
    };

    const findElementAtPoint = (point: Point): Element | null => {
        // Find top-most element by iterating in reverse
        for (let i = elements.length - 1; i >= 0; i--) {
            const element = elements[i];

            if (element.type === 'shape') {
                const shape = element as Shape;
                if (
                    point.x >= shape.x &&
                    point.x <= shape.x + shape.width &&
                    point.y >= shape.y &&
                    point.y <= shape.y + shape.height
                ) {
                    return element;
                }
            } else if (element.type === 'stroke') {
                const stroke = element as Stroke;
                // Check if point is close to any segment of the stroke path
                const eraserRadius = 12; // Half of eraser size
                for (let i = 0; i < stroke.points.length - 1; i++) {
                    const p1 = stroke.points[i];
                    const p2 = stroke.points[i + 1];

                    // Calculate distance from point to line segment
                    const dist = distanceToLineSegment(point, p1, p2);
                    if (dist < eraserRadius + stroke.strokeWidth / 2) {
                        return element;
                    }
                }
                // Also check each point directly
                for (const p of stroke.points) {
                    const dx = point.x - p.x;
                    const dy = point.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < eraserRadius) {
                        return element;
                    }
                }
            } else if (element.type === 'text') {
                const text = element as TextElement;
                // Measure actual text dimensions using canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.font = `${text.fontWeight || 400} ${text.fontSize}px Inter, sans-serif`;
                    const metrics = ctx.measureText(text.text);
                    const textWidth = metrics.width;
                    const textHeight = text.fontSize * 1.2; // Approximate line height

                    // Text is left-aligned by default, centered vertically
                    if (
                        point.x >= text.x &&
                        point.x <= text.x + textWidth &&
                        point.y >= text.y - textHeight / 2 &&
                        point.y <= text.y + textHeight / 2
                    ) {
                        return element;
                    }
                }
            } else if (element.type === 'arrow') {
                const arrow = element as Arrow;
                const threshold = 10;
                const dx = arrow.endX - arrow.x;
                const dy = arrow.endY - arrow.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                if (length === 0) continue;

                const t = Math.max(0, Math.min(1, ((point.x - arrow.x) * dx + (point.y - arrow.y) * dy) / (length * length)));
                const projX = arrow.x + t * dx;
                const projY = arrow.y + t * dy;
                const dist = Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);

                if (dist < threshold) {
                    return element;
                }
            }
        }

        return null;
    };

    // Handle wheel for zooming
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoom = viewport.zoom;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.3, Math.min(5, zoom * delta));

        // Zoom towards mouse position
        const scale = newZoom / zoom;
        const newX = mouseX - (mouseX - viewport.x) * scale;
        const newY = mouseY - (mouseY - viewport.y) * scale;

        setViewport({
            zoom: newZoom,
            x: newX,
            y: newY,
        });
    };



    // Memoize cursor to prevent flicker and expensive calculation on every render
    const cursorStyle = useMemo(() => {
        if (activeTool === 'eraser') return 'none';

        try {
            const handle = getResizeHandleAtPoint(screenToCanvas(mousePos, viewport));
            if (handle) {
                if (handle === 'TL' || handle === 'BR') return 'nwse-resize';
                if (handle === 'TR' || handle === 'BL') return 'nesw-resize';
                return 'pointer';
            }
        } catch (e) { /* ignore */ }

        if (activeTool === 'select') return 'default';
        return 'crosshair';
    }, [activeTool, mousePos, viewport, getResizeHandleAtPoint]);

    // Input overlay for editing text
    const editingElement = editingTextId ? elements.find(el => el.id === editingTextId) as TextElement : null;

    // Find parent shape if text is locked inside a box
    const parentShape = editingElement?.parentId
        ? elements.find(el => el.id === editingElement.parentId) as Shape | undefined
        : undefined;

    const inputStyle = editingElement ? (() => {
        // Calculate proper width for existing text
        let calculatedWidth = 20;
        if (editingElement.text) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.font = `${editingElement.fontWeight || 400} ${editingElement.fontSize * viewport.zoom}px Inter, sans-serif`;
                const lines = editingElement.text.split('\n');
                const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width), 20);
                calculatedWidth = maxWidth + 16; // Same padding as in onChange
            }
        }

        // For clipped text, constrain to parent shape but still allow proper sizing
        const finalWidth = parentShape
            ? Math.min(calculatedWidth, parentShape.width * viewport.zoom - 20)
            : calculatedWidth;

        return {
            left: (editingElement.x * viewport.zoom + viewport.x) + 'px',
            top: (editingElement.y * viewport.zoom + viewport.y - 12) + 'px',
            fontSize: (editingElement.fontSize * viewport.zoom) + 'px',
            color: editingElement.strokeColor,
            fontFamily: 'Inter, sans-serif',
            width: finalWidth + 'px',
            maxWidth: parentShape ? (parentShape.width * viewport.zoom - 20) + 'px' : undefined,
        };
    })() : {};

    return (
        <>
            <canvas
                ref={canvasRef}
                className="canvas-container w-full h-full touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDoubleClick={handleDoubleClick}
                onWheel={handleWheel}
                onContextMenu={(e) => e.preventDefault()}
                style={{ cursor: cursorStyle }}
            />

            {editingTextId && editingElement && (
                <textarea
                    ref={textInputRef}
                    value={editingElement.text}
                    onChange={(e) => {
                        updateTextValue(editingElement.id, e.target.value);
                        // Auto-resize on input
                        if (textInputRef.current) {
                            textInputRef.current.style.height = 'auto';
                            textInputRef.current.style.height = textInputRef.current.scrollHeight + 'px';

                            // Only auto-width if not in a parent shape
                            if (!parentShape) {
                                textInputRef.current.style.width = 'auto';
                                // Measure content width
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                    ctx.font = `${editingElement.fontWeight || 400} ${editingElement.fontSize * viewport.zoom}px Inter, sans-serif`;
                                    const lines = e.target.value.split('\n');
                                    const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width), 20);
                                    textInputRef.current.style.width = (maxWidth + 16) + 'px'; // More padding to prevent clipping
                                }
                            }
                            // If in parent shape, keep width constrained but update height
                        }
                    }}
                    onBlur={finishEditing}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            finishEditing();
                        }
                        // Allow Enter for new lines (don't finish on Enter)
                    }}
                    className="fixed z-50 bg-transparent border-2 border-dashed border-blue-400/60 outline-none px-1 py-0.5 resize-none overflow-hidden rounded-sm"
                    style={{
                        ...inputStyle,
                        height: 'auto',
                        minWidth: parentShape ? undefined : '20px',
                        minHeight: (editingElement.fontSize * viewport.zoom * 1.2) + 'px',
                        whiteSpace: parentShape ? 'pre-wrap' : 'pre',
                        wordWrap: parentShape ? 'break-word' : 'normal',
                        lineHeight: '1.2',
                    }}
                    autoFocus
                />
            )}

            {/* Eraser cursor */}
            {activeTool === 'eraser' && <EraserCursor x={clientMousePos.x} y={clientMousePos.y} isErasing={isDrawing} />}

            {/* Render context menu if open */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    hasTextElement={contextMenu.elementId ? elements.find(el => el.id === contextMenu.elementId)?.type === 'text' : false}
                    onEditText={contextMenu.elementId ? () => setEditingTextId(contextMenu.elementId!) : undefined}
                />
            )}
        </>
    );
}
