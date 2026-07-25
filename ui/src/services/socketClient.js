import { io } from "socket.io-client";

let socket;

function socketUrl() {
  return String(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, "");
}

export function getSocket() {
  if (!socket) {
    socket = io(socketUrl(), {
      autoConnect: false,
      transports: ["websocket"],
      withCredentials: true,
    });
  }
  return socket;
}

export function connectSocket(token) {
  const client = getSocket();
  client.auth = { token };
  if (!client.connected) client.connect();
  return client;
}

export function disconnectSocket() {
  socket?.disconnect();
}
