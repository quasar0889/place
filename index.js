const Fastify = require("fastify");
const cors = require("@fastify/cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const Redis = require("ioredis");

const server = Fastify({ logger: true });
server.register(cors, { origin: true });

const httpServer = createServer(server.server);
const io = new Server(httpServer, {
  cors: { origin: "*" },
  transports: ["websocket"],
});

const redis = new Redis(process.env.REDIS_URL);
const FREEDOM = (process.env.FREEDOM_MODE || "true") === "true";
const MAX_MSG_PER_SEC = Number(process.env.MAX_SOCKET_MSG_PER_SECOND || 200);

function tileKey(z, x, y) {
  return `tile:${z}:${x}:${y}`;
}

// タイル取得
server.get("/tiles/:z/:tx/:ty", async (req, reply) => {
  const { z, tx, ty } = req.params;
  const key = tileKey(z, tx, ty);
  const buf = await redis.getBuffer(key);
  if (!buf) return reply.code(404).send("");
  reply.header("Content-Type", "application/octet-stream");
  return reply.send(buf);
});

// WebSocket
io.on("connection", (socket) => {
  socket.sentInWindow = 0;
  socket.windowTimer = setInterval(() => (socket.sentInWindow = 0), 1000);

  socket.on("draw_pixel", async (raw) => {
    if (!raw || !Number.isInteger(raw.z) || !Number.isInteger(raw.x) || !Number.isInteger(raw.y)) return;
    const c = raw.color || {};
    if (![c.r, c.g, c.b].every((v) => Number.isInteger(v) && v >= 0 && v <= 255)) return;

    socket.sentInWindow++;
    if (socket.sentInWindow > MAX_MSG_PER_SEC) {
      socket.emit("tiles_refresh", { ts: Date.now() });
      return;
    }

    const tx = Math.floor(raw.x / 256),
      ty = Math.floor(raw.y / 256);
    const key = tileKey(raw.z, tx, ty);
    let buf = await redis.getBuffer(key);
    if (!buf) buf = Buffer.alloc(256 * 256 * 3);

    const localX = raw.x % 256,
      localY = raw.y % 256;
    const off = (localY * 256 + localX) * 3;
    buf.writeUInt8(c.r, off);
    buf.writeUInt8(c.g, off + 1);
    buf.writeUInt8(c.b, off + 2);

    await redis.set(key, buf);

    io.emit("pixels_update", {
      z: raw.z,
      x: raw.x,
      y: raw.y,
      updates: [{ dx: 0, dy: 0, r: c.r, g: c.g, b: c.b }],
      ts: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    clearInterval(socket.windowTimer);
  });
});

const port = process.env.PORT || 10000;
httpServer.listen(port, "0.0.0.0", () => console.log("API listening on", port));
