import { useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';

/**
 * Hook that connects to the backend WebSocket and calls the provided
 * handler whenever a matching event type arrives.
 *
 * @param {string|string[]} eventTypes  - event type(s) to listen for
 * @param {function} onEvent            - callback(data, type)
 */
const useSocket = (eventTypes, onEvent) => {
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);
    const mountedRef = useRef(true);
    const handlerRef = useRef(onEvent);

    // Always use latest handler without re-creating socket
    useEffect(() => { handlerRef.current = onEvent; }, [onEvent]);

    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];

    const connect = useCallback(() => {
        if (!mountedRef.current) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('🔌 WebSocket connected');
            // Clear any pending reconnect
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
                reconnectTimer.current = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (types.includes(msg.type)) {
                    handlerRef.current(msg.data, msg.type);
                }
            } catch (e) {
                // ignore malformed messages
            }
        };

        ws.onclose = () => {
            console.log('🔌 WebSocket disconnected — reconnecting in 3s...');
            if (mountedRef.current) {
                reconnectTimer.current = setTimeout(connect, 3000);
            }
        };

        ws.onerror = () => ws.close(); // triggers onclose → reconnect
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        mountedRef.current = true;
        connect();

        return () => {
            mountedRef.current = false;
            clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useSocket;
