import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Derive the Socket.io server URL from the API URL env var
// e.g. "https://pharmaos-app.onrender.com/api" → "https://pharmaos-app.onrender.com"
const apiUrl = import.meta.env.VITE_API_URL || '';
const socketUrl = apiUrl.replace(/\/api\/?$/, '') || undefined; // undefined = same origin (local dev)

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(socketUrl as string, {
      path: '/socket.io',
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const connectSocket = (room: string) => {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit('join_room', { room });
};

export const disconnectSocket = (room?: string) => {
  const s = getSocket();
  if (room) s.emit('leave_room', { room });
  else s.disconnect();
};
