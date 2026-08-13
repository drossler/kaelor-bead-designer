import { supabase } from "@/integrations/supabase/client";

export type Material = {
  id: string;
  name: string;
  unit: string;
  unit_cost: number;
  stock: number;
  category: string;
};

export type Supplier = { id: string; name: string };

export type Lot = {
  id: string;
  material_id: string;
  supplier_id: string | null;
  invoice_id: string | null;
  lot_date: string;
  qty_original: number;
  qty_remaining: number;
  unit_cost: number;
  created_at: string;
};

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  supplier: string;
  supplier_id: string | null;
  invoice_date: string | null;
  total: number;
  created_at: string;
};

export type BraceletRow = {
  id: string;
  composition: string;
  pattern: string;
  cost: number;
  price: number;
  profit: number;
  created_at: string;
};

export const CATEGORY_ORDER = [
  "Balines Diamantados",
  "Balines Italianos",
  "Balines Lisa",
  "Neoprenos",
  "Otros Balines",
  "Herrajes y Accesorios",
  "Hilos y Macrame",
  "Otros Materiales",
];

export const CATEGORY_ICON: Record<string, string> = {
  "Balines Diamantados": "💎",
  "Balines Italianos": "🇮🇹",
  "Balines Lisa": "⚪",
  Neoprenos: "⚫",
  "Otros Balines": "🔮",
  "Herrajes y Accesorios": "✨",
  "Hilos y Macrame": "🧵",
  "Otros Materiales": "📦",
};

export async function fetchMaterials(): Promise<Material[]> {
  const { data, error } = await supabase
    .from("materials")
    .select("id, name, unit, unit_cost, stock, category")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    ...m,
    unit_cost: Number(m.unit_cost),
    stock: Number(m.stock),
    category: m.category ?? "Otros Materiales",
  }));
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from("suppliers").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createSupplier(name: string): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .insert({ name: name.trim() })
    .select("id, name")
    .single();
  if (error) {
    if (error.message.includes("duplicate")) throw new Error("Ese proveedor ya existe");
    throw new Error(error.message);
  }
  return data;
}

export async function fetchLots(): Promise<Lot[]> {
  const { data, error } = await supabase
    .from("material_lots")
    .select(
      "id, material_id, supplier_id, invoice_id, lot_date, qty_original, qty_remaining, unit_cost, created_at",
    )
    .order("lot_date")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({
    ...l,
    qty_original: Number(l.qty_original),
    qty_remaining: Number(l.qty_remaining),
    unit_cost: Number(l.unit_cost),
  }));
}

export async function fetchInvoices(): Promise<InvoiceRow[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, supplier, supplier_id, invoice_date, total, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((i) => ({ ...i, total: Number(i.total) }));
}

export async function fetchBracelets(): Promise<BraceletRow[]> {
  const { data, error } = await supabase
    .from("bracelets")
    .select("id, composition, pattern, cost, price, profit, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => ({
    ...b,
    cost: Number(b.cost),
    price: Number(b.price),
    profit: Number(b.profit),
  }));
}

export async function applyInvoiceFifo(input: {
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  items: { material_id?: string | null; name: string; qty: number; unit_cost: number; unit: string }[];
}) {
  const { error } = await supabase.rpc("apply_invoice_fifo", {
    p_supplier_id: input.supplierId,
    p_invoice_number: input.invoiceNumber,
    p_invoice_date: input.invoiceDate as string,
    p_items: input.items,
  });
  if (error) throw new Error(error.message);
}

export async function saveBraceletFifo(input: {
  composition: string;
  pattern: string;
  extraCost: number;
  multiplier: number;
  items: { material_id: string; qty: number }[];
}) {
  const { error } = await supabase.rpc("save_bracelet_fifo", {
    p_composition: input.composition,
    p_pattern: input.pattern,
    p_extra_cost: input.extraCost,
    p_multiplier: input.multiplier,
    p_items: input.items,
  });
  if (error) throw new Error(error.message);
}

export async function deleteBracelet(id: string) {
  const { error } = await supabase.from("bracelets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function findMaterial(materials: Material[], name: string): Material | undefined {
  const n = name.trim().toLowerCase();
  return materials.find((m) => m.name.trim().toLowerCase() === n);
}

/** Lotes de un material ordenados FIFO */
export function lotsOf(lots: Lot[], materialId: string): Lot[] {
  return lots
    .filter((l) => l.material_id === materialId)
    .sort((a, b) =>
      a.lot_date === b.lot_date
        ? a.created_at.localeCompare(b.created_at)
        : a.lot_date.localeCompare(b.lot_date),
    );
}

export function stockOf(lots: Lot[], materialId: string): number {
  return lotsOf(lots, materialId).reduce((s, l) => s + l.qty_remaining, 0);
}

/** Costo del próximo lote disponible (FIFO) */
export function nextCostOf(lots: Lot[], materialId: string): number {
  return lotsOf(lots, materialId).find((l) => l.qty_remaining > 0)?.unit_cost ?? 0;
}

/** Simula el costo FIFO de consumir qty unidades (no modifica stock) */
export function fifoCost(lots: Lot[], materialId: string, qty: number): number {
  let left = qty;
  let cost = 0;
  for (const l of lotsOf(lots, materialId)) {
    if (left <= 0) break;
    if (l.qty_remaining <= 0) continue;
    const take = Math.min(l.qty_remaining, left);
    cost += take * l.unit_cost;
    left -= take;
  }
  return cost;
}

/** Borra TODOS los registros: manillas, facturas, lotes, materiales y proveedores */
export async function resetAllData() {
  const tables = [
    "bracelet_items",
    "bracelets",
    "invoice_items",
    "material_lots",
    "invoices",
    "materials",
    "suppliers",
  ] as const;
  for (const t of tables) {
    const { error } = await supabase
      .from(t)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(`${t}: ${error.message}`);
  }
}
