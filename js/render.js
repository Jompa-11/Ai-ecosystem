import { WORLD } from './world.js';
import { makeRng } from './rng.js';

// ---- Färgpalett (medeltida, dämpad) ----
const COLORS = {
  grassBase: '#5c8a3a',
  grassDark: '#4a7530',
  grassLight: '#6fa049',
  gravel: '#b08d5e',      // brunt grus
  gravelDark: '#8a6a42',  // vägkant
  gravelSpeck: '#c9a878',
  gravelSpeckDark: '#7a5c38',
  plaza: '#a9a29a',       // stenlagd platå
  plazaDark: '#8b847c',
  trunk: '#5b3a22',
};

// Ritar hela gräsmarken som bas (fyller synligt område).
export function drawGrassBase(ctx, view) {
  const g = ctx.createLinearGradient(0, view.top, 0, view.bottom);
  g.addColorStop(0, COLORS.grassLight);
  g.addColorStop(0.5, COLORS.grassBase);
  g.addColorStop(1, COLORS.grassDark);
  ctx.fillStyle = g;
  ctx.fillRect(view.left, view.top, view.right - view.left, view.bottom - view.top);
}

// Mjuka färgfläckar för att bryta upp den platta gröna ytan.
export function drawGrassPatches(ctx, view) {
  const rng = makeRng(WORLD.seed ^ 0x1234);
  const step = 130;
  const startX = Math.floor(view.left / step) * step;
  const startY = Math.floor(view.top / step) * step;
  ctx.save();
  for (let x = startX; x < view.right; x += step) {
    for (let y = startY; y < view.bottom; y += step) {
      // Stabil slump per cell.
      const r = makeRng((((x * 73856093) ^ (y * 19349663)) >>> 0) ^ WORLD.seed);
      const px = x + r() * step;
      const py = y + r() * step;
      const rad = 40 + r() * 70;
      const light = r() > 0.5;
      ctx.globalAlpha = 0.10 + r() * 0.10;
      ctx.fillStyle = light ? COLORS.grassLight : COLORS.grassDark;
      ctx.beginPath();
      ctx.ellipse(px, py, rad, rad * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  void rng;
}

// Ritar synliga grästofsar för finare textur.
export function drawGrassTufts(ctx, details, view) {
  ctx.save();
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (const d of details) {
    if (d.x < view.left || d.x > view.right || d.y < view.top || d.y > view.bottom) {
      continue;
    }
    ctx.strokeStyle = d.shade > 0.5 ? COLORS.grassLight : COLORS.grassDark;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.lean, d.y - d.len);
    ctx.stroke();
  }
  ctx.restore();
}

// Bygger en Path2D som täcker hela vägnätet (rondell + utfarter).
function buildRoadPath(roads) {
  const path = new Path2D();
  // Utfartsvägarna.
  for (const r of roads) {
    const dx = r.x2 - r.x1;
    const dy = r.y2 - r.y1;
    const len = Math.hypot(dx, dy);
    const nx = (-dy / len) * (r.width / 2);
    const ny = (dx / len) * (r.width / 2);
    path.moveTo(r.x1 + nx, r.y1 + ny);
    path.lineTo(r.x2 + nx, r.y2 + ny);
    path.lineTo(r.x2 - nx, r.y2 - ny);
    path.lineTo(r.x1 - nx, r.y1 - ny);
    path.closePath();
  }
  return path;
}

// Ritar vägarna: mörk kant, grusbas och gruskorn.
export function drawRoads(ctx, roads, view) {
  const ring = WORLD.ring;

  // 1) Mörk kant under allt (bredare stroke).
  ctx.lineCap = 'round';
  ctx.strokeStyle = COLORS.gravelDark;
  // Ringvägens kant.
  ctx.lineWidth = ring.roadWidth + 8;
  ctx.beginPath();
  ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
  ctx.stroke();
  // Utfarternas kant.
  for (const r of roads) {
    ctx.lineWidth = r.width + 8;
    ctx.beginPath();
    ctx.moveTo(r.x1, r.y1);
    ctx.lineTo(r.x2, r.y2);
    ctx.stroke();
  }

  // 2) Grusbas ovanpå.
  ctx.strokeStyle = COLORS.gravel;
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

  // 3) Gruskorn — klipp till vägytan och strö små prickar.
  ctx.save();
  const clip = buildRoadPath(roads);
  // Lägg även rondellen i klippytan.
  const ringClip = new Path2D();
  ringClip.arc(0, 0, ring.radius + ring.roadWidth / 2, 0, Math.PI * 2);
  ringClip.arc(0, 0, ring.radius - ring.roadWidth / 2, 0, Math.PI * 2, true);
  ctx.clip(clip);
  drawGravelSpeckles(ctx, view);
  ctx.restore();

  ctx.save();
  ctx.clip(ringClip, 'evenodd');
  drawGravelSpeckles(ctx, view);
  ctx.restore();
}

function drawGravelSpeckles(ctx, view) {
  const step = 60;
  const startX = Math.floor(view.left / step) * step;
  const startY = Math.floor(view.top / step) * step;
  for (let x = startX; x < view.right; x += step) {
    for (let y = startY; y < view.bottom; y += step) {
      const r = makeRng((((x * 12289) ^ (y * 6151)) >>> 0) ^ 0xabcdef);
      for (let k = 0; k < 6; k++) {
        const px = x + r() * step;
        const py = y + r() * step;
        const size = 1 + r() * 2.2;
        ctx.fillStyle = r() > 0.5 ? COLORS.gravelSpeck : COLORS.gravelSpeckDark;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

// Stenlagd platå i mitten där huvudbyggnaden kommer placeras.
export function drawPlaza(ctx) {
  const rad = WORLD.plaza.radius;
  // Kant.
  ctx.fillStyle = COLORS.plazaDark;
  ctx.beginPath();
  ctx.arc(0, 0, rad + 5, 0, Math.PI * 2);
  ctx.fill();
  // Yta.
  ctx.fillStyle = COLORS.plaza;
  ctx.beginPath();
  ctx.arc(0, 0, rad, 0, Math.PI * 2);
  ctx.fill();

  // Enkelt stenmönster (radiella fogar).
  ctx.strokeStyle = COLORS.plazaDark;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.5;
  for (let a = 0; a < 24; a++) {
    const ang = (a / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 20, Math.sin(ang) * 20);
    ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
    ctx.stroke();
  }
  for (let ringR = 45; ringR < rad; ringR += 35) {
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Platshållartext i mitten.
  ctx.fillStyle = 'rgba(60,50,40,0.55)';
  ctx.font = '16px Georgia';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Slottets plats', 0, 0);
}

// Ritar ett 2D-träd (skugga + stam + lövverk).
export function drawTree(ctx, tree) {
  const s = tree.scale;
  ctx.save();
  ctx.translate(tree.x, tree.y);

  // Skugga.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(6 * s, 4 * s, 16 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stam.
  ctx.fillStyle = COLORS.trunk;
  ctx.fillRect(-3 * s, -8 * s, 6 * s, 16 * s);

  if (tree.kind === 'pine') {
    drawPine(ctx, s, tree.tone);
  } else {
    drawOak(ctx, s, tree.tone);
  }
  ctx.restore();
}

function foliageColor(tone, base) {
  // Blanda mellan två gröna nyanser efter tonvärdet.
  const dark = [46, 92, 42];
  const light = [96, 150, 60];
  const t = base + tone * 0.4;
  const r = Math.round(dark[0] + (light[0] - dark[0]) * t);
  const g = Math.round(dark[1] + (light[1] - dark[1]) * t);
  const b = Math.round(dark[2] + (light[2] - dark[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function drawOak(ctx, s, tone) {
  const clusters = [
    [0, -20, 15],
    [-11, -14, 12],
    [11, -14, 12],
    [-6, -26, 11],
    [7, -26, 11],
  ];
  ctx.fillStyle = foliageColor(tone, 0.15);
  for (const [cx, cy, r] of clusters) {
    ctx.beginPath();
    ctx.arc(cx * s, cy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // Ljusdager uppe till vänster.
  ctx.fillStyle = foliageColor(tone, 0.45);
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(-5 * s, -24 * s, 8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPine(ctx, s, tone) {
  ctx.fillStyle = foliageColor(tone, 0.0);
  const tiers = [
    [0, -10, 16, 10],
    [0, -22, 13, 9],
    [0, -33, 9, 8],
  ];
  for (const [cx, cy, w, h] of tiers) {
    ctx.beginPath();
    ctx.moveTo(cx * s, (cy - h) * s);
    ctx.lineTo((cx - w) * s, cy * s);
    ctx.lineTo((cx + w) * s, cy * s);
    ctx.closePath();
    ctx.fill();
  }
}
