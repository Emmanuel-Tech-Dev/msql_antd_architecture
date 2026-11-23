import { io } from "socket.io-client";

let socket;
let pendingDisconnect;

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
  if (pendingDisconnect) {
    clearTimeout(pendingDisconnect);
    pendingDisconnect = undefined;
  }
  const client = getSocket();
  client.auth = { token };
  if (!client.connected) client.connect();
  return client;
}

export function disconnectSocket() {
  if (pendingDisconnect) clearTimeout(pendingDisconnect);
  // React Strict Mode intentionally mounts, cleans up, and mounts effects
  // again in development. Deferring cleanup by one task lets the second mount
  // cancel this disconnect instead of aborting an in-flight WebSocket.
  pendingDisconnect = setTimeout(() => {
    socket?.disconnect();
    pendingDisconnect = undefined;
  }, 0);
}
