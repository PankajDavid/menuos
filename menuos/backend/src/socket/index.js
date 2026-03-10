import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Kitchen staff join their restaurant room
    socket.on('join_kitchen', ({ restaurantId }) => {
      if (socket.user.restaurantId === restaurantId ||
          socket.user.role === 'platform_admin') {
        socket.join(`kitchen:${restaurantId}`);
        socket.emit('joined', { room: `kitchen:${restaurantId}` });
        console.log(`Socket ${socket.id} joined kitchen:${restaurantId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket ${socket.id} disconnected`);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
