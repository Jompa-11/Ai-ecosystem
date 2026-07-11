import { WORLD, RIVERS, PONDS } from './world.js';
import { makeRng } from './rng.js';

// ---- Färgpalett (frodig, tecknad 2D-stil likt referensbilden) ----
const C = {
  grassBase: '#78b24a',
  grassDark: '#5f9438',
  grassLight: '#93c95c',
  dirt: '#c19158',
  dirtDark: '#a5773f',
  stone: '#d2cbb6',
  stoneMid: '#b3aa90',
  stoneDark: '#837a63',
  water: '#4a90d9',
  waterDeep: '#3670b3',
  waterLight: '#6fb0e8',
  foam: '#cfe8fa',
  trunk: '#5b3a22',
  trunkDark: '#3f2716',
  wood: '#7a5230',
  woodDark: '#573820',
  woodLight: '#9c6f42',
};

// Gräsmarken som bas (fyller synligt område).
export function drawGrassBase(ctx, view) {
  const g = ctx.createLinearGradient(0, view.top, 0, view.bottom);
  g.addColorStop(0, C.grassLight);
  g.addColorStop(0.5, C.grassBase);
  g.addColorStop(1, C.grassDark);
  ctx.fillStyle = g;
  ctx.fillRect(view.left, view.top, view.right - view.left, view.bottom - view.top);
}

