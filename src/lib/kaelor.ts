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

function radiusFor(pattern: Pattern, i: number, total: number, scale: number): number {
  if (pattern === "2carriles") {
    return (i < Math.ceil(total / 2) ? 65 : 90) * scale;
  }
  if (pattern === "3carriles") {
    const third = Math.ceil(total / 3);
    if (i < third) return 55 * scale;
    if (i < third * 2) return 75 * scale;
    return 95 * scale;
  }
  return 70 * scale;
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
  ctx.fillStyle = "#1a1a1a";
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
  const total = beads.length;

  beads.forEach((bead, i) => {
    const radius = radiusFor(pattern, i, total, scale);
    const angle = (i * 360) / total;
    const x = centerX + Math.cos((angle * Math.PI) / 180) * radius;
    const y = centerY + Math.sin((angle * Math.PI) / 180) * radius;
    const d = bead.size * scale;

    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.arc(x, y, d / 2, 0, Math.PI * 2);
    ctx.fillStyle = bead.color;
    ctx.fill();
    ctx.restore();

    // reflejo dorado
    ctx.beginPath();
    ctx.arc(x - d * 0.18, y - d * 0.18, (d / 2) * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 215, 0, 0.75)";
    ctx.fill();
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
