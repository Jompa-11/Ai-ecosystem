// Ritfunktioner för vildmarken (skog, berg, dammar, stigar) i mörk,
// fackelupplyst stil som matchar den centrala kartbilden.

import { makeRng } from './rng.js';

function mix(a, b, t) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}
const PINE_DARK = [10, 22, 12];
const PINE_LIGHT = [35, 58, 32];
const ROCK_DARK = [30, 27, 22];
const ROCK_LIGHT = [110, 102, 88];

export function drawWildBase(ctx, view, world) {
  const g = ctx.createLinearGradient(0, view.top, 0, view.bottom);
  g.addColorStop(0, '#1a2a10');
  g.addColorStop(0.5, '#203311');
  g.addColorStop(1, '#15220c');
  ctx.fillStyle = g;
  ctx.fillRect(Math.max(0, view.left), Math.max(0, view.top), Math.min(world.w, view.right) - Math.max(0, view.left), Math.min(world.h, view.bottom) - Math.max(0, view.top));
}

// Mjuka gräsfläckar för textur (rutnätsbaserat, ritas bara för synligt område).
export function drawWildGrassPatches(ctx, view) {
  const step = 220;
  const sx = Math.floor(view.left / step) * step;
  const sy = Math.floor(view.top / step) * step;
  ctx.save();
  for (let x = sx; x < view.right; x += step) {
    for (let y = sy; y < view.bottom; y += step) {
      const r = makeRng((((x * 73856093) ^ (y * 19349663)) >>> 0) ^ 0x2a17);
      const px = x + r() * step;
      const py = y + r() * step;
      const rad = 60 + r() * 120;
      ctx.globalAlpha = 0.08 + r() * 0.10;
      ctx.fillStyle = r() > 0.5 ? '#2c4515' : '#101c0a';
      ctx.beginPath();
      ctx.ellipse(px, py, rad, rad * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Små grässtrån (rutnätsbaserat, gles).
export function drawWildGrassTufts(ctx, view) {
  const step = 46;
  const sx = Math.floor(view.left / step) * step;
  const sy = Math.floor(view.top / step) * step;
  ctx.save();
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let x = sx; x < view.right; x += step) {
    for (let y = sy; y < view.bottom; y += step) {
      const r = makeRng((((x * 12289) ^ (y * 6151)) >>> 0) ^ 0x9e17);
      if (r() < 0.55) continue;
      const px = x + r() * step;
      const py = y + r() * step;
      const len = 5 + r() * 8;
      const lean = range2(r, -3, 3);
      ctx.strokeStyle = r() > 0.5 ? 'rgba(70,110,35,0.35)' : 'rgba(10,20,6,0.4)';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + lean, py - len);
      ctx.stroke();
    }
  }
  ctx.restore();
}
function range2(r, a, b) { return a + r() * (b - a); }

// Mjuk grön "gloria" runt kartbilden som gradvis tonar ut i den mörka
// vildmarken, så övergången blir osynlig istället för en hård kant.
export function drawBorderGlow(ctx, world) {
  const { offsetX: x0, offsetY: y0, bitmapW: w, bitmapH: h } = world;
  const x1 = x0 + w, y1 = y0 + h;
  const layers = [
    [70, 'rgba(70,100,34,0.55)'],
    [140, 'rgba(55,82,28,0.36)'],
    [230, 'rgba(40,62,20,0.22)'],
    [330, 'rgba(28,44,14,0.12)'],
    [440, 'rgba(20,32,10,0.06)'],
  ];
  ctx.save();
  for (const [m, color] of layers) {
    ctx.fillStyle = color;
    roundRect(ctx, x0 - m, y0 - m, (x1 - x0) + m * 2, (y1 - y0) + m * 2, m * 0.6);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawPaths(ctx, paths) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const pts of paths) {
    ctx.strokeStyle = '#141618';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    ctx.strokeStyle = '#34383c';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(200,162,58,0.55)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawPonds(ctx, ponds) {
  for (const p of ponds) {
    ctx.fillStyle = '#081a2c';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx + 8, p.ry + 8, 0, 0, Math.PI * 2);
    ctx.fill();
    const grd = ctx.createRadialGradient(p.x - p.rx * 0.2, p.y - p.ry * 0.2, 2, p.x, p.y, p.rx);
    grd.addColorStop(0, '#2c6aa0');
    grd.addColorStop(1, '#0d2a4a');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
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

export function drawRock(ctx, r) {
  const s = r.scale;
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(4 * s, 5 * s, 15 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mix(ROCK_DARK, ROCK_LIGHT, 0);
  rockShape(ctx, 0, 2 * s, 15 * s, 11 * s);
  ctx.fillStyle = mix(ROCK_DARK, ROCK_LIGHT, 0.35 + r.tone * 0.3);
  rockShape(ctx, 0, 0, 13 * s, 9 * s);
  ctx.fillStyle = mix(ROCK_DARK, ROCK_LIGHT, 0.7);
  ctx.globalAlpha = 0.55;
  rockShape(ctx, -3 * s, -2 * s, 5 * s, 4 * s);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawTree(ctx, t) {
  const s = t.scale;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(4 * s, 4 * s, 12 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1a120a';
  ctx.fillRect(-2 * s, -5 * s, 4 * s, 10 * s);

  const tiers = [[0, -6, 14, 11], [0, -18, 11, 10], [0, -28, 7, 9]];
  ctx.fillStyle = mix(PINE_DARK, PINE_LIGHT, 0);
  for (const [cx, cy, w, h] of tiers) tri(ctx, cx * s, cy * s, (w + 2) * s, (h + 2) * s);
  ctx.fillStyle = mix(PINE_DARK, PINE_LIGHT, 0.3 + t.tone * 0.35);
  for (const [cx, cy, w, h] of tiers) tri(ctx, cx * s, cy * s, w * s, h * s);
  ctx.restore();
}

function tri(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx - w, cy);
  ctx.lineTo(cx + w, cy);
  ctx.closePath();
  ctx.fill();
}
