const WS = "https://rplace-api.onrender.com"; // ← Renderで作ったAPIのURLに置き換えてください

const socket = io(WS);
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const viewport = { x: 0, y: 0, w: 800, h: 600, z: 0 };

function drawPixel(x, y, r, g, b) {
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(x - viewport.x, y - viewport.y, 1, 1);
}

socket.on("connect", () => console.log("ws connected"));
socket.on("pixels_update", (p) => {
  p.updates.forEach((u) => drawPixel(p.x + u.dx, p.y + u.dy, u.r, u.g, u.b));
});

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(e.clientX - rect.left) + viewport.x;
  const y = Math.floor(e.clientY - rect.top) + viewport.y;
  const color = {
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256),
  };
  socket.emit("draw_pixel", { z: 0, x, y, color });
  drawPixel(x, y, color.r, color.g, color.b);
});
