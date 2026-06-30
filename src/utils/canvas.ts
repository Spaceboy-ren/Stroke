import type { Element, Shape, Stroke, TextElement, Arrow, Point, Viewport } from '../types';
import { getSmoothPath } from './geometry';

export function screenToCanvas(point: Point, viewport: Viewport): Point {
    return {
        x: (point.x - viewport.x) / viewport.zoom,
        y: (point.y - viewport.y) / viewport.zoom,
    };
}

export function canvasToScreen(point: Point, viewport: Viewport): Point {
    return {
        x: point.x * viewport.zoom + viewport.x,
        y: point.y * viewport.zoom + viewport.y,
    };
}

export function drawGrid(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    gridSize: number,
    width: number,
    height: number
) {
    const zoom = viewport.zoom;

    // Adaptive grid: at low zoom, double the spacing to keep dot count manageable
    let effectiveGridSize = gridSize;
    while (effectiveGridSize * zoom < 20) {
        effectiveGridSize *= 2;
    }
    const scaledGridSize = effectiveGridSize * zoom;

    // Fade dots at extreme zoom levels
    let opacity = 1;
    if (zoom < 0.5) {
        opacity = zoom / 0.5;
    } else if (zoom > 2) {
        opacity = Math.max(0, 3 - zoom);
    }
    if (opacity <= 0) return;

    ctx.save();

    // Get the visible canvas area
    const startX = Math.floor(-viewport.x / scaledGridSize) * scaledGridSize;
    const startY = Math.floor(-viewport.y / scaledGridSize) * scaledGridSize;
    const endX = startX + width + scaledGridSize;
    const endY = startY + height + scaledGridSize;

    // Draw grid dots instead of lines for a cleaner look
    const gridColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--grid-dot')
        .trim();

    ctx.fillStyle = `hsl(${gridColor} / ${opacity})`;

    for (let x = startX; x < endX; x += scaledGridSize) {
        for (let y = startY; y < endY; y += scaledGridSize) {
            ctx.beginPath();
            ctx.arc(x + viewport.x, y + viewport.y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

export function drawElement(
    ctx: CanvasRenderingContext2D,
    element: Element,
    viewport: Viewport,
    isSelected: boolean = false
) {
    ctx.save();

    // Apply viewport transform
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Apply element rotation
    if (element.rotation !== 0) {
        const centerX = element.x + (element.type === 'shape' ? (element as Shape).width / 2 : 0);
        const centerY = element.y + (element.type === 'shape' ? (element as Shape).height / 2 : 0);
        ctx.translate(centerX, centerY);
        ctx.rotate((element.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
    }

    ctx.strokeStyle = element.strokeColor;
    ctx.fillStyle = element.fillColor;
    ctx.lineWidth = element.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (element.type) {
        case 'shape':
            drawShape(ctx, element as Shape);
            break;
        case 'stroke':
            drawStroke(ctx, element as Stroke);
            break;
        case 'text':
            drawText(ctx, element as TextElement);
            break;
        case 'arrow':
            drawArrow(ctx, element as Arrow);
            break;
    }

    // Draw selection highlight
    if (isSelected) {
        drawSelectionHighlight(ctx, element, viewport.zoom);
    }

    ctx.restore();
}

function drawSelectionHighlight(ctx: CanvasRenderingContext2D, element: Element, zoom: number) {
    ctx.save();

    ctx.strokeStyle = '#5B9FFF';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([4, 4]);

    let bounds = { x: 0, y: 0, width: 0, height: 0 };

    if (element.type === 'shape') {
        const shape = element as Shape;
        bounds = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
    } else if (element.type === 'arrow') {
        const arrow = element as Arrow;
        const minX = Math.min(arrow.x, arrow.endX);
        const minY = Math.min(arrow.y, arrow.endY);
        const maxX = Math.max(arrow.x, arrow.endX);
        const maxY = Math.max(arrow.y, arrow.endY);
        bounds = { x: minX - 5, y: minY - 5, width: maxX - minX + 10, height: maxY - minY + 10 };
    } else if (element.type === 'text') {
        const text = element as TextElement;
        // Measure actual text dimensions
        ctx.save();
        ctx.font = `${text.fontWeight || 400} ${text.fontSize}px Inter, sans-serif`;
        const metrics = ctx.measureText(text.text);
        const textWidth = metrics.width;
        const textHeight = text.fontSize * 1.2;
        ctx.restore();

        // Text is left-aligned by default, centered vertically
        // Add generous padding for better visual
        bounds = {
            x: text.x - 6,
            y: text.y - textHeight / 2 - 4,
            width: textWidth + 12,
            height: textHeight + 8
        };
    }

    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Draw resize handles for shapes and text
    if (element.type === 'shape' || element.type === 'text') {
        ctx.setLineDash([]);
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#5B9FFF';
        ctx.lineWidth = 2 / zoom;

        const handleSize = 8 / zoom;
        const half = handleSize / 2;

        const handles = [
            { x: bounds.x - half, y: bounds.y - half }, // TL
            { x: bounds.x + bounds.width - half, y: bounds.y - half }, // TR
            { x: bounds.x + bounds.width - half, y: bounds.y + bounds.height - half }, // BR
            { x: bounds.x - half, y: bounds.y + bounds.height - half }, // BL
        ];

        handles.forEach(h => {
            ctx.fillRect(h.x, h.y, handleSize, handleSize);
            ctx.strokeRect(h.x, h.y, handleSize, handleSize);
        });
    }

    ctx.restore();
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
    ctx.beginPath();

    switch (shape.shapeType) {
        case 'rectangle':
            ctx.rect(shape.x, shape.y, shape.width, shape.height);
            break;
        case 'circle': {
            const radius = Math.min(shape.width, shape.height) / 2;
            const cx = shape.x + shape.width / 2;
            const cy = shape.y + shape.height / 2;
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            break;
        }
        case 'ellipse': {
            const cx = shape.x + shape.width / 2;
            const cy = shape.y + shape.height / 2;
            ctx.ellipse(cx, cy, shape.width / 2, shape.height / 2, 0, 0, Math.PI * 2);
            break;
        }
        case 'diamond': {
            const cx = shape.x + shape.width / 2;
            const cy = shape.y + shape.height / 2;
            ctx.moveTo(cx, shape.y);
            ctx.lineTo(shape.x + shape.width, cy);
            ctx.lineTo(cx, shape.y + shape.height);
            ctx.lineTo(shape.x, cy);
            ctx.closePath();
            break;
        }
    }

    if (shape.fillColor !== 'transparent') {
        ctx.fill();
    }
    ctx.stroke();
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length === 0) return;

    ctx.beginPath();
    const path = new Path2D(getSmoothPath(stroke.points));
    ctx.stroke(path);
}

function drawText(ctx: CanvasRenderingContext2D, textElement: TextElement) {
    const fontFamily = textElement.fontFamily || 'Inter';
    ctx.font = `${textElement.fontWeight} ${textElement.fontSize}px ${fontFamily}, sans-serif`;
    ctx.textAlign = textElement.textAlign;
    ctx.textBaseline = 'middle';

    // If clipped to shape, center the text
    if (textElement.clippedToShape) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
    }

    if (textElement.fillColor !== 'transparent') {
        ctx.fillText(textElement.text, textElement.x, textElement.y);
    }

    // Draw text outline if stroke is visible
    if (textElement.strokeColor !== 'transparent' && textElement.strokeWidth > 0) {
        ctx.strokeText(textElement.text, textElement.x, textElement.y);
    }
}

function drawArrow(ctx: CanvasRenderingContext2D, arrow: Arrow) {
    ctx.beginPath();
    ctx.moveTo(arrow.x, arrow.y);
    ctx.lineTo(arrow.endX, arrow.endY);
    ctx.stroke();

    // Draw arrowheads
    if (arrow.endArrowhead) {
        drawArrowhead(ctx, arrow.endX, arrow.endY, Math.atan2(arrow.endY - arrow.y, arrow.endX - arrow.x));
    }

    if (arrow.startArrowhead) {
        drawArrowhead(ctx, arrow.x, arrow.y, Math.atan2(arrow.y - arrow.endY, arrow.x - arrow.endX));
    }
}

function drawArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
    const headLength = 12;
    const headWidth = 8;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-headLength, -headWidth / 2);
    ctx.lineTo(-headLength, headWidth / 2);
    ctx.closePath();

    ctx.fill();

    ctx.restore();
}
