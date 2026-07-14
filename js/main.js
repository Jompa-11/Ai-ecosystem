// Enkel bildvisare för ekosystem-kartan: zooma och panorera.
// Bilden laddas från assets/ecosystem.png.

const IMAGE_SRC = 'assets/ecosystem.webp';

const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');

const img = new Image();
let imageReady = false;
let imageFailed = false;

// Vy: skala + förskjutning (bildens övre vänstra hörn i skärmkoordinater).
// defaultScale = startvyn (fyller skärmen), minScale = helt utzoomad
// (hela kartan syns, oavsett skärmens proportioner).
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
  // Topbaren är en bild med dynamisk höjd (bredd = 100vw). Läs dess höjd och
  // låt kartan börja precis under den.
  const topbar = document.getElementById('topbar');
  if (topbar && topbar.clientHeight) {
    document.documentElement.style.setProperty('--topbar-h', topbar.clientHeight + 'px');
  }
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

// Kartan är nu en bred panorama (vänster vildmark + stad + höger
// vildmark), så minsta zoom är åter "fyll skärmen" (cover) — det finns
// alltid kartinnehåll åt sidorna, aldrig tom yta. Skrolla för att
// utforska hela bredden.
function computeMinScale() {
  const cover = Math.max(width / img.width, height / img.height);
  viewState.defaultScale = cover;
  viewState.minScale = cover;
  // Hög max-zoom så man kan gå nära byggnaderna i den utzoomade stilen.
  viewState.maxScale = cover * 8;
  if (viewState.scale < viewState.minScale) viewState.scale = viewState.minScale;
  if (viewState.scale > viewState.maxScale) viewState.scale = viewState.maxScale;
}

