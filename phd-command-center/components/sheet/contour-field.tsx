"use client";

import { useEffect, useRef } from "react";

/**
 * The hero's one bold element (docs/plan/design-system.md).
 *
 * A value-noise elevation field drawn as hairline contours with marching squares. On load the
 * terrain rises from a flat plane, outer contours first. After that the only motion is the
 * pointer: within `FOCUS_RADIUS` the contour interval halves, so the ground resolves in finer
 * detail where the cursor is — a levelling instrument, not a spotlight.
 *
 * It goes still when: the viewer prefers reduced motion, the pointer is coarse (touch), or the
 * canvas scrolls out of view. In the first two cases the final frame is drawn once and no
 * animation loop ever starts.
 */

const GRID_STEP = 8;
const LEVELS = 7;
const FOCUS_RADIUS = 180;
const FRAME_MS = 1000 / 30;
const RISE_MS = 750;
const RISE_DELAY_MS = 350;

function createNoise(seed: number): (x: number, y: number) => number {
  const hash = (x: number, y: number): number => {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };

  const smooth = (t: number): number => t * t * (3 - 2 * t);

  const value = (x: number, y: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = smooth(x - xi);
    const yf = smooth(y - yi);
    const top = hash(xi, yi) * (1 - xf) + hash(xi + 1, yi) * xf;
    const bottom = hash(xi, yi + 1) * (1 - xf) + hash(xi + 1, yi + 1) * xf;
    return top * (1 - yf) + bottom * yf;
  };

  // Three octaves: a broad landform, a ridge, and a little texture.
  return (x, y) =>
    value(x, y) * 0.6 + value(x * 2.1, y * 2.1) * 0.28 + value(x * 4.3, y * 4.3) * 0.12;
}

interface Field {
  values: Float32Array;
  cols: number;
  rows: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function sampleField(width: number, height: number, seed: number): Field {
  const cols = Math.ceil(width / GRID_STEP) + 1;
  const rows = Math.ceil(height / GRID_STEP) + 1;
  const noise = createNoise(seed);
  const values = new Float32Array(cols * rows);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = col * GRID_STEP;
      const y = row * GRID_STEP;
      // Stretched horizontally so the landform reads as a wide valley rather than blobs.
      const elevation = noise(x / 260, y / 150);
      // The ground is flat where the text sits and rises away from it, so contours thin out
      // behind the words rather than being hidden by a scrim. Flat ground has no contours on a
      // real sheet either.
      const nx = width > 0 ? x / width : 0;
      const ny = height > 0 ? y / height : 0;
      const relief = smoothstep(0.3, 0.95, nx * 0.55 + ny * 0.45);
      values[row * cols + col] = elevation * relief;
    }
  }

  return { values, cols, rows };
}

function interpolate(a: number, b: number, level: number): number {
  const span = b - a;
  if (Math.abs(span) < 1e-6) return 0.5;
  return (level - a) / span;
}

/** One marching-squares pass at a single level, appended to the current path. */
function traceLevel(
  context: CanvasRenderingContext2D,
  field: Field,
  level: number,
  scale: number,
): void {
  const { values, cols, rows } = field;

  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const topLeft = values[row * cols + col] * scale;
      const topRight = values[row * cols + col + 1] * scale;
      const bottomRight = values[(row + 1) * cols + col + 1] * scale;
      const bottomLeft = values[(row + 1) * cols + col] * scale;

      let index = 0;
      if (topLeft > level) index |= 8;
      if (topRight > level) index |= 4;
      if (bottomRight > level) index |= 2;
      if (bottomLeft > level) index |= 1;
      if (index === 0 || index === 15) continue;

      const x = col * GRID_STEP;
      const y = row * GRID_STEP;
      const top = { x: x + GRID_STEP * interpolate(topLeft, topRight, level), y };
      const right = {
        x: x + GRID_STEP,
        y: y + GRID_STEP * interpolate(topRight, bottomRight, level),
      };
      const bottom = {
        x: x + GRID_STEP * interpolate(bottomLeft, bottomRight, level),
        y: y + GRID_STEP,
      };
      const left = { x, y: y + GRID_STEP * interpolate(topLeft, bottomLeft, level) };

      const draw = (a: { x: number; y: number }, b: { x: number; y: number }): void => {
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
      };

      switch (index) {
        case 1:
        case 14:
          draw(left, bottom);
          break;
        case 2:
        case 13:
          draw(bottom, right);
          break;
        case 3:
        case 12:
          draw(left, right);
          break;
        case 4:
        case 11:
          draw(top, right);
          break;
        case 6:
        case 9:
          draw(top, bottom);
          break;
        case 7:
        case 8:
          draw(left, top);
          break;
        case 5:
          draw(left, top);
          draw(bottom, right);
          break;
        case 10:
          draw(left, bottom);
          draw(top, right);
          break;
        default:
          break;
      }
    }
  }
}

export function ContourField({ seed = 1948, className }: { seed?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const still = reduceMotion || coarsePointer;

    let field: Field | null = null;
    let width = 0;
    let height = 0;
    let pointer: { x: number; y: number } | null = null;
    let start: number | null = null;
    let frame = 0;
    let lastPaint = 0;
    let visible = true;

    const readInk = (): string =>
      getComputedStyle(canvas).getPropertyValue("--contour").trim() || "#a67a46";

    const draw = (scale: number): void => {
      if (!field) return;
      const stroke = readInk();
      context.clearRect(0, 0, width, height);
      context.lineWidth = 1;
      context.strokeStyle = stroke;

      const interval = 1 / (LEVELS + 1);

      context.globalAlpha = 0.6;
      context.beginPath();
      for (let level = 1; level <= LEVELS; level += 1) {
        traceLevel(context, field, level * interval, scale);
      }
      context.stroke();

      // Halve the interval near the pointer: the same ground, surveyed more closely.
      if (pointer && !still && scale >= 1) {
        context.save();
        context.beginPath();
        context.arc(pointer.x, pointer.y, FOCUS_RADIUS, 0, Math.PI * 2);
        context.clip();
        context.globalAlpha = 0.45;
        context.beginPath();
        for (let level = 0; level <= LEVELS; level += 1) {
          traceLevel(context, field, (level + 0.5) * interval, scale);
        }
        context.stroke();
        context.restore();
      }

      context.globalAlpha = 1;
    };

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      field = sampleField(width, height, seed);
      draw(still ? 1 : currentScale());
    };

    const currentScale = (): number => {
      if (still || start === null) return still ? 1 : 0;
      const elapsed = performance.now() - start - RISE_DELAY_MS;
      if (elapsed <= 0) return 0;
      if (elapsed >= RISE_MS) return 1;
      const t = elapsed / RISE_MS;
      // easeOutCubic: the ground settles rather than bounces.
      return 1 - Math.pow(1 - t, 3);
    };

    const loop = (): void => {
      const now = performance.now();
      if (now - lastPaint >= FRAME_MS) {
        lastPaint = now;
        draw(currentScale());
      }
      if (currentScale() < 1) {
        frame = requestAnimationFrame(loop);
      } else {
        frame = 0;
      }
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (still || !visible) return;
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const now = performance.now();
      if (now - lastPaint >= FRAME_MS) {
        lastPaint = now;
        draw(currentScale());
      }
    };

    const onPointerLeave = (): void => {
      if (still) return;
      pointer = null;
      draw(currentScale());
    };

    const observer = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(canvas);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    resize();
    if (!still) {
      start = performance.now();
      frame = requestAnimationFrame(loop);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [seed]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
