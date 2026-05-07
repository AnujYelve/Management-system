'use client';

/**
 * hooks/useSocket.js  — SOCKET.IO TEMPORARILY DISABLED
 *
 * Vercel serverless functions do not support persistent WebSocket servers.
 * All socket calls are replaced with safe no-ops so dashboards continue
 * to work correctly via normal REST API polling.
 *
 * To re-enable: replace this file with the full Socket.io implementation
 * and deploy to a persistent Node.js host (Railway, Render, VPS, etc.).
 */

import { useCallback } from 'react';

export default function useSocket(_opts) {
  // on(event, handler) — no-op, returns a no-op cleanup
  const on = useCallback((_event, _handler) => {
    return () => {}; // cleanup no-op
  }, []);

  // emit(event, payload) — no-op
  const emit = useCallback((_event, _payload) => {}, []);

  return { socket: null, on, emit };
}
