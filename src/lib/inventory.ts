import { supabase } from "@/integrations/supabase/client";

export type Material = {
  id: string;
  name: string;
  unit: string;
  unit_cost: number;
  stock: number;
};

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  supplier: string;
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

export async function fetchMaterials(): Promise<Material[]> {
  const { data, error } = await supabase
    .from("materials")
    .select("id, name, unit, unit_cost, stock")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    ...m,
    unit_cost: Number(m.unit_cost),
    stock: Number(m.stock),
  }));
}

export async function fetchInvoices(): Promise<InvoiceRow[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, supplier, invoice_date, total, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((i) => ({ ...i, total: Number(i.total) }));
}

export async function fetchBracelets(): Promise<BraceletRow[]> {
  const { data, error } = await supabase
    .from("bracelets")
    .select("id, composition, pattern, cost, price, profit, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => ({
    ...b,
    cost: Number(b.cost),
    price: Number(b.price),
    profit: Number(b.profit),
  }));
}

export async function applyInvoice(input: {
  invoiceNumber: string;
  supplier: string;
  invoiceDate: string | null;
  items: { name: string; qty: number; unit_cost: number; unit: string }[];
}) {
  const { error } = await supabase.rpc("apply_invoice", {
    p_invoice_number: input.invoiceNumber,
    p_supplier: input.supplier,
    p_invoice_date: input.invoiceDate,
    p_items: input.items,
  });
  if (error) throw new Error(error.message);
}

export async function saveBraceletWithStock(input: {
  composition: string;
  pattern: string;
  cost: number;
  price: number;
  items: { material_id: string; qty: number }[];
}) {
  const { error } = await supabase.rpc("save_bracelet", {
    p_composition: input.composition,
    p_pattern: input.pattern,
    p_cost: input.cost,
    p_price: input.price,
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
