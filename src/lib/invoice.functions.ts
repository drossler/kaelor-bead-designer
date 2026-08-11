import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ParseInput = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  fileData: z.string().min(1), // base64 (sin prefijo data:)
});

export type ParsedInvoiceItem = {
  name: string;
  qty: number;
  unit_cost: number;
  unit: string;
};

export type ParsedInvoice = {
  invoice_number: string;
  supplier: string;
  invoice_date: string | null;
  items: ParsedInvoiceItem[];
};

const PROMPT = `Eres un asistente de inventario de una joyería colombiana.
Analiza esta factura de proveedor y devuelve json con esta forma exacta:
{
  "invoice_number": "número de la factura tal como aparece",
  "supplier": "nombre del proveedor",
  "invoice_date": "YYYY-MM-DD o null",
  "items": [
    { "name": "nombre del material", "qty": 10, "unit_cost": 3500, "unit": "unidad" }
  ]
}
Reglas:
- unit_cost es el costo por unidad en pesos colombianos (número, sin símbolos ni puntos de miles).
- Si solo aparece el valor total de la línea, divide por la cantidad.
- Normaliza nombres de balines al formato "3MM Italy", "4MM Italy", "5MM Italy", "6MM Italy", "8MM Italy", "6MM Neopreno" cuando corresponda.
- Incluye también insumos como hilos, macramé, herrajes, broches.
- Responde únicamente con el json, sin texto adicional.`;

export const parseInvoicePdf = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ParseInput.parse(input))
  .handler(async ({ data }): Promise<ParsedInvoice> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Falta la clave de IA en el servidor");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "file",
                file: {
                  filename: data.filename,
                  file_data: `data:${data.mimeType};base64,${data.fileData}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Demasiadas solicitudes de IA, intenta en un momento");
    if (res.status === 402) throw new Error("Se agotaron los créditos de IA del espacio de trabajo");
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`No se pudo leer la factura: ${detail.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("La IA no devolvió un resultado legible. Intenta con otra factura.");
    }

    const Shape = z.object({
      invoice_number: z.union([z.string(), z.number()]).nullish(),
      supplier: z.string().nullish(),
      invoice_date: z.string().nullish(),
      items: z
        .array(
          z.object({
            name: z.string().nullish(),
            qty: z.union([z.string(), z.number()]).nullish(),
            unit_cost: z.union([z.string(), z.number()]).nullish(),
            unit: z.string().nullish(),
          }),
        )
        .nullish(),
    });

    const out = Shape.parse(parsed);
    const num = (v: unknown) => {
      const n = Number(String(v ?? "").replace(/[^0-9.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    };

    return {
      invoice_number: String(out.invoice_number ?? "").trim(),
      supplier: (out.supplier ?? "").trim(),
      invoice_date:
        out.invoice_date && /^\d{4}-\d{2}-\d{2}$/.test(out.invoice_date) ? out.invoice_date : null,
      items: (out.items ?? [])
        .map((i) => ({
          name: (i.name ?? "").trim(),
          qty: num(i.qty),
          unit_cost: num(i.unit_cost),
          unit: (i.unit ?? "unidad").trim() || "unidad",
        }))
        .filter((i) => i.name.length > 0),
    };
  });
