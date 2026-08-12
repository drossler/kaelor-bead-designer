import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { parseInvoicePdf, type ParsedInvoiceItem } from "@/lib/invoice.functions";
import { useKaelor } from "@/hooks/useKaelorData";
import { applyInvoiceFifo, createSupplier, findMaterial } from "@/lib/inventory";
import { formatCOP } from "@/lib/kaelor";

type Row = ParsedInvoiceItem & { matchId: string };

export function FacturaTab() {
  const parse = useServerFn(parseInvoicePdf);
  const { materials, suppliers, reload } = useKaelor();

  const [supplierId, setSupplierId] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([]);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const addSupplier = async () => {
    setErr(null);
    if (!newSupplier.trim()) return;
    try {
      const s = await createSupplier(newSupplier);
      setNewSupplier("");
      await reload();
      setSupplierId(s.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo crear el proveedor");
    }
  };

  const onFile = async (file: File) => {
    if (!supplierId) {
      setErr("Primero selecciona o crea el proveedor");
      return;
    }
    setErr(null);
    setOk(null);
    setReading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const result = await parse({
        data: {
          filename: file.name,
          mimeType: file.type || "application/pdf",
          fileData: btoa(binary),
        },
      });
      if (result.invoice_number) setInvoiceNumber(result.invoice_number);
      if (result.invoice_date) setInvoiceDate(result.invoice_date);
      setRows(
        result.items.map((i) => ({
          ...i,
          matchId: findMaterial(materials, i.name)?.id ?? "new",
        })),
      );
      if (result.items.length === 0)
        setErr("No se detectaron materiales. Agrégalos manualmente abajo.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo leer la factura");
      setRows([{ name: "", qty: 0, unit_cost: 0, unit: "unidad", matchId: "new" }]);
    } finally {
      setReading(false);
    }
  };

  const update = (idx: number, patch: Partial<Row>) =>
    setRows((p) => p.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const total = rows.reduce((s, r) => s + r.qty * r.unit_cost, 0);

  const confirm = async () => {
    setErr(null);
    setOk(null);
    if (!supplierId) return setErr("Selecciona un proveedor");
    if (!invoiceNumber.trim()) return setErr("Ingresa el número de factura");
    const valid = rows.filter((r) => r.name.trim() && r.qty > 0);
    if (valid.length === 0) return setErr("No hay materiales válidos para agregar");

    setBusy(true);
    try {
      await applyInvoiceFifo({
        supplierId,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceDate || null,
        items: valid.map((r) => ({
          material_id: r.matchId !== "new" ? r.matchId : null,
          name: r.name.trim(),
          qty: r.qty,
          unit_cost: r.unit_cost,
          unit: r.unit || "unidad",
        })),
      });
      setOk(`✅ Factura cargada. ${valid.length} materiales actualizados en el inventario.`);
      setRows([]);
      setInvoiceNumber("");
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo cargar la factura");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="k-card">
        <h2 className="mb-3 border-b-2 border-gold pb-2 text-[14px] font-bold text-gold">
          🏭 Proveedor
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-gold-deep">
              Selecciona proveedor existente
            </label>
            <select
              className="k-input w-full text-[12px]"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">-- Selecciona --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-gold-deep">
              O crea uno nuevo
            </label>
            <div className="flex gap-2">
              <input
                className="k-input flex-1 text-[12px]"
                placeholder="Nombre del proveedor"
                value={newSupplier}
                onChange={(e) => setNewSupplier(e.target.value)}
              />
              <button type="button" onClick={() => void addSupplier()} className="k-btn px-3 text-[12px]">
                + Crear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="k-card">
        <h2 className="mb-3 border-b-2 border-gold pb-2 text-[14px] font-bold text-gold">
          📄 Subir factura PDF
        </h2>
        <input
          type="file"
          accept="application/pdf,image/*"
          aria-label="Factura del proveedor"
          className="k-input w-full text-[12px]"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
        {reading && <p className="mt-2 text-[12px] text-gold">⏳ Leyendo la factura con IA…</p>}
        {err && (
          <p className="mt-2 rounded-md border-l-4 border-red-500 bg-[#3a1a1a] p-3 text-[12px] text-red-300">
            {err}
          </p>
        )}
        {ok && (
          <p className="mt-2 rounded-md border-l-4 border-green-500 bg-[#1a2e1a] p-3 text-[12px] text-green-300">
            {ok}
          </p>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-gold-deep">
              N° de factura
            </label>
            <input
              className="k-input w-full text-[12px]"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-gold-deep">Fecha</label>
            <input
              type="date"
              className="k-input w-full text-[12px]"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="k-card">
        <h2 className="mb-3 border-b-2 border-gold pb-2 text-[14px] font-bold text-gold">
          ✅ Revisa y confirma los materiales
        </h2>
        <p className="mb-3 rounded-md border-l-4 border-gold bg-[#3a2e1a] p-3 text-[11px] text-[#ffe08a]">
          ⚠️ La lectura automática puede tener errores. Revisa nombre, cantidad y precio, e indica si
          es un material que ya tienes o uno nuevo.
        </p>

        <div className="flex flex-col gap-2">
          {rows.map((r, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Material"
                placeholder="Material"
                className="k-input min-w-[160px] flex-1 text-[12px]"
                value={r.name}
                onChange={(e) => update(idx, { name: e.target.value })}
              />
              <input
                type="number"
                min={0}
                aria-label="Cantidad"
                className="k-input w-[80px] text-[12px]"
                value={r.qty}
                onChange={(e) => update(idx, { qty: Number(e.target.value) || 0 })}
              />
              <input
                type="number"
                min={0}
                aria-label="Costo unitario"
                className="k-input w-[110px] text-[12px]"
                value={r.unit_cost}
                onChange={(e) => update(idx, { unit_cost: Number(e.target.value) || 0 })}
              />
              <select
                aria-label="Material existente o nuevo"
                className="k-input w-[190px] text-[12px]"
                value={r.matchId}
                onChange={(e) => update(idx, { matchId: e.target.value })}
              >
                <option value="new">🆕 Material nuevo</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Quitar línea"
                onClick={() => setRows((p) => p.filter((_, i) => i !== idx))}
                className="cursor-pointer rounded bg-[#dc3545] px-2 py-1 text-[11px] text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setRows((p) => [...p, { name: "", qty: 0, unit_cost: 0, unit: "unidad", matchId: "new" }])
            }
            className="cursor-pointer rounded-md bg-[#6c757d] px-4 py-2 text-[12px] font-semibold text-white"
          >
            + Agregar línea
          </button>
          <span className="text-[12px] text-text-soft">
            Total factura: <span className="text-gold">{formatCOP(total)}</span>
          </span>
          <button
            type="button"
            disabled={busy || rows.length === 0}
            onClick={() => void confirm()}
            className="k-btn px-4 py-2 text-[12px] disabled:opacity-40"
          >
            {busy ? "Cargando…" : "✅ Confirmar y agregar al inventario"}
          </button>
        </div>
      </div>
    </div>
  );
}
