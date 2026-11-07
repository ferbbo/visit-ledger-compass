import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CLIENTS, PRODUCTS, type Client, type Inv } from "@/lib/visit";

type Directory = {
  clients: Client[]; userId: string | null; loading: boolean; error: string;
  refresh: () => Promise<void>;
  save: (fields: { name: string; phone: string; city: string }, id?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  saveVisit: (id: string, inventory: Inv, balance: number) => Promise<void>;
};
const Context = createContext<Directory | null>(null);
export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(CLIENTS);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function refresh() {
    setError("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) { setClients(CLIENTS); setLoading(false); return; }
    if (authError) throw authError;
    const rows = [];
    for (let start = 0; ; start += 1000) {
      const { data, error } = await supabase.from("clients").select("*").order("created_at").range(start, start + 999);
      if (error) { setError("No se pudieron cargar los clientes. Intenta de nuevo."); setLoading(false); return; }
      rows.push(...data);
      if (data.length < 1000) break;
    }
    setClients(rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone, city: r.city, previousBalance: Number(r.balance),
      inventory: Object.fromEntries(PRODUCTS.map((p) => [p.id, Math.max(0, Number((r.inventory as Record<string, unknown>)?.[p.id]) || 0)])) as Inv })));
    setLoading(false);
  }
  useEffect(() => {
    void refresh().catch(() => { setError("No se pudo conectar. Intenta de nuevo."); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") { setLoading(true); setTimeout(() => void refresh(), 0); }
    });
    return () => subscription.unsubscribe();
  }, []);
  const requireUser = () => { if (!userId) throw new Error("Inicia sesión para guardar clientes."); };
  async function save(fields: { name: string; phone: string; city: string }, id?: string) {
    requireUser();
    const clean = { name: fields.name.trim(), phone: fields.phone.trim(), city: fields.city.trim() };
    if (!clean.name) throw new Error("Escribe el nombre del cliente.");
    const { error } = id ? await supabase.from("clients").update(clean).eq("id", id).select().single() : await supabase.from("clients").insert(clean);
    if (error) throw new Error("No se pudo guardar el cliente. Intenta de nuevo.");
    await refresh();
  }
  async function remove(id: string) {
    requireUser();
    const { error } = await supabase.from("clients").delete().eq("id", id).select().single();
    if (error) throw new Error("No se pudo eliminar el cliente. Intenta de nuevo.");
    await refresh();
  }
  async function saveVisit(id: string, inventory: Inv, balance: number) {
    if (!userId) return;
    const { error } = await supabase.from("clients").update({ inventory, balance }).eq("id", id).select().single();
    if (error) throw new Error("No se pudo guardar la visita. Intenta de nuevo.");
    await refresh();
  }
  return <Context.Provider value={{ clients, userId, loading, error, refresh, save, remove, saveVisit }}>{children}</Context.Provider>;
}
export function useClients() {
  const value = useContext(Context);
  if (!value) throw new Error("Falta el directorio de clientes");
  return value;
}