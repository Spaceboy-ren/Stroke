// Stroke — Real-time Collaboration WebSocket Server
// Run with: node server/index.js
// Listens on ws://localhost:1999

import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT ?? 1999;
const wss = new WebSocketServer({ port: PORT });

// rooms: Map<roomId, Map<userId, { ws, color, nickname, elements }>>
const rooms = new Map();
const MAX_ROOM_SIZE = 50;

// Assign a unique color to each user
const PEER_COLORS = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#22C55E', // green
    '#F97316', // orange
    '#A855F7', // purple
    '#EC4899', // pink
    '#EAB308', // yellow
    '#06B6D4', // cyan
];

let nextUserId = 1;

function getRoomClients(roomId) {
    if (!rooms.has(roomId)) rooms.set(roomId, new Map());
    return rooms.get(roomId);
}

function broadcast(roomId, senderId, message) {
    const clients = getRoomClients(roomId);
    const data = JSON.stringify(message);
    clients.forEach((client, uid) => {
        if (uid !== senderId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(data);
        }
    });
}

function broadcastPeerCount(roomId) {
    const clients = getRoomClients(roomId);
    const count = clients.size;
    const data = JSON.stringify({ type: 'peer-count', count });
    clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(data);
        }
    });
}

wss.on('connection', (ws) => {
    const userId = `user-${nextUserId++}`;
    let roomId = null;
    const colorIndex = (nextUserId - 2) % PEER_COLORS.length;
    const userColor = PEER_COLORS[colorIndex];

    ws.on('message', (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        } catch {
            return;
        }

        if (msg.type === 'join') {
            roomId = msg.roomId;
            const nick = (msg.nickname ?? '').slice(0, 8) || `Guest${userId.replace('user-', '')}`;
            const clients = getRoomClients(roomId);

            // Enforce room size limit
            if (clients.size >= MAX_ROOM_SIZE) {
                ws.send(JSON.stringify({ type: 'error', code: 'room-full', message: `Room is full (max ${MAX_ROOM_SIZE})` }));
                ws.close();
                return;
            }

            // Assign color based on room-local index for stability
            const roomColorIdx = clients.size % PEER_COLORS.length;
            const assignedColor = PEER_COLORS[roomColorIdx];

            // Find the most recent elements snapshot
            let latestElements = [];
            clients.forEach((c) => {
                if (c.elements && c.elements.length > 0) latestElements = c.elements;
            });

            // Register this client
            clients.set(userId, { ws, color: assignedColor, nickname: nick, elements: [] });

            ws.send(JSON.stringify({
                type: 'welcome',
                userId,
                userColor: assignedColor,
                elements: latestElements,
            }));

            broadcastPeerCount(roomId);
            return;
        }

        if (!roomId) return;
        const clients = getRoomClients(roomId);

        switch (msg.type) {
            case 'add':
                broadcast(roomId, userId, { type: 'add', element: msg.element });
                break;

            case 'update':
                broadcast(roomId, userId, { type: 'update', id: msg.id, updates: msg.updates });
                break;

            case 'delete':
                broadcast(roomId, userId, { type: 'delete', ids: msg.ids });
                break;

            case 'sync-elements':
                // Store a snapshot on this client for new joiners
                if (clients.has(userId)) {
                    clients.get(userId).elements = msg.elements;
                }
                break;

            case 'cursor': {
                const senderNick = clients.get(userId)?.nickname ?? userId;
                broadcast(roomId, userId, {
                    type: 'cursor',
                    userId,
                    userColor,
                    nickname: senderNick,
                    x: msg.x,
                    y: msg.y,
                });
                break;
            }

            case 'update-nickname': {
                const newNick = (msg.nickname ?? '').slice(0, 8);
                if (newNick && clients.has(userId)) {
                    clients.get(userId).nickname = newNick;
                }
                break;
            }

            case 'preview':
                // Relay the live drawing preview to all peers in the room
                broadcast(roomId, userId, { type: 'preview', userId, data: msg.data });
                break;

            case 'preview-clear':
                broadcast(roomId, userId, { type: 'preview-clear', userId });
                break;

            case 'undo':
            case 'redo':
                broadcast(roomId, userId, { type: msg.type });
                break;

            case 'clear':
                broadcast(roomId, userId, { type: 'clear' });
                break;
        }
    });

    ws.on('close', () => {
        if (!roomId) return;
        const clients = getRoomClients(roomId);
        clients.delete(userId);

        // Notify peers this cursor is gone
        broadcast(roomId, userId, { type: 'cursor-leave', userId });
        broadcastPeerCount(roomId);

        // Clean up empty rooms
        if (clients.size === 0) {
            rooms.delete(roomId);
        }
    });

    ws.on('error', (err) => {
        console.error(`[ws] Error for ${userId}:`, err.message);
    });
});

console.log(`\n🎨 Stroke collaboration server running on ws://localhost:${PORT}`);
console.log(`   Share a room URL like: http://localhost:5173/#room-abc123`);
console.log(`   MAX_ROOM_SIZE: ${MAX_ROOM_SIZE}\n`);
