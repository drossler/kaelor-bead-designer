CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  unit text NOT NULL DEFAULT 'unidad',
  unit_cost numeric NOT NULL DEFAULT 0,
  stock numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO anon, authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_all" ON public.materials FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  supplier text NOT NULL DEFAULT '',
  invoice_date date,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO anon, authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_all" ON public.invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  qty numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO anon, authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_items_all" ON public.invoice_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.bracelets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composition text NOT NULL DEFAULT '',
  pattern text NOT NULL DEFAULT '',
  cost numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bracelets TO anon, authenticated;
GRANT ALL ON public.bracelets TO service_role;
ALTER TABLE public.bracelets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bracelets_all" ON public.bracelets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.bracelet_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bracelet_id uuid NOT NULL REFERENCES public.bracelets(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  qty numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bracelet_items TO anon, authenticated;
GRANT ALL ON public.bracelet_items TO service_role;
ALTER TABLE public.bracelet_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bracelet_items_all" ON public.bracelet_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.apply_invoice(
  p_invoice_number text,
  p_supplier text,
  p_invoice_date date,
  p_items jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_item jsonb;
  v_material_id uuid;
  v_total numeric := 0;
  v_name text;
  v_qty numeric;
  v_cost numeric;
  v_unit text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.invoices WHERE lower(invoice_number) = lower(trim(p_invoice_number))) THEN
    RAISE EXCEPTION 'La factura % ya fue cargada', p_invoice_number;
  END IF;

  INSERT INTO public.invoices (invoice_number, supplier, invoice_date)
  VALUES (trim(p_invoice_number), coalesce(p_supplier, ''), p_invoice_date)
  RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_name := trim(v_item->>'name');
    v_qty := coalesce((v_item->>'qty')::numeric, 0);
    v_cost := coalesce((v_item->>'unit_cost')::numeric, 0);
    v_unit := coalesce(nullif(trim(coalesce(v_item->>'unit','')), ''), 'unidad');
    CONTINUE WHEN v_name IS NULL OR v_name = '' OR v_qty <= 0;

    SELECT id INTO v_material_id FROM public.materials WHERE lower(name) = lower(v_name);
    IF v_material_id IS NULL THEN
      INSERT INTO public.materials (name, unit, unit_cost, stock)
      VALUES (v_name, v_unit, v_cost, 0)
      RETURNING id INTO v_material_id;
    END IF;

    UPDATE public.materials
      SET stock = stock + v_qty,
          unit_cost = CASE WHEN v_cost > 0 THEN v_cost ELSE unit_cost END
      WHERE id = v_material_id;

    INSERT INTO public.invoice_items (invoice_id, material_id, qty, unit_cost)
    VALUES (v_invoice_id, v_material_id, v_qty, v_cost);

    v_total := v_total + (v_qty * v_cost);
  END LOOP;

  UPDATE public.invoices SET total = v_total WHERE id = v_invoice_id;
  RETURN v_invoice_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.apply_invoice(text, text, date, jsonb) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.save_bracelet(
  p_composition text,
  p_pattern text,
  p_cost numeric,
  p_price numeric,
  p_items jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_item jsonb;
  v_material_id uuid;
  v_qty numeric;
  v_stock numeric;
  v_name text;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_material_id := (v_item->>'material_id')::uuid;
    v_qty := coalesce((v_item->>'qty')::numeric, 0);
    SELECT stock, name INTO v_stock, v_name FROM public.materials WHERE id = v_material_id;
    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'Material no encontrado en inventario';
    END IF;
    IF v_stock < v_qty THEN
      RAISE EXCEPTION 'Stock insuficiente de %: disponible %, requerido %', v_name, v_stock, v_qty;
    END IF;
  END LOOP;

  INSERT INTO public.bracelets (composition, pattern, cost, price, profit)
  VALUES (coalesce(p_composition,''), coalesce(p_pattern,''), coalesce(p_cost,0), coalesce(p_price,0), coalesce(p_price,0) - coalesce(p_cost,0))
  RETURNING id INTO v_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_material_id := (v_item->>'material_id')::uuid;
    v_qty := coalesce((v_item->>'qty')::numeric, 0);
    UPDATE public.materials SET stock = stock - v_qty WHERE id = v_material_id;
    INSERT INTO public.bracelet_items (bracelet_id, material_id, qty) VALUES (v_id, v_material_id, v_qty);
  END LOOP;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.save_bracelet(text, text, numeric, numeric, jsonb) TO anon, authenticated, service_role;