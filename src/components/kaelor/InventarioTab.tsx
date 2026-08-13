import { useKaelor } from "@/hooks/useKaelorData";
import { lotsOf, nextCostOf, stockOf } from "@/lib/inventory";
import { formatCOP } from "@/lib/kaelor";

export function InventarioTab() {
  const { materials, lots, invoices, suppliers, reload, loading } = useKaelor();
  const supplierName = (id: string | null) => suppliers.find((s) => s.id === id)?.name ?? "?";

  return (
    <div className="flex flex-col gap-4">
      <div className="k-card">
        <h2 className="mb-3 border-b-2 border-gold pb-2 text-[14px] font-bold text-gold">
          📦 Stock actual por material
        </h2>
        {materials.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-text-soft">
            Aún no has cargado ninguna factura
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b-2 border-gold bg-[#3a3a3a] text-gold">
                  <th className="p-2 text-left">Material</th>
                  <th className="p-2 text-left">Stock</th>
                  <th className="p-2 text-left">Próximo costo (FIFO)</th>
                  <th className="p-2 text-left">Lotes</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const stock = stockOf(lots, m.id);
                  return (
                    <tr key={m.id} className="border-b border-[#444]">
                      <td className="p-2">
                        {m.name}{" "}
                        <span
                          className={
                            "ml-1 rounded-full px-2 py-[2px] text-[10px] font-semibold text-white " +
                            (stock > 0 ? "bg-[#28a745]" : "bg-[#dc3545]")
                          }
                        >
                          {stock > 0 ? "Disponible" : "Sin stock"}
                        </span>
                        <span className="ml-2 text-[10px] text-gold-deep">{m.category}</span>
                      </td>
                      <td className="p-2">{stock} u.</td>
                      <td className="p-2">{formatCOP(nextCostOf(lots, m.id))}</td>
                      <td className="p-2 text-[10px] text-text-soft">
                        {lotsOf(lots, m.id).map((l) => (
                          <div key={l.id}>
                            {supplierName(l.supplier_id)}: {l.qty_remaining}/{l.qty_original} u. a{" "}
                            {formatCOP(l.unit_cost)} ({l.lot_date})
                          </div>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="k-card">
        <h2 className="mb-3 border-b-2 border-gold pb-2 text-[14px] font-bold text-gold">
          🧾 Facturas cargadas
        </h2>
        {invoices.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-text-soft">Sin facturas cargadas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b-2 border-gold bg-[#3a3a3a] text-gold">
                  <th className="p-2 text-left">Proveedor</th>
                  <th className="p-2 text-left">N° Factura</th>
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#444]">
                    <td className="p-2">{inv.supplier || supplierName(inv.supplier_id)}</td>
                    <td className="p-2">{inv.invoice_number}</td>
                    <td className="p-2">
                      {inv.invoice_date ?? new Date(inv.created_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="p-2">{formatCOP(inv.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
