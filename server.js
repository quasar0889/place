// server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// 例: 100x100 のキャンバス (白で初期化)
const WIDTH = 100;
const HEIGHT = 100;
const canvas = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill("#ffffff"));

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // 初期キャンバスを送信
  socket.emit("init", { canvas, width: WIDTH, height: HEIGHT });

  // ピクセル更新
  socket.on("placePixel", ({ x, y, color }) => {
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
      canvas[y][x] = color;
      io.emit("pixelUpdate", { x, y, color });
    }
  });
});

httpServer.listen(3000, () => {
  console.log("Server running on port 3000");
});
