// Ekosystem-vy: en stor, scrollbar värld. Den centrala kartbilden (dina
// byggnader) ligger orörd i mitten; runt den genereras en vildmark (skog,
// berg, dammar, stigar) så det finns gott om plats för framtida agenter.

import { buildWilderness } from './wilderness.js';
import {
  drawWildBase,
  drawWildGrassPatches,
  drawWildGrassTufts,
  drawBorderGlow,
  drawPaths,
  drawPonds,
  drawRock,
  drawTree,
} from './wildrender.js';

const IMAGE_SRC = 'assets/ecosystem.png';

const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');

const img = new Image();
let imageReady = false;
let imageFailed = false;

// world = { w, h, offsetX, offsetY, bitmapW, bitmapH } — hela världens mått
// och var den ursprungliga kartbilden är placerad inuti den.
let world = null;
let wild = null;
let lamps = [];

// Vy: skala + förskjutning (världens övre vänstra hörn i skärmkoordinater).
const viewState = { scale: 1, x: 0, y: 0, minScale: 1, maxScale: 6, defaultScale: 1 };

let width = 0;
let height = 0;
let dpr = 1;

// Pekarposition relativt canvasens övre vänstra hörn (canvasen kan ligga
// under topbaren).
function localPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const topbar = document.getElementById('topbar');
  if (topbar && topbar.clientHeight) {
    document.documentElement.style.setProperty('--topbar-h', topbar.clientHeight + 'px');
  }
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  if (imageReady) {
    computeMinScale();
    clamp();
  }
  draw();
}

// minScale = hela världen får plats (kan zoomas ut helt). defaultScale =
// samma vy som tidigare (kartbilden fyller skärmen), används vid start och
// vid "återställ vy".
function computeMinScale() {
  const bitmapCover = Math.max(width / world.bitmapW, height / world.bitmapH);
  viewState.minScale = Math.min(width / world.w, height / world.h);
  viewState.defaultScale = bitmapCover;
  viewState.maxScale = bitmapCover * 4;
  if (viewState.scale < viewState.minScale) viewState.scale = viewState.minScale;
  if (viewState.scale > viewState.maxScale) viewState.scale = viewState.maxScale;
}

// Centrera på kartbilden i standard-zoom (samma startvy som tidigare).
function fitToScreen() {
  computeMinScale();
  viewState.scale = viewState.defaultScale;
  const bx = world.offsetX + world.bitmapW / 2;
  const by = world.offsetY + world.bitmapH / 2;
  viewState.x = width / 2 - bx * viewState.scale;
  viewState.y = height / 2 - by * viewState.scale;
  clamp();
  draw();
}

// Håll världen inom rimliga gränser (ingen tom rymd runt om).
function clamp() {
  const w = world.w * viewState.scale;
  const h = world.h * viewState.scale;
  if (w <= width) {
    viewState.x = (width - w) / 2;
  } else {
    viewState.x = Math.min(0, Math.max(width - w, viewState.x));
  }
  if (h <= height) {
    viewState.y = (height - h) / 2;
  } else {
    viewState.y = Math.min(0, Math.max(height - h, viewState.y));
  }
}

function inView(x, y, view) {
  return x >= view.left && x <= view.right && y >= view.top && y <= view.bottom;
}

function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0e1809';
  ctx.fillRect(0, 0, width, height);

  if (!imageReady) {
    drawMessage(
      imageFailed
        ? 'Lägg din kartbild i  assets/ecosystem.png'
        : 'Laddar karta …'
    );
    return;
  }

  const scale = viewState.scale;
  const pad = 100;
  const view = {
    left: -viewState.x / scale - pad,
    top: -viewState.y / scale - pad,
    right: (width - viewState.x) / scale + pad,
    bottom: (height - viewState.y) / scale + pad,
  };

  // Alla efterföljande ritningar sker i världskoordinater tack vare denna
  // transform (skala + panorering hanteras automatiskt av canvas).
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * viewState.x, dpr * viewState.y);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1) Vildmarkens botten, textur, gloria runt kartbilden, dammar och stigar.
  drawWildBase(ctx, view, world);
  drawWildGrassPatches(ctx, view);
  drawWildGrassTufts(ctx, view);
  drawBorderGlow(ctx, world);
  drawPonds(ctx, wild.ponds);
  drawPaths(ctx, wild.paths);

  // 2) Stenblock och skog (kringgår den centrala kartbilden helt).
  for (const r of wild.rocks) {
    if (inView(r.x, r.y, view)) drawRock(ctx, r);
  }
  for (const t of wild.trees) {
    if (inView(t.x, t.y, view)) drawTree(ctx, t);
  }

  // 3) Den ursprungliga kartbilden, orörd, ovanpå allt.
  ctx.drawImage(img, world.offsetX, world.offsetY, world.bitmapW, world.bitmapH);

  // 4) Levande ljus (både i bilden och i vildmarken).
  drawGlows(view, scale);
}

