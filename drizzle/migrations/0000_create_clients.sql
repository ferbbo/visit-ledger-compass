CREATE TABLE public.clients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL DEFAULT auth.uid(),
 name text NOT NULL CHECK (length(trim(name)) > 0),
 phone text NOT NULL DEFAULT '',
 city text NOT NULL DEFAULT '',
 balance numeric NOT NULL DEFAULT 0,
 inventory jsonb NOT NULL DEFAULT '{"usb":0,"usbc":0,"charger":0,"hands":0}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their clients" ON public.clients FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX clients_owner_idx ON public.clients(owner_id);