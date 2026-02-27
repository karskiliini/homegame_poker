import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

export function createPlayerSocket(): Socket {
  return io(`${SERVER_URL}/player`, { autoConnect: false });
}

export function createTableSocket(): Socket {
  return io(`${SERVER_URL}/table`, { autoConnect: false });
}
