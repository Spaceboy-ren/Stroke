import type { Point } from '../types';

export function distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function snapToGrid(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
}

export function snapPointToGrid(point: Point, gridSize: number, enabled: boolean): Point {
    if (!enabled) return point;
    return {
        x: snapToGrid(point.x, gridSize),
        y: snapToGrid(point.y, gridSize),
    };
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos,
    };
}

export function isPointInRect(
    point: Point,
    x: number,
    y: number,
    width: number,
    height: number
): boolean {
    return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}

export function isPointInCircle(point: Point, cx: number, cy: number, radius: number): boolean {
    return distance(point, { x: cx, y: cy }) <= radius;
}

export function getBoundingBox(points: Point[]): {
    x: number;
    y: number;
    width: number;
    height: number;
} {
    if (points.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;

    for (const point of points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

export function simplifyStroke(points: Point[], tolerance: number = 2): Point[] {
    if (points.length <= 2) return points;

    // Douglas-Peucker algorithm
    function perpDistance(point: Point, lineStart: Point, lineEnd: Point): number {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;

        if (dx === 0 && dy === 0) {
            return distance(point, lineStart);
        }

        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);

        if (t < 0) {
            return distance(point, lineStart);
        } else if (t > 1) {
            return distance(point, lineEnd);
        }

        const projection = {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy,
        };

        return distance(point, projection);
    }

    function douglasPeucker(pts: Point[], epsilon: number): Point[] {
        let maxDist = 0;
        let index = 0;
        const end = pts.length - 1;

        for (let i = 1; i < end; i++) {
            const dist = perpDistance(pts[i], pts[0], pts[end]);
            if (dist > maxDist) {
                maxDist = dist;
                index = i;
            }
        }

        if (maxDist > epsilon) {
            const left = douglasPeucker(pts.slice(0, index + 1), epsilon);
            const right = douglasPeucker(pts.slice(index), epsilon);
            return [...left.slice(0, -1), ...right];
        }

        return [pts[0], pts[end]];
    }

    return douglasPeucker(points, tolerance);
}

export function getSmoothPath(points: Point[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 2; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        path += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
    }

    if (points.length > 1) {
        const lastPoint = points[points.length - 1];
        const secondLastPoint = points[points.length - 2];
        path += ` Q ${secondLastPoint.x} ${secondLastPoint.y} ${lastPoint.x} ${lastPoint.y}`;
    }

    return path;
}
