CREATE TABLE public.products (
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own products select" ON public.products FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Own products insert" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Own products update" ON public.products FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Own products delete" ON public.products FOR DELETE TO authenticated USING (auth.uid() = owner_id);