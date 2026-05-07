'use client';

/**
 * hooks/useSocket.js
 *
 * Provides a singleton Socket.io client for the entire React app.
 * Features:
 *  - Singleton: only one socket connection per browser tab, shared across components.
 *  - Auto reconnect: Socket.io handles this internally.
 *  - Auto cleanup: listeners are removed when the component unmounts.
 *  - Supports joining user:{userId} and store:{storeId} rooms.
 *  - Deduplication: the same event + handler combo is never registered twice.
 *
 * Usage:
 *   const { on, emit, socket } = useSocket({ userId: user._id });
 *
 *   useEffect(() => {
 *     const off = on('notification', (payload) => { ... });
 *     return off; // cleans up the listener on unmount
 *   }, [on]);
 */

import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// ── Module-level singleton ────────────────────────────────────────────────────
// The socket is shared across all hook instances in the same browser tab.
// The `typeof window` guard prevents this from running during Next.js SSR.
let _socket = null;

function getSocket() {
  // Never run on the server — socket.io-client requires a browser environment
  if (typeof window === 'undefined') return null;

  if (!_socket) {
    _socket = io({
      // Connect to the same origin (server.js serves both Next.js and Socket.io)
      path: '/socket.io',
      // Match server: polling first for stable handshake, upgrade to WebSocket after.
      transports: ['polling', 'websocket'],
      reconnection:        true,
      reconnectionAttempts: Infinity,
      reconnectionDelay:   1000,
      reconnectionDelayMax: 5000,
      // Send cookies so the server can identify the user if needed in future
      withCredentials: true,
      autoConnect: true,
    });

    _socket.on('connect', () => {
      console.log('[Socket] Connected:', _socket.id);
    });

    _socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    _socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });
  }
  return _socket;
}


/**
 * useSocket({ userId, storeId })
 *
 * @param {object} opts
 * @param {string} [opts.userId]  - MongoDB ObjectId string for the logged-in user
 * @param {string} [opts.storeId] - MongoDB ObjectId string for the store (store owners)
 *
 * @returns {{ socket: Socket|null, on: Function, emit: Function }}
 */
export default function useSocket({ userId, storeId } = {}) {
  const socket       = getSocket();          // null on server, Socket on client
  const joinedRef    = useRef(false);
  const listenersRef = useRef([]);

  // ── Join rooms once userId / storeId is known ────────────────────────────
  useEffect(() => {
    if (!socket) return;           // SSR guard
    if (!userId && !storeId) return;

    const doJoin = () => {
      if (joinedRef.current) return;
      socket.emit('join', { userId, storeId });
      joinedRef.current = true;
    };

    if (socket.connected) {
      doJoin();
    } else {
      socket.once('connect', doJoin);
    }

    // Re-join after reconnects (socket.id changes, rooms reset server-side)
    const onReconnect = () => {
      joinedRef.current = false;
      doJoin();
    };
    socket.on('connect', onReconnect);

    return () => {
      socket.off('connect', onReconnect);
    };
  }, [userId, storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup all registered listeners when the component unmounts ─────────
  useEffect(() => {
    return () => {
      if (!socket) return;         // SSR guard
      listenersRef.current.forEach(({ event, handler }) => {
        socket.off(event, handler);
      });
      listenersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * on(event, handler)
   * Registers an event listener and returns an unsubscribe function.
   * Safe no-op when called during SSR (socket === null).
   */
  const on = useCallback((event, handler) => {
    if (!socket) return () => {};  // SSR guard — return empty cleanup

    const existing = listenersRef.current.find(
      (l) => l.event === event && l.handler === handler
    );
    if (!existing) {
      socket.on(event, handler);
      listenersRef.current.push({ event, handler });
    }

    return () => {
      socket.off(event, handler);
      listenersRef.current = listenersRef.current.filter(
        (l) => !(l.event === event && l.handler === handler)
      );
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * emit(event, payload)
   * Safe no-op during SSR.
   */
  const emit = useCallback((event, payload) => {
    if (!socket) return;           // SSR guard
    socket.emit(event, payload);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { socket, on, emit };
}

