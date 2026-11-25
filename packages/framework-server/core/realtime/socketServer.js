const { Server } = require("socket.io");
const AuthService = require("../lib/authService");
const Model = require("../model/model");
const logger = require("../../shared/helpers/logger");
const { validateOrigin } = require("../config/origins");

let io = null;

function socketError(message) {
  const error = new Error(message);
  error.data = { code: "SOCKET_UNAUTHORIZED" };
  return error;
}

async function authenticateSocket(socket, next) {
  try {
    const suppliedToken = socket.handshake.auth?.token
      || socket.handshake.headers?.authorization;
    const token = String(suppliedToken || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return next(socketError("Authentication token is required"));

    const auth = new AuthService();
    const decoded = await auth.verifyToken(token, process.env.ACCESS_TOKEN_SECRET);
    const issuer = await auth.tokenIssuerInit();
    if (!decoded?.sub || decoded?.type !== "access" || decoded.iss !== issuer) {
      return next(socketError("Invalid authentication token"));
    }

    const [credential] = await new Model()
      .select(["token_version"], "admin_credentials")
      .where("admin_custom_id", "=", decoded.sub)
      .execute();
    const [user] = await new Model()
      .select(["custom_id", "status"], "admin")
      .where("custom_id", "=", decoded.sub)
      .execute();

    if (!credential || !user || Number(user.status) !== 1
      || Number(credential.token_version) !== Number(decoded.token_version)) {
      return next(socketError("Session is no longer active"));
    }

    socket.data.user = { id: String(decoded.sub), tokenVersion: decoded.token_version };
    return next();
  } catch (error) {
    return next(socketError("Authentication token could not be verified"));
  }
}

function userRoom(userId) {
  return `user:${String(userId)}`;
}

function initRealtime(httpServer) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: validateOrigin,
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket"],
  });

  io.use(authenticateSocket);
  io.on("connection", (socket) => {
    const userId = socket.data.user.id;
    socket.join(userRoom(userId));
    socket.emit("session:ready", { connectedAt: new Date().toISOString() });

    // Ticket/team rooms are deliberately added by the helpdesk module only
    // after it can prove the user owns or is assigned to the ticket. The
    // foundation must never let an authenticated user self-subscribe to an
    // arbitrary business resource.
  });

  logger.app("Socket.io real-time service initialized", { transports: ["websocket"] });
  return io;
}

function emitToUsers(userIds, event, payload = {}) {
  if (!io) return;
  [...new Set((userIds || []).filter(Boolean).map(String))].forEach((userId) => {
    io.to(userRoom(userId)).emit(event, payload);
  });
}

function emitToAll(event, payload = {}) {
  io?.emit(event, payload);
}

function disconnectUsers(userIds, reason = "session-revoked") {
  if (!io) return;
  [...new Set((userIds || []).filter(Boolean).map(String))].forEach((userId) => {
    io.to(userRoom(userId)).emit("session:revoked", { reason, changedAt: new Date().toISOString() });
    const sockets = io.sockets.adapter.rooms.get(userRoom(userId));
    sockets?.forEach((socketId) => io.sockets.sockets.get(socketId)?.disconnect(true));
  });
}

module.exports = { disconnectUsers, emitToAll, emitToUsers, initRealtime };
