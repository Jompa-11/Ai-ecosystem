import { buildRoads, buildTrees, buildGrassDetail } from './world.js';
import {
  drawGrassBase,
  drawGrassPatches,
  drawGrassTufts,
  drawRoads,
  drawPlaza,
  drawTree,
} from './render.js';

const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');

// ---- Världsdata (genereras en gång) ----
const roads = buildRoads();
const trees = buildTrees(roads);
const grassDetail = buildGrassDetail();

// ---- Kamera ----
const camera = {
  x: 0,        // världspunkt i mitten av skärmen
  y: 0,
  zoom: 0.85,
  minZoom: 0.25,
  maxZoom: 2.5,
};

let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  needsDraw = true;
}
window.addEventListener('resize', resize);

// ---- Interaktion: panorera ----
let dragging = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  camera.x -= dx / camera.zoom;
  camera.y -= dy / camera.zoom;
  needsDraw = true;
});

canvas.addEventListener('pointerup', (e) => {
  dragging = false;
  canvas.releasePointerCapture(e.pointerId);
});

// ---- Interaktion: zooma mot muspekaren ----
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  const newZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.zoom * factor));

  // Håll punkten under muspekaren stilla.
  const wx = camera.x + (e.clientX - width / 2) / camera.zoom;
  const wy = camera.y + (e.clientY - height / 2) / camera.zoom;
  camera.zoom = newZoom;
  camera.x = wx - (e.clientX - width / 2) / camera.zoom;
  camera.y = wy - (e.clientY - height / 2) / camera.zoom;
  needsDraw = true;
}, { passive: false });

// ---- Synligt världsområde (för culling) ----
function computeView() {
  const halfW = width / 2 / camera.zoom;
  const halfH = height / 2 / camera.zoom;
  const pad = 60;
  return {
    left: camera.x - halfW - pad,
    right: camera.x + halfW + pad,
    top: camera.y - halfH - pad,
    bottom: camera.y + halfH + pad,
  };
}

// ---- Rendering ----
let needsDraw = true;

function draw() {
  const view = computeView();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // Kameratransform: mitten av skärmen = (camera.x, camera.y).
  ctx.translate(width / 2, height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  drawGrassBase(ctx, view);
  drawGrassPatches(ctx, view);
  drawGrassTufts(ctx, grassDetail, view);
  drawRoads(ctx, roads, view);
  drawPlaza(ctx);

  for (const t of trees) {
    if (t.x < view.left || t.x > view.right || t.y < view.top || t.y > view.bottom) {
      continue;
    }
    drawTree(ctx, t);
  }
}

function loop() {
  if (needsDraw) {
    draw();
    needsDraw = false;
  }
  requestAnimationFrame(loop);
}

resize();
loop();
