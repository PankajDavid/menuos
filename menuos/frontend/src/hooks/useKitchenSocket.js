import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore.js';

export function useKitchenSocket(restaurantId, onNewOrder, onOrderUpdated) {
  const socketRef = useRef(null);
  const accessToken = useAuthStore(s => s.accessToken);

  useEffect(() => {
    if (!restaurantId || !accessToken) return;

    socketRef.current = io('/', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      socket.emit('join_kitchen', { restaurantId });
    });

    socket.on('new_order', (order) => {
      onNewOrder?.(order);
      // Play notification sound
      try { new Audio('/notification.mp3').play(); } catch {}
    });

    socket.on('order_updated', (update) => {
      onOrderUpdated?.(update);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    return () => { socket.disconnect(); };
  }, [restaurantId, accessToken]);

  return socketRef;
}
