import { useMemo, useState } from "react";
import { formatCOP, PATTERNS, patternLabel, type Pattern } from "@/lib/kaelor";
import { useKaelor } from "@/hooks/useKaelorData";
import {
  CATEGORY_ICON,
  CATEGORY_ORDER,
  fifoCost,
  nextCostOf,
  saveBraceletFifo,
  stockOf,
  type Material,
} from "@/lib/inventory";

const MACRAME_PRICE = 12000;
const RETORNO = 2;

type CartLine = { materialId: string; qty: number };
type Extra = { id: string; name: string; price: number; qty: number };

export function CalculadoraTab() {
  const { materials, lots, reload } = useKaelor();
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pattern, setPattern] = useState<Pattern>("sencillo");
  const [macrame, setMacrame] = useState(true);
  const [macramePrice, setMacramePrice] = useState(MACRAME_PRICE);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [extraName, setExtraName] = useState("");
  const [extraPrice, setExtraPrice] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const query = search.trim().toLowerCase();

  const groups = useMemo(() => {
    const filtered = materials.filter((m) => !query || m.name.toLowerCase().includes(query));
    const map = new Map<string, Material[]>();
    for (const m of filtered) {
      const arr = map.get(m.category) ?? [];
      arr.push(m);
      map.set(m.category, arr);
    }
    return [...map.entries()].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]),
    );
  }, [materials, query]);

  const materialById = (id: string) => materials.find((m) => m.id === id);

  const cartCost = cart.reduce((s, c) => s + fifoCost(lots, c.materialId, c.qty), 0);
  const extrasTotal = extras.reduce((s, e) => s + e.price * e.qty, 0);
  const costTotal = cartCost + (macrame ? macramePrice : 0) + extrasTotal;
  const salePrice = Math.round(costTotal * RETORNO);
  const profit = salePrice - costTotal;

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(null), 2200);
  };

  const addToCart = (m: Material) => {
    const qty = Math.max(0, parseInt(qtyInputs[m.id] || "0", 10) || 0);
    if (qty <= 0) {
      flash("Ingresa una cantidad mayor a 0");
      return;
    }
    const available = stockOf(lots, m.id);
    const already = cart.find((c) => c.materialId === m.id)?.qty ?? 0;
    if (already + qty > available) {
      setErr(
        `Stock insuficiente de ${m.name}. Disponible: ${available} u. (ya tienes ${already} en el carrito)`,
      );
      return;
    }
    setErr(null);
    setCart((p) =>
      p.some((c) => c.materialId === m.id)
        ? p.map((c) => (c.materialId === m.id ? { ...c, qty: c.qty + qty } : c))
        : [...p, { materialId: m.id, qty }],
    );
    setQtyInputs((p) => ({ ...p, [m.id]: "" }));
    flash(`✅ ${qty}× ${m.name} agregados`);
  };

  const removeLine = (id: string) => setCart((p) => p.filter((c) => c.materialId !== id));

  const addExtra = () => {
    const name = extraName.trim();
    if (!name) {
      flash("Escribe el nombre del insumo");
      return;
    }
    const price = parseInt(extraPrice.replace(/[^0-9]/g, "") || "0", 10);
    setExtras((p) => [...p, { id: `${Date.now()}`, name, price, qty: 1 }]);
    setExtraName("");
    setExtraPrice("");
  };

  const clearCart = () => {
    setCart([]);
    setExtras([]);
    setErr(null);
  };

  const save = async () => {
    if (cart.length === 0 || saving) return;
    setErr(null);
    setSaving(true);
    try {
      const composition =
        cart.map((c) => `${c.qty}× ${materialById(c.materialId)?.name ?? "?"}`).join(" + ") +
        (macrame ? " + Macramé" : "") +
        (extras.length > 0 ? ` + ${extras.map((e) => `${e.qty}× ${e.name}`).join(" + ")}` : "");

      await saveBraceletFifo({
        composition,
        pattern: patternLabel(pattern),
        extraCost: (macrame ? macramePrice : 0) + extrasTotal,
        multiplier: RETORNO,
        items: cart.map((c) => ({ material_id: c.materialId, qty: c.qty })),
      });
      clearCart();
      await reload();
      flash("✅ Manilla guardada · stock descontado (FIFO)");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo guardar la manilla");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {msg && (
        <div
          role="status"
          className="k-fade-in fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-md border-2 border-gold bg-surface px-4 py-2 text-[13px] shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          {msg}
        </div>
      )}

      <section className="flex flex-col gap-4">
        <div className="k-card">
          <h2 className="mb-3 border-b-2 border-gold pb-2 text-[14px] font-bold text-gold">
            🔎 Buscar material (con stock disponible)
          </h2>
          <input
            aria-label="Buscar material"
            placeholder="Escribe para buscar… ej: balín 3mm"
            className="k-input mb-3 w-full text-[13px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {materials.length === 0 && (
            <p className="py-4 text-center text-[12px] text-text-soft">
              Aún no has cargado ninguna factura.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {groups.map(([cat, list]) => {
              const open = query.length > 0 || openCats[cat] === true;
              return (
                <div key={cat} className="overflow-hidden rounded-md border-2 border-gold">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenCats((p) => ({ ...p, [cat]: !open }))}
                    className="flex w-full cursor-pointer items-center justify-between bg-surface px-3 py-[10px] text-left text-[13px] font-semibold text-gold"
                  >
                    <span>
                      {open ? "▾" : "▸"} {CATEGORY_ICON[cat] ?? "📦"} {cat}
                    </span>
                    <span className="text-[11px] font-normal text-gold-deep">({list.length})</span>
                  </button>
                  {open && (
                    <div className="flex flex-col gap-2 bg-ink p-2">
                      {list.map((m) => {
                        const stock = stockOf(lots, m.id);
                        const cost = nextCostOf(lots, m.id);
                        return (
                          <div
                            key={m.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-gold bg-surface px-3 py-2"
                          >
                            <div>
                              <p className="text-[12px] font-semibold text-gold">{m.name}</p>
                              <p className="text-[10px] text-gold-deep">
                                Stock: {stock} u. · Costo: {formatCOP(cost)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                aria-label={`Cantidad de ${m.name}`}
                                className="k-input w-[70px] text-[12px]"
                                value={qtyInputs[m.id] ?? ""}
                                onChange={(e) =>
                                  setQtyInputs((p) => ({
                                    ...p,
                                    [m.id]: e.target.value.replace(/[^0-9]/g, ""),
                                  }))
                                }
                              />
                              <button
                                type="button"
                                disabled={stock <= 0}
                                onClick={() => addToCart(m)}
                                className="k-btn px-3 py-2 text-[11px] disabled:opacity-40"
                              >
                                + Agregar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="k-card">
          <h2 className="mb-3 border-b-2 border-gold pb-2 text-[14px] font-bold text-gold">
            🧵 Insumos adicionales
          </h2>
          <div className="flex items-center gap-3 rounded-md border-l-[3px] border-gold bg-surface px-3 py-2 text-[13px]">
            <input
              type="checkbox"
              checked={macrame}
              onChange={(e) => setMacrame(e.target.checked)}
              aria-label="Rollo Celular o Macramé"
              className="h-4 w-4 cursor-pointer accent-[#FFD700]"
            />
            <span className="flex-1">Rollo Celular / Macramé</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              aria-label="Costo del macramé"
              className="k-input w-[110px] text-[12px]"
              value={macramePrice}
              onChange={(e) =>
                setMacramePrice(parseInt(e.target.value.replace(/[^0-9]/g, "") || "0", 10))
              }
            />
          </div>

          <div className="mt-2 flex flex-col gap-2">
            {extras.map((ex) => (
              <div key={ex.id} className="flex items-center gap-2">
                <input
                  aria-label="Nombre del insumo"
                  className="k-input flex-1 text-[12px]"
                  value={ex.name}
                  onChange={(e) =>
                    setExtras((p) =>
                      p.map((x) => (x.id === ex.id ? { ...x, name: e.target.value } : x)),
                    )
                  }
                />
                <input
                  type="number"
                  min={1}
                  aria-label={`Cantidad de ${ex.name}`}
                  className="k-input w-[70px] text-[12px]"
                  value={ex.qty}
                  onChange={(e) =>
                    setExtras((p) =>
                      p.map((x) =>
                        x.id === ex.id ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x,
                      ),
                    )
                  }
                />
                <input
                  type="number"
                  min={0}
                  aria-label={`Costo de ${ex.name}`}
                  className="k-input w-[110px] text-[12px]"
                  value={ex.price}
                  onChange={(e) =>
                    setExtras((p) =>
                      p.map((x) =>
                        x.id === ex.id
                          ? { ...x, price: parseInt(e.target.value.replace(/[^0-9]/g, "") || "0", 10) }
                          : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label={`Quitar ${ex.name}`}
                  onClick={() => setExtras((p) => p.filter((x) => x.id !== ex.id))}
                  className="cursor-pointer px-2 text-gold hover:text-gold-bright"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Nombre del nuevo insumo"
              placeholder="Ej: Herrajes"
              className="k-input flex-1 text-[12px]"
              value={extraName}
              onChange={(e) => setExtraName(e.target.value)}
            />
            <input
              type="number"
              min={0}
              placeholder="Costo"
              aria-label="Costo del nuevo insumo"
              className="k-input w-full text-[12px] sm:w-[110px]"
              value={extraPrice}
              onChange={(e) => setExtraPrice(e.target.value.replace(/[^0-9]/g, ""))}
            />
            <button type="button" onClick={addExtra} className="k-btn px-3 py-2 text-[12px]">
              + Agregar
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="k-card">
          <h2 className="mb-3 border-b-2 border-gold pb-2 text-[14px] font-bold text-gold">
            🎨 Patrón
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PATTERNS.map((p) => {
              const active = pattern === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  title={p.tip}
                  onClick={() => setPattern(p.id)}
                  className={
                    "cursor-pointer rounded-md border-2 border-gold px-3 py-2 text-[12px] font-semibold transition-all duration-300 " +
                    (active
                      ? "bg-gradient-to-br from-gold to-gold-deep text-ink"
                      : "bg-surface text-white")
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="k-card">
          <h2 className="mb-3 border-b-2 border-gold pb-2 text-[14px] font-bold text-gold">
            💰 Resumen
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Costo", value: formatCOP(costTotal) },
              { label: "Precio (100%)", value: formatCOP(salePrice) },
              { label: "Ganancia", value: formatCOP(profit), green: true },
              { label: "Margen", value: "100%" },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-md border-2 border-gold bg-gradient-to-br from-[#3a3a3a] to-[#4a4a4a] p-3 text-center"
              >
                <p className="mb-1 text-[10px] uppercase tracking-wide text-gold-deep">{c.label}</p>
                <p
                  className="text-[18px] font-bold"
                  style={{ color: c.green ? "#28a745" : "#FFD700" }}
                >
                  {c.value}
                </p>
              </div>
            ))}
          </div>

          {err && (
            <p className="mt-3 rounded-md border-l-4 border-red-500 bg-[#3a1a1a] p-3 text-[12px] text-red-300">
              {err}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={clearCart}
              className="cursor-pointer rounded-md bg-[#6c757d] px-4 py-[10px] text-[13px] font-semibold text-white"
            >
              🗑️ Limpiar
            </button>
            <button
              type="button"
              disabled={cart.length === 0 || saving}
              onClick={() => void save()}
              className="k-btn py-[10px] text-[13px] disabled:opacity-40"
            >
              {saving ? "Guardando…" : "💾 Guardar manilla"}
            </button>
          </div>
        </div>

        <div className="k-card">
          <h2 className="mb-3 border-b-2 border-gold pb-2 text-[14px] font-bold text-gold">
            🛒 Carrito actual
          </h2>
          {cart.length === 0 && (
            <p className="py-4 text-center text-[12px] text-text-soft">Carrito vacío</p>
          )}
          <div className="flex flex-col gap-2">
            {cart.map((c) => {
              const m = materialById(c.materialId);
              if (!m) return null;
              return (
                <div
                  key={c.materialId}
                  className="flex items-center justify-between rounded-md border-l-[3px] border-gold bg-surface px-3 py-2 text-[12px]"
                >
                  <div>
                    <p className="font-semibold text-gold">
                      {c.qty}× {m.name}
                    </p>
                    <p className="text-[11px] text-gold-deep">
                      {formatCOP(fifoCost(lots, c.materialId, c.qty))}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Quitar ${m.name}`}
                    onClick={() => removeLine(c.materialId)}
                    className="cursor-pointer rounded bg-[#dc3545] px-2 py-1 text-[11px] text-white"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            {macrame && (
              <p className="text-[11px] text-text-soft">
                + Rollo Celular / Macramé ({formatCOP(macramePrice)})
              </p>
            )}
            {extras.map((e) => (
              <p key={e.id} className="text-[11px] text-text-soft">
                + {e.qty}× {e.name} ({formatCOP(e.price * e.qty)})
              </p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
