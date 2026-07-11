// Enkel bildvisare för ekosystem-kartan: zooma och panorera.
// Bilden laddas från assets/ecosystem.png.

const IMAGE_SRC = 'assets/ecosystem.png';

const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');

const img = new Image();
let imageReady = false;
let imageFailed = false;

// Vy: skala + förskjutning (bildens övre vänstra hörn i skärmkoordinater).
const viewState = { scale: 1, x: 0, y: 0, minScale: 1, maxScale: 6 };

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
  // Visningsstorleken styrs av CSS (100vw x höjd under topbaren). Vi läser
  // den och sätter bara upp bakgrundsbufferten skalad efter dpr.
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

// Minsta skala = bilden får plats helt i fönstret (contain).
function computeMinScale() {
  viewState.minScale = Math.min(width / img.width, height / img.height);
  viewState.maxScale = viewState.minScale * 6;
  if (viewState.scale < viewState.minScale) viewState.scale = viewState.minScale;
}

// Centrera och passa in hela bilden.
function fitToScreen() {
  computeMinScale();
  viewState.scale = viewState.minScale;
  viewState.x = (width - img.width * viewState.scale) / 2;
  viewState.y = (height - img.height * viewState.scale) / 2;
  draw();
}

// Håll bilden inom rimliga gränser (ingen tom rymd runt om).
function clamp() {
  const w = img.width * viewState.scale;
  const h = img.height * viewState.scale;
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

function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0d130c';
  ctx.fillRect(0, 0, width, height);

  if (!imageReady) {
    drawMessage(
      imageFailed
        ? 'Lägg din kartbild i  assets/ecosystem.png'
        : 'Laddar karta …'
    );
    return;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    img,
    viewState.x,
    viewState.y,
    img.width * viewState.scale,
    img.height * viewState.scale
  );
}

function drawMessage(text) {
  ctx.fillStyle = '#f4e9d0';
  ctx.font = '20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
}

// Zooma mot en viss skärmpunkt (px, py).
function zoomAt(px, py, factor) {
  const newScale = Math.max(
    viewState.minScale,
    Math.min(viewState.maxScale, viewState.scale * factor)
  );
  const ratio = newScale / viewState.scale;
  // Håll punkten under pekaren stilla.
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
  imageReady = true;
  imageFailed = false;
  fitToScreen();
};
img.onerror = () => {
  imageFailed = true;
  draw();
};
img.src = IMAGE_SRC;

window.addEventListener('resize', resize);
resize();
