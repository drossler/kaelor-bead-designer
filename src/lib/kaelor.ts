export type BeadType = {
  id: string;
  name: string;
  price: number;
  color: string;
  canvasSize: number;
  mm: number;
  isNeopreno?: boolean;
};

export const BEAD_TYPES: BeadType[] = [
  { id: "3MM", name: "3MM Italy", price: 3500, color: "#FF69B4", canvasSize: 16, mm: 3 },
  { id: "4MM", name: "4MM Italy", price: 5000, color: "#FFA500", canvasSize: 18, mm: 4 },
  { id: "5MM", name: "5MM Italy", price: 7500, color: "#FFD700", canvasSize: 20, mm: 5 },
  { id: "6MM", name: "6MM Italy", price: 10000, color: "#7CB342", canvasSize: 22, mm: 6 },
  { id: "8MM", name: "8MM Italy", price: 13500, color: "#42A5F5", canvasSize: 26, mm: 8 },
  {
    id: "NEO",
    name: "6MM Neopreno",
    price: 10000,
    color: "#000000",
    canvasSize: 22,
    mm: 6,
    isNeopreno: true,
  },
];

export const MACRAME_PRICE = 12000;

export type Pattern =
  | "sencillo"
  | "2carriles"
  | "3carriles"
  | "alternado_tamanos"
  | "alternado_neopreno";

export const PATTERNS: { id: Pattern; label: string; tip: string }[] = [
  { id: "sencillo", label: "SENCILLO", tip: "Todos los balines en una hilera circular" },
  { id: "2carriles", label: "2 CARRILES", tip: "Dos hileras concentricas" },
  { id: "3carriles", label: "3 CARRILES", tip: "Tres hileras concentricas" },
  { id: "alternado_tamanos", label: "ALTERNADO TAMAÑOS", tip: "Intercala pequeño-grande-pequeño" },
  { id: "alternado_neopreno", label: "ALTERNADO NEOPRENO", tip: "Intercala oro-neopreno-oro" },
];

export const patternLabel = (p: Pattern) =>
  PATTERNS.find((x) => x.id === p)?.label ?? "SENCILLO";

/** Cart entry: one bead type with a quantity */
export type CartItem = { typeId: string; qty: number };

export type Bead = { type: string; size: number; price: number; color: string; mm: number };

export const formatCOP = (n: number) =>
  "$" + Math.round(n).toLocaleString("es-CO").replace(/,/g, ".");

export function expandCart(cart: CartItem[]): Bead[] {
  const beads: Bead[] = [];
  for (const item of cart) {
    const t = BEAD_TYPES.find((b) => b.id === item.typeId);
    if (!t) continue;
    for (let i = 0; i < item.qty; i++) {
      beads.push({
        type: t.id,
        size: t.canvasSize,
        price: t.price,
        color: t.color,
        mm: t.mm,
      });
    }
  }
  return beads;
}

function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]!);
    if (i < b.length) out.push(b[i]!);
  }
  return out;
}

function orderBeads(beads: Bead[], pattern: Pattern): Bead[] {
  if (pattern === "alternado_tamanos") {
    const sorted = [...beads].sort((x, y) => x.mm - y.mm);
    const half = Math.ceil(sorted.length / 2);
    return interleave(sorted.slice(0, half), sorted.slice(half).reverse());
  }
  if (pattern === "alternado_neopreno") {
    const neo = beads.filter((b) => b.type === "NEO");
    const oro = beads.filter((b) => b.type !== "NEO");
    return interleave(oro, neo);
  }
  return beads;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) =>
    Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Split beads into concentric lanes according to the pattern */
function lanesFor(beads: Bead[], pattern: Pattern): Bead[][] {
  if (pattern === "2carriles") {
    const half = Math.ceil(beads.length / 2);
    return [beads.slice(0, half), beads.slice(half)].filter((l) => l.length > 0);
  }
  if (pattern === "3carriles") {
    const third = Math.ceil(beads.length / 3);
    return [beads.slice(0, third), beads.slice(third, third * 2), beads.slice(third * 2)].filter(
      (l) => l.length > 0,
    );
  }
  return [beads];
}

