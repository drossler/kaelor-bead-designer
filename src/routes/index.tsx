import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KaelorProvider, useKaelor } from "@/hooks/useKaelorData";
import { CalculadoraTab } from "@/components/kaelor/CalculadoraTab";
import { FacturaTab } from "@/components/kaelor/FacturaTab";
import { InventarioTab } from "@/components/kaelor/InventarioTab";
import { HistorialTab } from "@/components/kaelor/HistorialTab";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KAELOR Joyería · Calculadora e Inventario FIFO" },
      {
        name: "description",
        content:
          "Calculadora de manillas personalizadas con inventario FIFO por proveedor, carga de facturas PDF y control de stock en tiempo real.",
      },
      { property: "og:title", content: "KAELOR Joyería · Calculadora e Inventario" },
      {
        property: "og:description",
        content:
          "Materiales por categoría, lotes FIFO por factura, costos reales y precio de venta al instante.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <KaelorProvider>
      <KaelorApp />
    </KaelorProvider>
  ),
});

const TABS = [
  { id: "calc", label: "🧮 Calculadora" },
  { id: "factura", label: "📥 Cargar Factura" },
  { id: "inventario", label: "📦 Inventario" },
  { id: "historial", label: "📝 Manillas Guardadas" },
] as const;

function KaelorApp() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("calc");
  const { loading, error } = useKaelor();

  return (
    <div className="min-h-screen bg-ink p-3 font-sans text-white md:p-4">
      <div className="mx-auto max-w-[1300px]">
        <header className="mb-4 flex flex-col items-center gap-3 rounded-lg border-b-[3px] border-gold bg-gradient-to-br from-ink to-[#2d2d2d] px-5 py-6 text-center">
          <img
            src={logoAsset.url}
            alt="Logo KAELOR Joyería"
            className="h-16 w-16 rounded-full object-cover md:h-20 md:w-20"
          />
          <div>
            <h1 className="font-display text-[28px] font-bold italic text-gold md:text-[32px]">
              KAELOR Joyería
            </h1>
            <p className="mt-1 text-[12px] text-gold-deep">
              Calculadora + Inventario FIFO por proveedor
            </p>
          </div>
        </header>

        <nav className="mb-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={tab === t.id}
              onClick={() => setTab(t.id)}
              className={
                "min-w-[110px] flex-1 cursor-pointer rounded-md border-2 border-gold px-3 py-3 text-[12px] font-semibold transition-all duration-200 md:text-[13px] " +
                (tab === t.id ? "bg-gold text-ink" : "bg-surface text-gold")
              }
            >
              {t.label}
            </button>
          ))}
        </nav>

        {error && (
          <p className="mb-3 rounded-md border-l-4 border-red-500 bg-[#3a1a1a] p-3 text-[12px] text-red-300">
            {error}
          </p>
        )}
        {loading && <p className="mb-3 text-[12px] text-gold">Cargando inventario…</p>}

        {tab === "calc" && <CalculadoraTab />}
        {tab === "factura" && <FacturaTab />}
        {tab === "inventario" && <InventarioTab />}
        {tab === "historial" && <HistorialTab />}
      </div>
    </div>
  );
}
