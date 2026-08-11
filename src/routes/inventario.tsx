import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { parseInvoicePdf, type ParsedInvoiceItem } from "@/lib/invoice.functions";
import {
  applyInvoice,
  fetchInvoices,
  fetchMaterials,
  type InvoiceRow,
  type Material,
} from "@/lib/inventory";
import { formatCOP } from "@/lib/kaelor";

export const Route = createFileRoute("/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario y Facturas · KAELOR Joyería" },
      {
        name: "description",
        content:
          "Carga facturas PDF de proveedor, suma materiales al stock de KAELOR y controla el inventario de balines e insumos.",
      },
      { property: "og:title", content: "Inventario y Facturas · KAELOR Joyería" },
      {
        property: "og:description",
        content:
          "Sube la factura del proveedor, la IA extrae los materiales y el stock se actualiza automáticamente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inventario,
});

function Inventario() {
  const parse = useServerFn(parseInvoicePdf);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [items, setItems] = useState<ParsedInvoiceItem[]>([]);

  const reload = async () => {
    try {
      const [m, i] = await Promise.all([fetchMaterials(), fetchInvoices()]);
      setMaterials(m);
      setInvoices(i);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando inventario");
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const onFile = async (file: File) => {
    setError(null);
    setOk(null);
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const base64 = btoa(binary);
      const result = await parse({
        data: {
          filename: file.name,
          mimeType: file.type || "application/pdf",
          fileData: base64,
        },
      });
      setInvoiceNumber(result.invoice_number);
      setSupplier(result.supplier);
      setInvoiceDate(result.invoice_date ?? "");
      setItems(result.items);
      if (result.items.length === 0)
        setError("No se detectaron materiales en la factura, agrégalos manualmente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer la factura");
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (idx: number, patch: Partial<ParsedInvoiceItem>) =>
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const total = items.reduce((s, i) => s + i.qty * i.unit_cost, 0);

  const submit = async () => {
    setError(null);
    setOk(null);
    if (!invoiceNumber.trim()) {
      setError("Escribe el número de factura");
      return;
    }
    if (items.length === 0) {
      setError("La factura no tiene materiales");
      return;
    }
    setBusy(true);
    try {
      await applyInvoice({
        invoiceNumber: invoiceNumber.trim(),
        supplier: supplier.trim(),
        invoiceDate: invoiceDate || null,
        items,
      });
      setOk("✅ Factura cargada y stock actualizado");
      setInvoiceNumber("");
      setSupplier("");
      setInvoiceDate("");
      setItems([]);
      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo cargar la factura";
      setError(
        msg.includes("ya fue cargada") || msg.includes("duplicate")
          ? `Esa factura ya fue cargada antes. El número debe ser distinto.`
          : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink font-sans text-white">
      <header className="border-b-[3px] border-gold bg-ink px-5 py-6 text-center">
        <h1 className="bg-gradient-to-r from-gold to-gold-deep bg-clip-text font-display text-[24px] font-bold text-transparent">
          Inventario KAELOR
        </h1>
        <Link to="/" className="mt-2 inline-block text-[12px] text-gold underline">
          ← Volver a la calculadora
        </Link>
      </header>

      <main className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 p-3 md:p-5 lg:grid-cols-2">
        <section className="flex flex-col gap-4">
          <div className="k-card">
            <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-gold">
              CARGAR FACTURA (PDF)
            </h2>
            <input
              type="file"
              accept="application/pdf,image/*"
              aria-label="Factura del proveedor en PDF"
              className="k-input w-full text-[12px]"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
            {loading && <p className="mt-2 text-[12px] text-gold">Leyendo factura con IA…</p>}
            {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
            {ok && <p className="mt-2 text-[12px] text-green-400">{ok}</p>}

            {(items.length > 0 || invoiceNumber) && (
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    aria-label="Número de factura"
                    placeholder="N° factura"
                    className="k-input flex-1 text-[12px]"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                  <input
                    aria-label="Proveedor"
                    placeholder="Proveedor"
                    className="k-input flex-1 text-[12px]"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                  />
                  <input
                    type="date"
                    aria-label="Fecha de la factura"
                    className="k-input text-[12px]"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>

                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      aria-label="Material"
                      className="k-input flex-1 text-[12px]"
                      value={it.name}
                      onChange={(e) => updateItem(idx, { name: e.target.value })}
                    />
                    <input
                      type="number"
                      min={0}
                      aria-label="Cantidad"
                      className="k-input w-[80px] text-[12px]"
                      value={it.qty}
                      onChange={(e) => updateItem(idx, { qty: Number(e.target.value) || 0 })}
                    />
                    <input
                      type="number"
                      min={0}
                      aria-label="Costo unitario"
                      className="k-input w-[110px] text-[12px]"
                      value={it.unit_cost}
                      onChange={(e) => updateItem(idx, { unit_cost: Number(e.target.value) || 0 })}
                    />
                    <button
                      type="button"
                      aria-label={`Quitar ${it.name}`}
                      onClick={() => removeItem(idx)}
                      className="cursor-pointer px-2 text-gold hover:text-gold-bright"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setItems((p) => [...p, { name: "", qty: 0, unit_cost: 0, unit: "unidad" }])
                  }
                  className="k-btn px-3 py-2 text-[12px]"
                >
                  + Agregar línea
                </button>

                <p className="text-[12px] text-text-soft">
                  Total factura: <span className="text-gold">{formatCOP(total)}</span>
                </p>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submit()}
                  className="k-btn py-[10px] text-[14px]"
                >
                  {busy ? "Cargando…" : "Cargar al inventario"}
                </button>
              </div>
            )}
          </div>

          <div className="k-card">
            <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-gold">
              FACTURAS CARGADAS
            </h2>
            {invoices.length === 0 && (
              <p className="text-[11px] text-text-soft">Aún no hay facturas.</p>
            )}
            {invoices.map((inv) => (
              <p key={inv.id} className="text-[12px] text-text-soft">
                <span className="text-gold">#{inv.invoice_number}</span> · {inv.supplier || "—"} ·{" "}
                {inv.invoice_date ?? new Date(inv.created_at).toLocaleDateString("es-CO")} ·{" "}
                {formatCOP(inv.total)}
              </p>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="k-card">
            <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-gold">
              STOCK ACTUAL
            </h2>
            {materials.length === 0 && (
              <p className="text-[11px] text-text-soft">
                Sin materiales todavía. Sube la primera factura del proveedor.
              </p>
            )}
            <div className="flex flex-col gap-1">
              {materials.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between border-l-[3px] border-gold bg-surface px-3 py-2 text-[12px]"
                >
                  <span>{m.name}</span>
                  <span className="text-text-soft">
                    <span className="text-gold">{m.stock}</span> {m.unit} ·{" "}
                    {formatCOP(m.unit_cost)} c/u
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
