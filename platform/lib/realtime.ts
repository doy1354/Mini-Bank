import { io, Socket } from 'socket.io-client';
import { getToken } from './token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket() {
  if (socket) return socket;
  const token = getToken();
  socket = io(API_URL, {
    transports: ['websocket'],
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}



