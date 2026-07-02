import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
    const socketRef = useRef(null);

    useEffect(() => {
        // Connect to the WebSocket server running on port 3001.
        // In dev, we proxy `/socket.io` from Vite (5173) -> socket server (3001),
        // so the client can simply connect to the current host (no IP hardcoding).
        // Optionally override with VITE_SOCKET_URL (e.g. http://192.168.0.x:3001).
        const envUrl = import.meta?.env?.VITE_SOCKET_URL;

        socketRef.current = envUrl ? io(envUrl, {
            reconnectionAttempts: 5,
            transports: ['polling', 'websocket'] // Prefer polling; upgrade if possible
        }) : io({
            reconnectionAttempts: 5,
            transports: ['polling', 'websocket']
        });

        socketRef.current.on('connect', () => {
            console.log('Connected to WebSocket server:', socketRef.current.id, 'via', socketRef.current.io.engine.transport.name);
        });

        socketRef.current.on('connect_error', (err) => {
            console.error('WebSocket Connection Error:', err.message);
        });

        socketRef.current.io.on('upgrade', (transport) => {
            console.log('Socket transport upgraded to:', transport.name);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Helper to send control commands easily
    const emitControl = (type, data) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('control', { type, ...data });
        }
    };

    // Helper to stream spectrum bands (32 bands recommended)
    const emitSpectrum = (bands) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('spectrum', { bands });
        }
    };

    return { socketRef, emitControl, emitSpectrum };
}
