-- Suppliers
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX suppliers_name_lower_idx ON public.suppliers (lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO anon, authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY suppliers_all ON public.suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Category on materials
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Otros Materiales';

CREATE OR REPLACE FUNCTION public.infer_category(p_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN lower(unaccent_simple) LIKE '%diamantad%' THEN 'Balines Diamantados'
    WHEN lower(unaccent_simple) LIKE '%italian%' OR lower(unaccent_simple) LIKE '%italy%' THEN 'Balines Italianos'
    WHEN lower(unaccent_simple) LIKE '%neopren%' THEN 'Neoprenos'
    WHEN lower(unaccent_simple) LIKE '%lisa%' OR lower(unaccent_simple) LIKE '%liso%' THEN 'Balines Lisa'
    WHEN lower(unaccent_simple) LIKE '%cruz%' OR lower(unaccent_simple) LIKE '%infinito%'
      OR lower(unaccent_simple) LIKE '%herraje%' OR lower(unaccent_simple) LIKE '%clover%'
      OR lower(unaccent_simple) LIKE '%rx%' OR lower(unaccent_simple) LIKE '%luxury%'
      OR lower(unaccent_simple) LIKE '%cristal%' OR lower(unaccent_simple) LIKE '%dije%'
      OR lower(unaccent_simple) LIKE '%broche%' THEN 'Herrajes y Accesorios'
    WHEN lower(unaccent_simple) LIKE '%macram%' OR lower(unaccent_simple) LIKE '%rollo%'
      OR lower(unaccent_simple) LIKE '%hilo%' THEN 'Hilos y Macrame'
    WHEN lower(unaccent_simple) LIKE '%balin%' THEN 'Otros Balines'
    ELSE 'Otros Materiales'
  END
  FROM (SELECT translate(coalesce(p_name,''), 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN') AS unaccent_simple) s;
$$;

UPDATE public.materials SET category = public.infer_category(name);

-- Suppliers on invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_supplier_number_idx
  ON public.invoices (supplier_id, lower(invoice_number));

-- Lots (FIFO)
CREATE TABLE public.material_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  lot_date date NOT NULL DEFAULT current_date,
  qty_original numeric NOT NULL DEFAULT 0,
  qty_remaining numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX material_lots_material_idx ON public.material_lots (material_id, lot_date, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_lots TO anon, authenticated;
GRANT ALL ON public.material_lots TO service_role;
ALTER TABLE public.material_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY material_lots_all ON public.material_lots FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed lots from current stock
INSERT INTO public.suppliers (name) VALUES ('Inventario inicial') ON CONFLICT DO NOTHING;

INSERT INTO public.material_lots (material_id, supplier_id, lot_date, qty_original, qty_remaining, unit_cost)
SELECT m.id, (SELECT id FROM public.suppliers WHERE lower(name) = 'inventario inicial'),
       current_date, m.stock, m.stock, m.unit_cost
FROM public.materials m
WHERE m.stock > 0;

-- Apply invoice with lots
CREATE OR REPLACE FUNCTION public.apply_invoice_fifo(
  p_supplier_id uuid,
  p_invoice_number text,
  p_invoice_date date,
  p_items jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invoice_id uuid;
  v_supplier_name text;
  v_item jsonb;
  v_material_id uuid;
  v_name text;
  v_qty numeric;
  v_cost numeric;
  v_unit text;
  v_total numeric := 0;
BEGIN
  IF p_supplier_id IS NULL THEN
    RAISE EXCEPTION 'Selecciona un proveedor';
  END IF;
  SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = p_supplier_id;
  IF v_supplier_name IS NULL THEN
    RAISE EXCEPTION 'Proveedor no encontrado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoices
    WHERE supplier_id = p_supplier_id
      AND lower(invoice_number) = lower(trim(p_invoice_number))
  ) THEN
    RAISE EXCEPTION 'La factura % ya fue cargada para %', p_invoice_number, v_supplier_name;
  END IF;

  INSERT INTO public.invoices (invoice_number, supplier, supplier_id, invoice_date)
  VALUES (trim(p_invoice_number), v_supplier_name, p_supplier_id, coalesce(p_invoice_date, current_date))
  RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_name := trim(coalesce(v_item->>'name', ''));
    v_qty := coalesce((v_item->>'qty')::numeric, 0);
    v_cost := coalesce((v_item->>'unit_cost')::numeric, 0);
    v_unit := coalesce(nullif(trim(coalesce(v_item->>'unit','')), ''), 'unidad');
    v_material_id := nullif(v_item->>'material_id','')::uuid;
    CONTINUE WHEN (v_material_id IS NULL AND v_name = '') OR v_qty <= 0;

    IF v_material_id IS NULL THEN
      SELECT id INTO v_material_id FROM public.materials WHERE lower(name) = lower(v_name);
    END IF;
    IF v_material_id IS NULL THEN
      INSERT INTO public.materials (name, unit, unit_cost, stock, category)
      VALUES (v_name, v_unit, v_cost, 0, public.infer_category(v_name))
      RETURNING id INTO v_material_id;
    END IF;

    INSERT INTO public.material_lots (material_id, supplier_id, invoice_id, lot_date, qty_original, qty_remaining, unit_cost)
    VALUES (v_material_id, p_supplier_id, v_invoice_id, coalesce(p_invoice_date, current_date), v_qty, v_qty, v_cost);

    INSERT INTO public.invoice_items (invoice_id, material_id, qty, unit_cost)
    VALUES (v_invoice_id, v_material_id, v_qty, v_cost);

    UPDATE public.materials
      SET stock = stock + v_qty,
          unit_cost = CASE WHEN v_cost > 0 THEN v_cost ELSE unit_cost END
      WHERE id = v_material_id;

    v_total := v_total + (v_qty * v_cost);
  END LOOP;

  UPDATE public.invoices SET total = v_total WHERE id = v_invoice_id;
  RETURN v_invoice_id;
END;
$$;

-- Save bracelet consuming FIFO lots
CREATE OR REPLACE FUNCTION public.save_bracelet_fifo(
  p_composition text,
  p_pattern text,
  p_extra_cost numeric,
  p_multiplier numeric,
  p_items jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_item jsonb;
  v_material_id uuid;
  v_qty numeric;
  v_left numeric;
  v_take numeric;
  v_cost numeric := 0;
  v_price numeric;
  v_stock numeric;
  v_name text;
  v_lot record;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_material_id := (v_item->>'material_id')::uuid;
    v_qty := coalesce((v_item->>'qty')::numeric, 0);
    SELECT coalesce(sum(qty_remaining),0) INTO v_stock FROM public.material_lots WHERE material_id = v_material_id;
    SELECT name INTO v_name FROM public.materials WHERE id = v_material_id;
    IF v_name IS NULL THEN
      RAISE EXCEPTION 'Material no encontrado en inventario';
    END IF;
    IF v_stock < v_qty THEN
      RAISE EXCEPTION 'Stock insuficiente de %: disponible %, requerido %', v_name, v_stock, v_qty;
    END IF;
  END LOOP;

  INSERT INTO public.bracelets (composition, pattern, cost, price, profit)
  VALUES (coalesce(p_composition,''), coalesce(p_pattern,''), 0, 0, 0)
  RETURNING id INTO v_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_material_id := (v_item->>'material_id')::uuid;
    v_qty := coalesce((v_item->>'qty')::numeric, 0);
    v_left := v_qty;

    FOR v_lot IN
      SELECT id, qty_remaining, unit_cost FROM public.material_lots
      WHERE material_id = v_material_id AND qty_remaining > 0
      ORDER BY lot_date, created_at
    LOOP
      EXIT WHEN v_left <= 0;
      v_take := least(v_lot.qty_remaining, v_left);
      v_cost := v_cost + v_take * v_lot.unit_cost;
      UPDATE public.material_lots SET qty_remaining = qty_remaining - v_take WHERE id = v_lot.id;
      v_left := v_left - v_take;
    END LOOP;

    UPDATE public.materials SET stock = greatest(stock - v_qty, 0) WHERE id = v_material_id;
    INSERT INTO public.bracelet_items (bracelet_id, material_id, qty) VALUES (v_id, v_material_id, v_qty);
  END LOOP;

  v_cost := v_cost + coalesce(p_extra_cost, 0);
  v_price := round(v_cost * coalesce(nullif(p_multiplier,0), 2));

  UPDATE public.bracelets SET cost = v_cost, price = v_price, profit = v_price - v_cost WHERE id = v_id;
  RETURN v_id;
END;
$$;