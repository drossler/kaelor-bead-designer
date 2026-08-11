import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BEAD_TYPES,
  MACRAME_PRICE,
  PATTERNS,
  formatCOP,
  patternLabel,
  type CartItem,
  type Pattern,
} from "@/lib/kaelor";
import {
  deleteBracelet,
  fetchBracelets,
  fetchMaterials,
  findMaterial,
  saveBraceletWithStock,
  type BraceletRow,
  type Material,
} from "@/lib/inventory";

export const MACRAME_MATERIAL = "Rollo Celular/Macramé";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KAELOR Joyería · Calculadora de Manillas Personalizadas" },
      {
        name: "description",
        content:
          "Diseña manillas personalizadas con balines italianos, calcula costos, precio de venta y descuenta el inventario en tiempo real.",
      },
      { property: "og:title", content: "KAELOR Joyería · Calculadora de Manillas" },
      {
        property: "og:description",
        content:
          "Configura balines, patrones y macramé, y obtén costo, precio de venta y ganancia al instante.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Extra = { id: string; name: string; price: number; qty: number };

function Index() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [pattern, setPattern] = useState<Pattern>("sencillo");
  const [macrame, setMacrame] = useState(true);
  const [macramePrice, setMacramePrice] = useState<number>(MACRAME_PRICE);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [extraName, setExtraName] = useState("");
  const [extraPrice, setExtraPrice] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<BraceletRow[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [m, b] = await Promise.all([fetchMaterials(), fetchBracelets()]);
      setMaterials(m);
      setHistory(b);
      const mac = findMaterial(m, MACRAME_MATERIAL);
      if (mac) setMacramePrice(mac.unit_cost);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error cargando inventario");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const priceOf = useCallback(
    (name: string, fallback: number) => {
      const m = findMaterial(materials, name);
      return m && m.unit_cost > 0 ? m.unit_cost : fallback;
    },
    [materials],
  );

  const stockOf = useCallback(
    (name: string) => findMaterial(materials, name)?.stock ?? null,
    [materials],
  );

  const totalBeads = useMemo(() => cart.reduce((s, c) => s + c.qty, 0), [cart]);

  const beadsCost = useMemo(
    () =>
      cart.reduce((s, c) => {
        const t = BEAD_TYPES.find((b) => b.id === c.typeId);
        if (!t) return s;
        return s + c.qty * priceOf(t.name, t.price);
      }, 0),
    [cart, priceOf],
  );

  const extrasTotal = useMemo(
    () => extras.reduce((s, e) => s + (Number.isFinite(e.price) ? e.price * e.qty : 0), 0),
    [extras],
  );

  const costTotal = beadsCost + (macrame ? macramePrice : 0) + extrasTotal;
  const salePrice = costTotal * 2;
  const profit = salePrice - costTotal;

  const flash = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const addBead = (typeId: string) => {
    const raw = qtyInputs[typeId] ?? "";
    const qty = Math.min(200, Math.max(0, parseInt(raw || "0", 10) || 0));
    if (qty <= 0) {
      flash("Ingresa una cantidad mayor a 0");
      return;
    }
    setCart((prev) => {
      const found = prev.find((c) => c.typeId === typeId);
      if (found)
        return prev.map((c) => (c.typeId === typeId ? { ...c, qty: c.qty + qty } : c));
      return [...prev, { typeId, qty }];
    });
    setQtyInputs((p) => ({ ...p, [typeId]: "" }));
    flash(`✅ ${qty}× ${typeId} agregados`);
  };

  const compositionText = () =>
    cart
      .filter((c) => c.qty > 0)
      .map((c) => `${c.qty}×${c.typeId}`)
      .join(" + ");

  const addExtra = () => {
    const name = extraName.trim();
    const price = parseInt(extraPrice.replace(/[^0-9]/g, "") || "0", 10);
    if (!name) {
      flash("Escribe el nombre del insumo");
      return;
    }
    setExtras((p) => [
      ...p,
      { id: `${Date.now()}`, name, price: price || priceOf(name, 0), qty: 1 },
    ]);
    setExtraName("");
    setExtraPrice("");
    flash(`✅ ${name} agregado`);
  };

  const updateExtra = (id: string, patch: Partial<Extra>) =>
    setExtras((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const removeExtra = (id: string) => setExtras((p) => p.filter((e) => e.id !== id));

  const clearAll = () => {
    if (totalBeads === 0 && extras.length === 0) return;
    if (!window.confirm("¿Seguro que deseas limpiar la manilla actual?")) return;
    setCart([]);
    setPattern("sencillo");
    setMacrame(true);
    setExtras([]);
    setErrorMsg(null);
    flash("Composición limpiada");
  };

  const save = async () => {
    if (totalBeads === 0 || saving) return;
    setErrorMsg(null);

    const needed: { name: string; qty: number }[] = [];
    for (const c of cart) {
      const t = BEAD_TYPES.find((b) => b.id === c.typeId);
      if (t && c.qty > 0) needed.push({ name: t.name, qty: c.qty });
    }
    if (macrame) needed.push({ name: MACRAME_MATERIAL, qty: 1 });
    for (const ex of extras) needed.push({ name: ex.name, qty: ex.qty });

    const missing: string[] = [];
    const short: string[] = [];
    const items: { material_id: string; qty: number }[] = [];

    for (const n of needed) {
      const m = findMaterial(materials, n.name);
      if (!m) {
        missing.push(n.name);
        continue;
      }
      if (m.stock < n.qty) short.push(`${m.name} (hay ${m.stock}, necesitas ${n.qty})`);
      const existing = items.find((i) => i.material_id === m.id);
      if (existing) existing.qty += n.qty;
      else items.push({ material_id: m.id, qty: n.qty });
    }

    if (missing.length > 0) {
      setErrorMsg(
        `Estos materiales no existen en el inventario: ${missing.join(", ")}. Cárgalos con una factura.`,
      );
      return;
    }
    if (short.length > 0) {
      setErrorMsg(`Stock insuficiente: ${short.join(" · ")}`);
      return;
    }

    setSaving(true);
    try {
      await saveBraceletWithStock({
        composition: compositionText(),
        pattern: patternLabel(pattern),
        cost: costTotal,
        price: salePrice,
        items,
      });
      setCart([]);
      setExtras([]);
      await reload();
      flash("✅ Manilla guardada y stock descontado");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "No se pudo guardar la manilla");
    } finally {
      setSaving(false);
    }
  };

  const removeSaved = async (id: string) => {
    try {
      await deleteBracelet(id);
      setHistory((p) => p.filter((h) => h.id !== id));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  return (
    <div className="min-h-screen bg-ink font-sans text-white">
      <header className="border-b-[3px] border-gold bg-ink px-5 py-6 text-center md:py-[30px]">
        <h1
          className="bg-gradient-to-r from-gold to-gold-deep bg-clip-text font-display text-[27px] font-bold text-transparent md:text-[32px]"
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
        >
          KAELOR
        </h1>
        <p className="mt-1 text-[12px] tracking-[0.35em] text-gold-deep">JOYERÍA</p>
        <Link to="/inventario" className="mt-3 inline-block text-[12px] text-gold underline">
          Inventario y facturas →
        </Link>
      </header>

      {feedback && (
        <div
          role="status"
          className="k-fade-in fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-md border-2 border-gold bg-surface px-4 py-2 text-[13px] shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          {feedback}
        </div>
      )}

      <main className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 p-3 md:p-5 lg:grid-cols-2">
        {/* PANEL IZQUIERDO */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-[18px] text-gold md:text-[21px]">Selectores</h2>

          <div className="k-card k-fade-in">
            <h3 className="mb-3 text-[13px] font-semibold tracking-wide text-gold">BALINÉS</h3>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {BEAD_TYPES.map((b) => {
                const stock = stockOf(b.name);
                return (
                  <div
                    key={b.id}
                    className="rounded-lg border-2 border-gold bg-surface p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)]"
                  >
                    <p className="text-[12px] font-semibold md:text-[13px]">{b.name}</p>
                    <p className="text-[12px] text-gold">{formatCOP(priceOf(b.name, b.price))}</p>
                    <p className="text-[11px] text-text-soft">
                      Stock: {stock === null ? "—" : stock}
                    </p>
                    <div
                      className="my-2 h-[6px] w-full rounded-full"
                      style={{ background: b.color }}
                      aria-hidden="true"
                    />
                    <input
                      type="number"
                      min={0}
                      max={200}
                      inputMode="numeric"
                      aria-label={`Cantidad de ${b.name}`}
                      className="k-input w-full text-[12px]"
                      value={qtyInputs[b.id] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, "");
                        setQtyInputs((p) => ({ ...p, [b.id]: v }));
                      }}
                    />
                    <button
                      type="button"
                      aria-label={`Agregar ${b.name}`}
                      onClick={() => addBead(b.id)}
                      className="k-btn mt-2 w-full px-2 py-2 text-[12px]"
                    >
                      + Agregar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="k-card k-fade-in">
            <h3 className="mb-3 text-[13px] font-semibold tracking-wide text-gold">PATRÓN</h3>
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
                    aria-label={`Patrón ${p.label}: ${p.tip}`}
                    onClick={() => setPattern(p.id)}
                    className={
                      "cursor-pointer rounded-md border-2 border-gold px-3 py-2 text-[12px] font-semibold transition-all duration-300 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] " +
                      (active
                        ? "bg-gradient-to-br from-gold to-gold-deep text-ink shadow-[0_6px_18px_rgba(212,175,55,0.45)]"
                        : "bg-surface text-white")
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="k-card k-fade-in">
            <h3 className="mb-3 text-[13px] font-semibold tracking-wide text-gold">
              INSUMOS ADICIONALES
            </h3>
            <div className="flex items-center gap-3 text-[13px]">
              <input
                type="checkbox"
                checked={macrame}
                onChange={(e) => setMacrame(e.target.checked)}
                aria-label="Rollo Celular o Macramé"
                className="h-5 w-5 cursor-pointer accent-[#FFD700]"
              />
              <span className="flex-1">
                {MACRAME_MATERIAL}
                <span className="ml-2 text-[11px] text-text-soft">
                  Stock: {stockOf(MACRAME_MATERIAL) ?? "—"}
                </span>
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label="Precio de Rollo Celular o Macramé"
                className="k-input w-[110px] text-[12px]"
                value={macramePrice}
                onChange={(e) =>
                  setMacramePrice(parseInt(e.target.value.replace(/[^0-9]/g, "") || "0", 10))
                }
              />
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {extras.map((ex) => (
                <div key={ex.id} className="flex items-center gap-2 text-[13px]">
                  <input
                    aria-label="Nombre del insumo"
                    className="k-input flex-1 text-[12px]"
                    value={ex.name}
                    onChange={(e) => updateExtra(ex.id, { name: e.target.value })}
                  />
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    aria-label={`Cantidad de ${ex.name}`}
                    className="k-input w-[70px] text-[12px]"
                    value={ex.qty}
                    onChange={(e) =>
                      updateExtra(ex.id, { qty: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    aria-label={`Precio de ${ex.name}`}
                    className="k-input w-[110px] text-[12px]"
                    value={ex.price}
                    onChange={(e) =>
                      updateExtra(ex.id, {
                        price: parseInt(e.target.value.replace(/[^0-9]/g, "") || "0", 10),
                      })
                    }
                  />
                  <button
                    type="button"
                    aria-label={`Eliminar ${ex.name}`}
                    onClick={() => removeExtra(ex.id)}
                    className="cursor-pointer px-2 text-gold hover:text-gold-bright"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                aria-label="Nombre del nuevo insumo"
                placeholder="Ej: Herrajes"
                list="materiales-inventario"
                className="k-input flex-1 text-[12px]"
                value={extraName}
                onChange={(e) => setExtraName(e.target.value)}
              />
              <datalist id="materiales-inventario">
                {materials.map((m) => (
                  <option key={m.id} value={m.name} />
                ))}
              </datalist>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Costo"
                aria-label="Precio del nuevo insumo"
                className="k-input w-full text-[12px] sm:w-[110px]"
                value={extraPrice}
                onChange={(e) => setExtraPrice(e.target.value.replace(/[^0-9]/g, ""))}
              />
              <button type="button" onClick={addExtra} className="k-btn px-3 py-2 text-[12px]">
                + Agregar insumo
              </button>
            </div>
          </div>

          <div className="k-fade-in grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Costo Total", value: formatCOP(costTotal) },
              { label: "Precio Venta (100%)", value: formatCOP(salePrice) },
              { label: "Ganancia", value: formatCOP(profit), green: true },
              { label: "Margen", value: "100%" },
            ].map((c) => (
              <div
                key={c.label}
                className="k-glow rounded-md border-l-[5px] border-gold bg-gradient-to-br from-[#f0f9ff] to-[#e8f8f5] p-3 transition-all duration-300"
              >
                <p className="text-[11px] font-semibold text-ink">{c.label}</p>
                <p
                  className="text-[20px] font-bold md:text-[24px]"
                  style={{ color: c.green ? "#2e7d32" : "#D4AF37" }}
                >
                  {c.value}
                </p>
              </div>
            ))}
          </div>

          {errorMsg && (
            <p className="rounded-md border-2 border-red-500 bg-surface p-3 text-[12px] text-red-400">
              {errorMsg}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={clearAll}
              aria-label="Limpiar composición"
              className="k-btn w-full py-[10px] text-[14px] sm:flex-1"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={totalBeads === 0 || saving}
              aria-label="Guardar manilla"
              className="k-btn w-full py-[10px] text-[14px] sm:flex-1"
            >
              {saving ? "Guardando…" : "Guardar y descontar stock"}
            </button>
          </div>
        </section>

        {/* PANEL DERECHO */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-[18px] text-gold md:text-[21px]">Resumen</h2>

          <div className="k-fade-in border-l-[3px] border-gold bg-surface p-[15px] text-[12px] text-text-soft">
            <h3 className="mb-2 text-[12px] font-semibold tracking-wide text-gold">COMPOSICIÓN</h3>
            {cart.length === 0 && <p>Sin balinés seleccionados.</p>}
            {cart.map((c) => {
              const t = BEAD_TYPES.find((b) => b.id === c.typeId);
              if (!t) return null;
              return (
                <p key={c.typeId}>
                  <span className="text-gold">{c.qty}×</span> {t.name} (
                  {formatCOP(priceOf(t.name, t.price))} c/u)
                </p>
              );
            })}
            {macrame && (
              <p>
                <span className="text-gold">1×</span> {MACRAME_MATERIAL} ({formatCOP(macramePrice)})
              </p>
            )}
            {extras.map((ex) => (
              <p key={ex.id}>
                <span className="text-gold">{ex.qty}×</span> {ex.name} ({formatCOP(ex.price)})
              </p>
            ))}

            <div className="my-2 h-px bg-gold" />
            <p>
              Total de balinés: <span className="text-gold">{totalBeads}</span>
            </p>
            <p>
              Patrón seleccionado: <span className="text-gold">{patternLabel(pattern)}</span>
            </p>
          </div>

          <div className="k-fade-in flex flex-col gap-2">
            <h3 className="text-[13px] font-semibold tracking-wide text-gold">HISTORIAL</h3>
            {history.length === 0 && (
              <p className="text-[11px] text-text-soft">Aún no hay manillas guardadas.</p>
            )}
            {history.slice(0, 5).map((h) => (
              <div
                key={h.id}
                className="relative border-l-[3px] border-gold bg-surface p-3 pr-8 text-[11px] text-text-soft transition-all duration-300 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
              >
                <button
                  type="button"
                  aria-label="Eliminar manilla guardada"
                  onClick={() => void removeSaved(h.id)}
                  className="absolute right-2 top-2 cursor-pointer text-gold transition-all duration-300 hover:text-gold-bright"
                >
                  ✕
                </button>
                <p className="text-white">{h.composition}</p>
                <p>
                  <span className="text-gold">{formatCOP(h.cost)}</span> →{" "}
                  <span className="text-gold">{formatCOP(h.price)}</span>
                </p>
                <p>
                  +{formatCOP(h.profit)} ({h.pattern})
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
