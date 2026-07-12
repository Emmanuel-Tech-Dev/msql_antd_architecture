const subscribers = new Map();

function writeEvent(response, event, payload) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function subscribe(userId, request, response) {
  const key = String(userId);
  const userSubscribers = subscribers.get(key) ?? new Set();
  userSubscribers.add(response);
  subscribers.set(key, userSubscribers);

  response.set({
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders();
  writeEvent(response, "connected", { connected: true });

  const cleanup = () => {
    const current = subscribers.get(key);
    current?.delete(response);
    if (!current?.size) subscribers.delete(key);
  };

  request.once("close", cleanup);
  response.once("close", cleanup);
}

function publish(userIds, reason) {
  const uniqueIds = new Set((userIds ?? []).filter(Boolean).map(String));
  const payload = { reason, changedAt: new Date().toISOString() };

  uniqueIds.forEach((userId) => {
    const current = subscribers.get(userId);
    current?.forEach((response) => {
      if (response.destroyed || response.writableEnded) {
        current.delete(response);
        return;
      }
      writeEvent(response, "access-changed", payload);
    });
    if (current && !current.size) subscribers.delete(userId);
  });
}

function broadcast(event, reason) {
  const payload = { reason, changedAt: new Date().toISOString() };
  subscribers.forEach((responses) => {
    responses.forEach((response) => {
      if (!response.destroyed && !response.writableEnded) {
        writeEvent(response, event, payload);
      }
    });
  });
}

// A single heartbeat prevents idle proxies from closing active streams.
const heartbeat = setInterval(() => {
  subscribers.forEach((responses) => {
    responses.forEach((response) => {
      if (!response.destroyed && !response.writableEnded) response.write(": heartbeat\n\n");
    });
  });
}, 25_000);
heartbeat.unref();

module.exports = { broadcast, publish, subscribe };