// Centrera och fyll ytan med bilden (startvyn).
function fitToScreen() {
  computeMinScale();
  viewState.scale = viewState.defaultScale;
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

  drawSmoke();
  drawGlows();
  drawLabels();
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

// Förbered varje lampa med egen fas/hastighet så de flämtar oberoende.
const lamps = (window.LAMPS || []).map(([x, y, r, g, b]) => {
  const h1 = hash(x * 1.7 + y * 0.3);
  const h2 = hash(x * 0.11 + y * 2.9);
  return {
    x, y,
    ph: h1 * Math.PI * 2,
    ph2: h2 * Math.PI * 2,
    sp1: 1.6 + h2 * 1.6,
    sp2: 3.8 + h1 * 2.4,
    baseR: 6,
    col: [Math.min(255, r + 30), Math.min(255, g + 42), Math.min(255, b + 12)],
  };
});

let animTime = 0;

function drawGlows() {
  if (!lamps.length || !imageReady) return;
  const s = viewState.scale;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pad = 50;
  for (const L of lamps) {
    const sx = viewState.x + L.x * s;
    const sy = viewState.y + L.y * s;
    if (sx < -pad || sy < -pad || sx > width + pad || sy > height + pad) continue;
    // Organisk flämtning (summa av två sinusvågor).
    let f = 0.70 + 0.20 * Math.sin(animTime * L.sp1 + L.ph)
                 + 0.12 * Math.sin(animTime * L.sp2 + L.ph2);
    if (f < 0.35) f = 0.35; else if (f > 1.15) f = 1.15;
    const rad = L.baseR * s * (0.9 + 0.30 * f);
    if (rad < 0.6) continue;
    const a = 0.36 * f;
    const [cr, cg, cb] = L.col;
    const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad);
    grd.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
    grd.addColorStop(0.45, `rgba(${cr},${cg},${cb},${a * 0.45})`);
    grd.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(sx, sy, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---- Fabriksrök: rökpluymer som stiger ur Factorys skorstenar ----
// OBS: tom just nu — den nya kartbilden är utzoomad och skorstenarna är
// för små för säker placering. Lägg till { x, y } i bildkoordinater när
// rök önskas igen.
const CHIMNEYS = [];

let smokeParticles = [];
const lastSmokeSpawn = CHIMNEYS.map(() => 0);

function spawnSmoke(now) {
  CHIMNEYS.forEach((ch, i) => {
    const interval = 0.8 + hash(i * 7.3 + 1) * 0.6;
    if (now - lastSmokeSpawn[i] > interval) {
      lastSmokeSpawn[i] = now;
      smokeParticles.push({
        x: ch.x + (Math.random() - 0.5) * 3,
        y: ch.y,
        born: now,
        life: 4 + Math.random() * 2.2,
        drift: (Math.random() - 0.5) * 10,
        wobble: Math.random() * Math.PI * 2,
        size0: 2.5 + Math.random() * 1.8,
      });
    }
  });
  if (smokeParticles.length > 120) {
    smokeParticles = smokeParticles.filter((p) => now - p.born < p.life);
  }
}

function drawSmoke() {
  if (!smokeParticles.length) return;
  const s = viewState.scale;
  const riseHeight = 100;
  ctx.save();
  for (const p of smokeParticles) {
    const t = (animTime - p.born) / p.life;
    if (t < 0 || t > 1) continue;
    const ix = p.x + p.drift * t + Math.sin(t * 5 + p.wobble) * 9 * t;
    const iy = p.y - riseHeight * t;
    const sx = viewState.x + ix * s;
    const sy = viewState.y + iy * s;
    const size = (p.size0 + t * 22) * s;
    if (size < 0.5) continue;
    const fadeIn = t < 0.12 ? t / 0.12 : 1;
    const alpha = fadeIn * (1 - t) * 0.30;
    // Färgen är samplad från den rök som redan är målad i bilden
    // (RGB ~88,86,72) så plymerna smälter in i kartans mörka ton.
    const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, size);
    grd.addColorStop(0, `rgba(126,123,108,${alpha})`);
    grd.addColorStop(0.55, `rgba(98,96,82,${alpha * 0.6})`);
    grd.addColorStop(1, 'rgba(80,78,66,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---- Sci-fi namnbubblor över byggnaderna ----
// Positionerna (bildkoordinater i panoraman) är detekterade ur bilden:
// x = byggnadens mitt, yTop = byggnadens högsta punkt.
const LABELS = [
  { name: 'HERMES HQ', x: 3596, yTop: 276 },
  { name: 'RESEARCH CENTER', x: 3352, yTop: 471 },
  { name: 'FACTORY', x: 3800, yTop: 420 },
  { name: 'ANALYTICS CENTER', x: 3401, yTop: 672 },
  { name: 'OFFICE', x: 3896, yTop: 615 },
];

function drawLabels() {
  const s = viewState.scale;
  ctx.save();
  ctx.font = '600 11px "Courier New", monospace';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const L of LABELS) {
    const sx = viewState.x + L.x * s;
    const sy = viewState.y + L.yTop * s;
    if (sx < -180 || sx > width + 180 || sy < -80 || sy > height + 80) continue;

    const tw = ctx.measureText(L.name).width;
    const padX = 12;
    const bh = 22;
    const bw = tw + padX * 2;
    const by = sy - 34; // panelens mittpunkt i y-led
    const pulse = 0.75 + 0.25 * Math.sin(animTime * 2.2 + L.x * 0.01);

    // Pekarlinje ner till byggnadens topp med liten lysande punkt.
    ctx.strokeStyle = `rgba(64,220,255,${0.55 * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, by + bh / 2);
    ctx.lineTo(sx, sy - 3);
    ctx.stroke();
    ctx.fillStyle = `rgba(64,220,255,${0.9 * pulse})`;
    ctx.beginPath();
    ctx.arc(sx, sy - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Panel med klippta hörn (sci-fi-chamfer).
    const x0 = sx - bw / 2;
    const x1 = sx + bw / 2;
    const y0 = by - bh / 2;
    const y1 = by + bh / 2;
    const chf = 6;
    ctx.beginPath();
    ctx.moveTo(x0 + chf, y0);
    ctx.lineTo(x1 - chf, y0);
    ctx.lineTo(x1, y0 + chf);
    ctx.lineTo(x1, y1 - chf);
    ctx.lineTo(x1 - chf, y1);
    ctx.lineTo(x0 + chf, y1);
    ctx.lineTo(x0, y1 - chf);
    ctx.lineTo(x0, y0 + chf);
    ctx.closePath();
    ctx.fillStyle = 'rgba(4,16,24,0.82)';
    ctx.fill();
    // Pulserande neonkant med glow.
    ctx.shadowColor = 'rgba(64,220,255,0.9)';
    ctx.shadowBlur = 8 * pulse;
    ctx.strokeStyle = `rgba(64,220,255,${0.85 * pulse})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Små hörnmarkeringar (targeting brackets) vänster/höger.
    ctx.strokeStyle = `rgba(140,240,255,${0.9 * pulse})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x0 - 4, by - 5); ctx.lineTo(x0 - 4, by + 5);
    ctx.moveTo(x1 + 4, by - 5); ctx.lineTo(x1 + 4, by + 5);
    ctx.stroke();

    // Namntext.
    ctx.fillStyle = 'rgba(215,246,255,0.96)';
    ctx.fillText(L.name, sx, by + 0.5);
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

// Justera om kartytan när topbar-bilden fått sin höjd.
const topbarImg = document.getElementById('topbar');
if (topbarImg) {
  if (topbarImg.complete) resize();
  topbarImg.addEventListener('load', resize);
}

window.addEventListener('resize', resize);
resize();

// Kontinuerlig animationsloop för de levande ljusen och röken.
function frame(now) {
  animTime = now / 1000;
  if (imageReady) spawnSmoke(animTime);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