function drawBead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  d: number,
  color: string,
  matte: boolean,
) {
  const r = d / 2;

  // sombra bajo el balín
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x + r * 0.15, y + r * 0.45, r * 0.85, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.filter = "blur(2px)";
  ctx.fill();
  ctx.restore();

  // cuerpo esférico
  const grad = ctx.createRadialGradient(
    x - r * 0.35,
    y - r * 0.4,
    r * 0.05,
    x,
    y,
    r * 1.05,
  );
  if (matte) {
    grad.addColorStop(0, shade(color, 0.45));
    grad.addColorStop(0.45, shade(color, 0.1));
    grad.addColorStop(1, "#000000");
  } else {
    grad.addColorStop(0, shade(color, 0.75));
    grad.addColorStop(0.3, shade(color, 0.25));
    grad.addColorStop(0.72, color);
    grad.addColorStop(1, shade(color, -0.62));
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // luz de rebote inferior (metal)
  if (!matte) {
    const bounce = ctx.createRadialGradient(
      x + r * 0.25,
      y + r * 0.55,
      0,
      x + r * 0.25,
      y + r * 0.55,
      r * 0.7,
    );
    bounce.addColorStop(0, "rgba(255,225,150,0.55)");
    bounce.addColorStop(1, "rgba(255,225,150,0)");
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = bounce;
    ctx.fill();
  }

  // brillo especular
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x - r * 0.33, y - r * 0.38, r * 0.26, r * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = matte ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.85)";
  ctx.fill();
  ctx.restore();

  // borde sutil
  ctx.beginPath();
  ctx.arc(x, y, r * 0.99, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(0.5, r * 0.06);
  ctx.stroke();
}

/** Cordón macramé (nudos en zig-zag) sobre un arco */
function drawMacrame(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  from: number,
  to: number,
  width: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, from, to);
  ctx.strokeStyle = "#8E1A1A";
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, from, to);
  ctx.strokeStyle = "#C62828";
  ctx.lineWidth = width * 0.7;
  ctx.stroke();

  // nudos
  const step = Math.max(0.06, width / radius / 1.6);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(1, width * 0.14);
  for (let a = from; a <= to; a += step) {
    const r1 = radius - width * 0.34;
    const r2 = radius + width * 0.34;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a + step * 0.6) * r2, cy + Math.sin(a + step * 0.6) * r2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBracelet(
  canvas: HTMLCanvasElement,
  beadsInput: Bead[],
  pattern: Pattern,
  size = 400,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const scale = size / 400;
  ctx.clearRect(0, 0, size, size);

  // fondo con viñeta
  const bg = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.75);
  bg.addColorStop(0, "#242424");
  bg.addColorStop(1, "#111111");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const centerX = size / 2;
  const centerY = size / 2;

  if (beadsInput.length === 0) {
    ctx.fillStyle = "#CCCCCC";
    ctx.font = `${Math.round(13 * scale)}px 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Agrega balines para ver previsualizacion", centerX, centerY);
    return;
  }

  const beads = orderBeads(beadsInput, pattern);
  const lanes = lanesFor(beads, pattern);
  const laneCount = lanes.length;

  const baseRadius = size * 0.3;
  const avgBead = (beads.reduce((s, b) => s + b.size, 0) / beads.length) * scale;

  // factor de tamaño: los balines se ven grandes pero el arco no puede pasar de ~250°
  const maxArc = Math.PI * 1.35;
  const longest = Math.max(
    ...lanes.map((lane) => lane.reduce((s, b) => s + b.size * scale, 0)),
  );
  const fit = Math.min(1.9, Math.max(0.3, (maxArc * baseRadius) / longest));

  const rowSpacing = avgBead * fit * 0.95;
  const laneRadius = (i: number) => baseRadius + (i - (laneCount - 1) / 2) * rowSpacing;

  // cordón macramé: recorre toda la manilla
  const cordRadius = baseRadius;
  const beadArc = (longest * fit) / baseRadius;
  const bottom = Math.PI / 2;
  const startBead = bottom - beadArc / 2;
  const endBead = bottom + beadArc / 2;

  drawMacrame(
    ctx,
    centerX,
    centerY,
    cordRadius,
    endBead,
    startBead + Math.PI * 2,
    Math.max(6 * scale, rowSpacing * 0.55),
  );

  // hilo rojo que atraviesa la zona de balines
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, cordRadius, startBead, endBead);
  ctx.strokeStyle = "#B71C1C";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.stroke();
  ctx.restore();

  // carriles de balines (filas paralelas), centrados abajo
  lanes.forEach((lane, i) => {
    const radius = laneRadius(i);
    const total = lane.reduce((s, b) => s + b.size * scale * fit, 0);
    const span = total / radius;
    let angle = bottom - span / 2;

    lane.forEach((bead) => {
      const d = bead.size * scale * fit;
      const step = d / radius;
      const a = angle + step / 2;
      const x = centerX + Math.cos(a) * radius;
      const y = centerY + Math.sin(a) * radius;
      drawBead(ctx, x, y, d, bead.color, bead.type === "NEO");
      angle += step;
    });
  });
}



export type SavedBracelet = {
  id: string;
  composition: string;
  pattern: string;
  cost: number;
  price: number;
  profit: number;
  timestamp: number;
};

export const STORAGE_KEY = "kaelor_manillas";
