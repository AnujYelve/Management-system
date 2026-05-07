/**
 * server.js
 *
 * Custom HTTP server that boots Next.js and Socket.io on the same port.
 * The Socket.io instance is stored on `global._io` so that any Next.js
 * API route can emit events without importing the server module directly.
 *
 * Usage:
 *   Development : npm run dev   → node server.js (with --inspect for debugging)
 *   Production  : npm start     → node server.js
 */

'use strict';

const { createServer } = require('http');
const { parse }        = require('url');
const next             = require('next');
const { Server }       = require('socket.io');

const dev  = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app    = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // ── 1. Create a plain HTTP server ────────────────────────────────────────
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // ── 2. Attach Socket.io ──────────────────────────────────────────────────
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Start with polling for a reliable handshake, then upgrade to WebSocket.
    // This avoids 'websocket error' noise caused by Next.js HMR also using
    // WebSockets on the same port in development mode.
    transports: ['polling', 'websocket'],
    // Ping every 25 s, disconnect after 60 s of silence
    pingInterval: 25000,
    pingTimeout:  60000,
  });

  // ── 3. Expose io to Next.js API routes via global ───────────────────────
  global._io = io;

  // ── 4. Connection / room logic ───────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    /**
     * Client emits:  join  { userId, storeId? }
     * Server joins socket to:
     *   user:{userId}         — for all user-specific notifications
     *   store:{storeId}       — for live store dashboard updates (optional)
     */
    socket.on('join', ({ userId, storeId } = {}) => {
      // ── User room ────────────────────────────────────────────────────────
      if (userId) {
        const userRoom = `user:${userId}`;

        // Leave any pre-existing user rooms to prevent duplicate listeners
        // when the client reconnects without a full page reload.
        const currentRooms = Array.from(socket.rooms);
        currentRooms.forEach((room) => {
          if (room.startsWith('user:') && room !== userRoom) {
            socket.leave(room);
            console.log(`[Socket] ${socket.id} left stale room ${room}`);
          }
        });

        socket.join(userRoom);
        console.log(`[Socket] ${socket.id} joined ${userRoom}`);
      }

      // ── Store room ───────────────────────────────────────────────────────
      if (storeId) {
        const storeRoom = `store:${storeId}`;

        const currentRooms = Array.from(socket.rooms);
        currentRooms.forEach((room) => {
          if (room.startsWith('store:') && room !== storeRoom) {
            socket.leave(room);
            console.log(`[Socket] ${socket.id} left stale room ${room}`);
          }
        });

        socket.join(storeRoom);
        console.log(`[Socket] ${socket.id} joined ${storeRoom}`);
      }

      // Acknowledge the join so the client knows it is registered
      socket.emit('joined', {
        userId:  userId  || null,
        storeId: storeId || null,
        socketId: socket.id,
      });
    });

    // ── Leave rooms explicitly (called on logout / role-switch) ──────────
    socket.on('leave', ({ userId, storeId } = {}) => {
      if (userId)  socket.leave(`user:${userId}`);
      if (storeId) socket.leave(`store:${storeId}`);
    });

    // ── Disconnect cleanup ────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} — reason: ${reason}`);
      // Socket.io automatically removes the socket from all rooms on disconnect;
      // no manual cleanup needed.
    });

    // ── Error guard ───────────────────────────────────────────────────────
    socket.on('error', (err) => {
      console.error(`[Socket] Error on ${socket.id}:`, err.message);
    });
  });

  // ── 5. Start listening ───────────────────────────────────────────────────
  httpServer.listen(port, () => {
    console.log(
      `[Server] Ready on http://localhost:${port} — mode: ${dev ? 'development' : 'production'}`
    );
  });
});
