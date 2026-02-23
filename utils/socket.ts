import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    // Connect through Vite proxy → avoids cross-origin issues
    socket = io({
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