function drawMessage(text) {
  ctx.fillStyle = '#f4e9d0';
  ctx.font = '20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
}

// ---- Levande ljus: animerad glöd på befintliga lampor/facklor ----
function hash(n) {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}

// Slår ihop lamporna från kartbilden (offsatta till världskoordinater) med
// facklorna från vildmarken till en gemensam lista, var och en med egen
// fas/hastighet så de flämtar oberoende.
function buildLamps() {
  const raw = window.LAMPS || [];
  const bitmapLamps = raw.map(([x, y, r, g, b]) => [x + world.offsetX, y + world.offsetY, r, g, b]);
  const combined = bitmapLamps.concat(wild.torches);
  lamps = combined.map(([x, y, r, g, b]) => {
    const h1 = hash(x * 1.7 + y * 0.3);
    const h2 = hash(x * 0.11 + y * 2.9);
    return {
      x, y,
      ph: h1 * Math.PI * 2,
      ph2: h2 * Math.PI * 2,
      sp1: 1.6 + h2 * 1.6,
      sp2: 3.8 + h1 * 2.4,
      baseR: 11,
      col: [Math.min(255, r + 30), Math.min(255, g + 42), Math.min(255, b + 12)],
    };
  });
}

let animTime = 0;

function drawGlows(view, scale) {
  if (!lamps.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const L of lamps) {
    if (!inView(L.x, L.y, view)) continue;
    let f = 0.70 + 0.20 * Math.sin(animTime * L.sp1 + L.ph)
                 + 0.12 * Math.sin(animTime * L.sp2 + L.ph2);
    if (f < 0.35) f = 0.35; else if (f > 1.15) f = 1.15;
    const rad = L.baseR * (0.9 + 0.30 * f);
    if (rad * scale < 0.6) continue;
    const a = 0.36 * f;
    const [cr, cg, cb] = L.col;
    const grd = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, rad);
    grd.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
    grd.addColorStop(0.45, `rgba(${cr},${cg},${cb},${a * 0.45})`);
    grd.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(L.x, L.y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Zooma mot en viss skärmpunkt (px, py).
function zoomAt(px, py, factor) {
  const newScale = Math.max(
    viewState.minScale,
    Math.min(viewState.maxScale, viewState.scale * factor)
  );
  const ratio = newScale / viewState.scale;
  viewState.x = px - (px - viewState.x) * ratio;
  viewState.y = py - (py - viewState.y) * ratio;
  viewState.scale = newScale;
  clamp();
  draw();
}

// ---- Musinteraktion ----
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
  viewState.x += e.clientX - lastX;
  viewState.y += e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  clamp();
  draw();
});

function endDrag(e) {
  dragging = false;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  const pt = localPoint(e);
  zoomAt(pt.x, pt.y, factor);
}, { passive: false });

// ---- Pekskärm: nyp för att zooma ----
const activePointers = new Map();
let pinchDist = 0;

canvas.addEventListener('pointerdown', (e) => {
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
canvas.addEventListener('pointermove', (e) => {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (activePointers.size === 2) {
    dragging = false;
    const [a, b] = [...activePointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const rect = canvas.getBoundingClientRect();
    const midX = (a.x + b.x) / 2 - rect.left;
    const midY = (a.y + b.y) / 2 - rect.top;
    if (pinchDist > 0) zoomAt(midX, midY, dist / pinchDist);
    pinchDist = dist;
  }
});
function dropPointer(e) {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) pinchDist = 0;
}
canvas.addEventListener('pointerup', dropPointer);
canvas.addEventListener('pointercancel', dropPointer);

// ---- Knappar ----
document.getElementById('zoomIn').addEventListener('click', () =>
  zoomAt(width / 2, height / 2, 1.3)
);
document.getElementById('zoomOut').addEventListener('click', () =>
  zoomAt(width / 2, height / 2, 1 / 1.3)
);
document.getElementById('reset').addEventListener('click', fitToScreen);

// Dubbelklick för att zooma in.
canvas.addEventListener('dblclick', (e) => {
  const pt = localPoint(e);
  zoomAt(pt.x, pt.y, 1.6);
});

// ---- Ladda bild ----
img.onload = () => {
  const built = buildWilderness(img.naturalWidth, img.naturalHeight);
  world = built.world;
  wild = built;
  buildLamps();
  imageReady = true;
  imageFailed = false;
  fitToScreen();
};
img.onerror = () => {
  imageFailed = true;
  draw();
};
img.src = IMAGE_SRC;

// Justera om kartytan när topbar-bilden fått sin höjd.
const topbarImg = document.getElementById('topbar');
if (topbarImg) {
  if (topbarImg.complete) resize();
  topbarImg.addEventListener('load', resize);
}

window.addEventListener('resize', resize);
resize();

// Kontinuerlig animationsloop för de levande ljusen.
function frame(now) {
  animTime = now / 1000;
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
