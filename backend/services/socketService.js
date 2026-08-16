const { WebSocketServer, WebSocket } = require('ws');

let wss = null;

/**
 * Attach a WebSocket server to the existing HTTP server.
 * Clients connect to ws://localhost:5000/ws
 */
const initWebSocket = (httpServer) => {
    wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    wss.on('connection', (ws, req) => {
        console.log('🔌 WebSocket client connected');

        // Keep-alive ping every 30s
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        ws.on('close', () => {
            console.log('🔌 WebSocket client disconnected');
        });
        ws.on('error', (err) => {
            console.error('WebSocket error:', err.message);
        });
    });

    // Ping all clients every 30s to detect stale connections
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => clearInterval(interval));

    console.log('🔌 WebSocket server ready on /ws');
};

/**
 * Broadcast a JSON event to ALL connected clients.
 * @param {string} type  - event name, e.g. 'new_email'
 * @param {object} data  - payload
 */
const broadcast = (type, data = {}) => {
    if (!wss) return;
    const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};

module.exports = { initWebSocket, broadcast };