// Mjuka färgfläckar för att bryta upp den platta gröna ytan.
export function drawGrassPatches(ctx, view) {
  const step = 130;
  const sx = Math.floor(view.left / step) * step;
  const sy = Math.floor(view.top / step) * step;
  ctx.save();
  for (let x = sx; x < view.right; x += step) {
    for (let y = sy; y < view.bottom; y += step) {
      const r = makeRng((((x * 73856093) ^ (y * 19349663)) >>> 0) ^ WORLD.seed);
      const px = x + r() * step;
      const py = y + r() * step;
      const rad = 40 + r() * 70;
      ctx.globalAlpha = 0.1 + r() * 0.1;
      ctx.fillStyle = r() > 0.5 ? C.grassLight : C.grassDark;
      ctx.beginPath();
      ctx.ellipse(px, py, rad, rad * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Synliga grässtrån för finare textur.
export function drawGrassTufts(ctx, details, view) {
  ctx.save();
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (const d of details) {
    if (d.x < view.left || d.x > view.right || d.y < view.top || d.y > view.bottom) continue;
    ctx.strokeStyle = d.shade > 0.5 ? C.grassLight : C.grassDark;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.lean, d.y - d.len);
    ctx.stroke();
  }
  ctx.restore();
}

// ---- Vatten ----
function riverCenterX(river, y) {
  return river.x + river.amp * Math.sin(y / river.wl);
}

export function drawWater(ctx, view) {
  const top = view.top - 40;
  const bottom = view.bottom + 40;

  for (const river of RIVERS) {
    ctx.lineCap = 'round';
    // Djup kant.
    strokeRiver(ctx, river, top, bottom, river.width + 8, C.waterDeep);
    // Vattenyta.
    strokeRiver(ctx, river, top, bottom, river.width, C.water);
    // Ljus reflex på mitten.
    strokeRiver(ctx, river, top, bottom, river.width * 0.4, C.waterLight);
    drawSparkles(ctx, river, top, bottom);
  }

  for (const p of PONDS) {
    if (p.x + p.rx < view.left || p.x - p.rx > view.right) continue;
    if (p.y + p.ry < view.top || p.y - p.ry > view.bottom) continue;
    ctx.fillStyle = C.waterDeep;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx + 6, p.ry + 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.water;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.waterLight;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(p.x - p.rx * 0.2, p.y - p.ry * 0.25, p.rx * 0.55, p.ry * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function strokeRiver(ctx, river, top, bottom, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(riverCenterX(river, top), top);
  for (let y = top; y <= bottom; y += 24) {
    ctx.lineTo(riverCenterX(river, y), y);
  }
  ctx.stroke();
}

function drawSparkles(ctx, river, top, bottom) {
  ctx.fillStyle = C.foam;
  ctx.globalAlpha = 0.6;
  const step = 70;
  const startY = Math.floor(top / step) * step;
  for (let y = startY; y < bottom; y += step) {
    const r = makeRng(((y * 2654435761) >>> 0) ^ ((river.x & 0xffff) >>> 0));
    const cx = riverCenterX(river, y) + (r() - 0.5) * river.width * 0.6;
    const w = 6 + r() * 10;
    ctx.fillRect(cx, y + r() * step, w, 2);
  }
  ctx.globalAlpha = 1;
}

// ---- Vägar ----
export function drawRoads(ctx, roads) {
  const ring = WORLD.ring;

  // Grusbas: ring + utfarter.
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.dirt;
  ctx.lineWidth = ring.roadWidth;
  ctx.beginPath();
  ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
  ctx.stroke();
  for (const r of roads) {
    ctx.lineWidth = r.width;
    ctx.beginPath();
    ctx.moveTo(r.x1, r.y1);
    ctx.lineTo(r.x2, r.y2);
    ctx.stroke();
  }

  // Slitagespår i mitten av vägarna (mörkare grus).
  ctx.strokeStyle = C.dirtDark;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = ring.roadWidth * 0.35;
  ctx.beginPath();
  ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
  ctx.stroke();
  for (const r of roads) {
    ctx.lineWidth = r.width * 0.35;
    ctx.beginPath();
    ctx.moveTo(r.x1, r.y1);
    ctx.lineTo(r.x2, r.y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  drawRoadStones(ctx, roads, ring);
}

// Kullersten längs alla vägkanter.
function drawRoadStones(ctx, roads, ring) {
  const gap = WORLD.stone.step;

  // Ringens inner- och ytterkant.
  const circ = 2 * Math.PI * ring.radius;
  const nOnRing = Math.round(circ / gap);
  for (let i = 0; i < nOnRing; i++) {
    const a = (i / nOnRing) * Math.PI * 2;
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    placeStone(ctx, cx * (ring.radius - ring.roadWidth / 2), cy * (ring.radius - ring.roadWidth / 2), i);
    placeStone(ctx, cx * (ring.radius + ring.roadWidth / 2), cy * (ring.radius + ring.roadWidth / 2), i + 999);
  }

  // Utfartsvägarnas båda sidor.
  for (let ri = 0; ri < roads.length; ri++) {
    const r = roads[ri];
    const len = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
    const ux = (r.x2 - r.x1) / len;
    const uy = (r.y2 - r.y1) / len;
    const nx = -uy;
    const ny = ux;
    const half = r.width / 2;
    const n = Math.floor(len / gap);
    for (let i = 0; i <= n; i++) {
      const px = r.x1 + ux * i * gap;
      const py = r.y1 + uy * i * gap;
      placeStone(ctx, px + nx * half, py + ny * half, ri * 1000 + i);
      placeStone(ctx, px - nx * half, py - ny * half, ri * 2000 + i);
    }
  }
}

function placeStone(ctx, x, y, seed) {
  const r = makeRng((seed >>> 0) ^ 0x51ed);
  const s = WORLD.stone.size * (0.8 + r() * 0.5);
  ctx.fillStyle = C.stoneDark;
  ctx.beginPath();
  ctx.ellipse(x, y + 1, s + 1, s * 0.85 + 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r() > 0.5 ? C.stone : C.stoneMid;
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---- Broar ----
export function drawBridges(ctx, bridges) {
  for (const b of bridges) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate((b.angle * Math.PI) / 180);
    const L = b.span + 70;
    const W = b.width + 6;

    // Plankdäck.
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(-L / 2, -W / 2, L, W);
    ctx.fillStyle = C.wood;
    ctx.fillRect(-L / 2 + 2, -W / 2 + 3, L - 4, W - 6);

    // Tvärgående plankor.
    ctx.strokeStyle = C.woodDark;
    ctx.lineWidth = 1.5;
    for (let x = -L / 2 + 6; x < L / 2; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, -W / 2 + 3);
      ctx.lineTo(x, W / 2 - 3);
      ctx.stroke();
    }
    // Räcken.
    ctx.fillStyle = C.woodLight;
    ctx.fillRect(-L / 2, -W / 2, L, 4);
    ctx.fillRect(-L / 2, W / 2 - 4, L, 4);
    ctx.restore();
  }
}

// ---- Trästolpar ----
export function drawPosts(ctx, posts, view) {
  for (const p of posts) {
    if (p.x < view.left || p.x > view.right || p.y < view.top || p.y > view.bottom) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(p.x + 2, p.y + 4, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(p.x - 4, p.y - 12, 8, 14);
    ctx.fillStyle = C.wood;
    ctx.fillRect(p.x - 4, p.y - 12, 5, 14);
    ctx.fillStyle = C.woodLight;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 12, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- Natur-props ----
export function drawProp(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const s = p.scale;
  switch (p.type) {
    case 'oak': drawOak(ctx, s, p.tone); break;
    case 'pine': drawPine(ctx, s, p.tone); break;
    case 'bush': drawBush(ctx, s, p.tone); break;
    case 'rock': drawRock(ctx, s, p.tone); break;
    case 'flower': drawFlower(ctx, s, p.tone); break;
  }
  ctx.restore();
}

function mix(a, b, t) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}
const OAK_DARK = [47, 90, 32];
const OAK_LIGHT = [120, 190, 74];
const PINE_DARK = [32, 74, 40];
const PINE_LIGHT = [74, 132, 68];

function shadow(ctx, rx, ry, ox = 6, oy = 5) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawOak(ctx, s, tone) {
  shadow(ctx, 18 * s, 8 * s);
  ctx.fillStyle = C.trunk;
  ctx.fillRect(-3.5 * s, -8 * s, 7 * s, 16 * s);
  ctx.fillStyle = C.trunkDark;
  ctx.fillRect(-3.5 * s, -8 * s, 2 * s, 16 * s);

  const clusters = [
    [0, -22, 17], [-13, -15, 13], [13, -15, 13],
    [-7, -30, 12], [8, -30, 12], [0, -14, 14],
  ];
  // Mörk kontur.
  ctx.fillStyle = mix(OAK_DARK, OAK_LIGHT, 0);
  for (const [cx, cy, r] of clusters) circle(ctx, cx * s, cy * s, (r + 2.5) * s);
  // Baston.
  ctx.fillStyle = mix(OAK_DARK, OAK_LIGHT, 0.35 + tone * 0.15);
  for (const [cx, cy, r] of clusters) circle(ctx, cx * s, cy * s, r * s);
  // Ljusdager uppe till vänster.
  ctx.fillStyle = mix(OAK_DARK, OAK_LIGHT, 0.8);
  ctx.globalAlpha = 0.75;
  circle(ctx, -6 * s, -26 * s, 8 * s);
  circle(ctx, -2 * s, -20 * s, 6 * s);
  ctx.globalAlpha = 1;
}

function drawPine(ctx, s, tone) {
  shadow(ctx, 13 * s, 6 * s);
  ctx.fillStyle = C.trunkDark;
  ctx.fillRect(-2.5 * s, -6 * s, 5 * s, 12 * s);

  const tiers = [[0, -8, 17, 12], [0, -22, 13, 11], [0, -35, 9, 10]];
  // Kontur.
  ctx.fillStyle = mix(PINE_DARK, PINE_LIGHT, 0);
  for (const [cx, cy, w, h] of tiers) tri(ctx, cx * s, cy * s, (w + 2) * s, (h + 2) * s);
  // Fyllning.
  ctx.fillStyle = mix(PINE_DARK, PINE_LIGHT, 0.25 + tone * 0.2);
  for (const [cx, cy, w, h] of tiers) tri(ctx, cx * s, cy * s, w * s, h * s);
  // Ljusdager på vänstersidan.
  ctx.fillStyle = mix(PINE_DARK, PINE_LIGHT, 0.6);
  ctx.globalAlpha = 0.5;
  for (const [cx, cy, w, h] of tiers) {
    ctx.beginPath();
    ctx.moveTo(cx * s, (cy - h) * s);
    ctx.lineTo((cx - w) * s, cy * s);
    ctx.lineTo((cx - w * 0.35) * s, cy * s);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBush(ctx, s, tone) {
  shadow(ctx, 14 * s, 6 * s, 3, 4);
  const clusters = [[-8, -4, 10], [8, -4, 10], [0, -10, 11]];
  ctx.fillStyle = mix(OAK_DARK, OAK_LIGHT, 0);
  for (const [cx, cy, r] of clusters) circle(ctx, cx * s, cy * s, (r + 2) * s);
  ctx.fillStyle = mix(OAK_DARK, OAK_LIGHT, 0.4 + tone * 0.15);
  for (const [cx, cy, r] of clusters) circle(ctx, cx * s, cy * s, r * s);
  ctx.fillStyle = mix(OAK_DARK, OAK_LIGHT, 0.8);
  ctx.globalAlpha = 0.6;
  circle(ctx, -4 * s, -10 * s, 5 * s);
  ctx.globalAlpha = 1;
}

function drawRock(ctx, s, tone) {
  shadow(ctx, 16 * s, 7 * s, 3, 5);
  const rocks = [[0, 0, 15, 11], [-11, 3, 9, 7], [11, 4, 8, 6]];
  for (const [cx, cy, w, h] of rocks) {
    ctx.fillStyle = C.stoneDark;
    rockShape(ctx, cx * s, (cy + 2) * s, (w + 1) * s, (h + 1) * s);
    ctx.fillStyle = mix([131, 122, 99], [210, 203, 182], 0.3 + tone * 0.3);
    rockShape(ctx, cx * s, cy * s, w * s, h * s);
    ctx.fillStyle = C.stone;
    ctx.globalAlpha = 0.7;
    rockShape(ctx, (cx - w * 0.2) * s, (cy - h * 0.3) * s, w * 0.5 * s, h * 0.4 * s);
    ctx.globalAlpha = 1;
  }
}

function drawFlower(ctx, s, tone) {
  const petal = tone > 0.5 ? '#f2d24b' : '#f2ede0';
  const spots = [[-6, 0], [5, -3], [0, 4], [8, 3], [-3, -5]];
  for (const [dx, dy] of spots) {
    ctx.fillStyle = '#3f6a2a';
    circle(ctx, dx * s, dy * s + 1.5, 1.6 * s);
    ctx.fillStyle = petal;
    circle(ctx, dx * s, dy * s, 2.2 * s);
    ctx.fillStyle = tone > 0.5 ? '#e9a92e' : '#e6c34a';
    circle(ctx, dx * s, dy * s, 0.9 * s);
  }
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function tri(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx - w, cy);
  ctx.lineTo(cx + w, cy);
  ctx.closePath();
  ctx.fill();
}

function rockShape(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx - w, cy + h * 0.3);
  ctx.lineTo(cx - w * 0.6, cy - h * 0.6);
  ctx.lineTo(cx + w * 0.1, cy - h);
  ctx.lineTo(cx + w * 0.7, cy - h * 0.5);
  ctx.lineTo(cx + w, cy + h * 0.3);
  ctx.lineTo(cx + w * 0.4, cy + h);
  ctx.lineTo(cx - w * 0.5, cy + h);
  ctx.closePath();
  ctx.fill();
}
