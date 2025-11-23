import { io, type Socket } from 'socket.io-client';

const WS_URL =
  import.meta.env.VITE_WS_URL ??
  (() => {
    if (typeof window === 'undefined') return 'ws://localhost:3334';
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.hostname}:3334`;
  })();

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket) return socket;
  socket = io(WS_URL, {
    transports: ['websocket'],
    auth: { token },
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
