import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (token: string): Socket => {
  if (socket) return socket;

  // Resolve root server address from API base path
  const isLocalWeb = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const defaultApiUrl = isLocalWeb
    ? 'http://localhost:5000/api'
    : 'https://0b0ce1551f0529.lhr.life/api';
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || defaultApiUrl;
  const serverUrl = apiUrl.replace('/api', '');

  socket = io(serverUrl, {
    auth: { token },
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
