import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchBracelets,
  fetchInvoices,
  fetchLots,
  fetchMaterials,
  fetchSuppliers,
  type BraceletRow,
  type InvoiceRow,
  type Lot,
  type Material,
  type Supplier,
} from "@/lib/inventory";

type KaelorData = {
  materials: Material[];
  lots: Lot[];
  suppliers: Supplier[];
  invoices: InvoiceRow[];
  bracelets: BraceletRow[];
  loading: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
  reload: () => Promise<void>;
};

const Ctx = createContext<KaelorData | null>(null);

export function KaelorProvider({ children }: { children: React.ReactNode }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [bracelets, setBracelets] = useState<BraceletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [m, l, s, i, b] = await Promise.all([
        fetchMaterials(),
        fetchLots(),
        fetchSuppliers(),
        fetchInvoices(),
        fetchBracelets(),
      ]);
      setMaterials(m);
      setLots(l);
      setSuppliers(s);
      setInvoices(i);
      setBracelets(b);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando el inventario");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(
    () => ({ materials, lots, suppliers, invoices, bracelets, loading, error, setError, reload }),
    [materials, lots, suppliers, invoices, bracelets, loading, error, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useKaelor(): KaelorData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useKaelor debe usarse dentro de KaelorProvider");
  return ctx;
}
