import { useKaelor } from "@/hooks/useKaelorData";
import { deleteBracelet } from "@/lib/inventory";
import { formatCOP } from "@/lib/kaelor";

export function HistorialTab() {
  const { bracelets, reload } = useKaelor();

  const remove = async (id: string) => {
    await deleteBracelet(id);
    await reload();
  };

  return (
    <div className="k-card">
      <h2 className="mb-3 border-b-2 border-gold pb-2 text-[14px] font-bold text-gold">
        📝 Manillas guardadas
      </h2>
      {bracelets.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-text-soft">Sin manillas guardadas</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b-2 border-gold bg-[#3a3a3a] text-gold">
                <th className="p-2 text-left">Composición</th>
                <th className="p-2 text-left">Patrón</th>
                <th className="p-2 text-left">Costo</th>
                <th className="p-2 text-left">Precio</th>
                <th className="p-2 text-left">Ganancia</th>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {bracelets.map((b) => (
                <tr key={b.id} className="border-b border-[#444]">
                  <td className="p-2">{b.composition}</td>
                  <td className="p-2 text-gold-deep">{b.pattern}</td>
                  <td className="p-2">{formatCOP(b.cost)}</td>
                  <td className="p-2">{formatCOP(b.price)}</td>
                  <td className="p-2 text-[#28a745]">{formatCOP(b.profit)}</td>
                  <td className="p-2 text-[10px]">
                    {new Date(b.created_at).toLocaleString("es-CO")}
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      aria-label="Eliminar manilla"
                      onClick={() => void remove(b.id)}
                      className="cursor-pointer rounded bg-[#dc3545] px-2 py-1 text-[11px] text-white"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
