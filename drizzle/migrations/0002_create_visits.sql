CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  client_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('liq','cons')),
  units integer NOT NULL DEFAULT 0 CHECK (units >= 0),
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.visits TO authenticated;
GRANT ALL ON public.visits TO service_role;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own visits select" ON public.visits FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Own visits insert" ON public.visits FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Own visits delete" ON public.visits FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE INDEX visits_owner_created ON public.visits (owner_id, created_at);