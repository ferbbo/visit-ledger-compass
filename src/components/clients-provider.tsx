import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CLIENTS, PRODUCTS, type Client, type Inv, type Product, type VisitRecord } from "@/lib/visit";

type Directory = {
  clients: Client[]; userId: string | null; loading: boolean; error: string;
  refresh: () => Promise<void>;
  save: (fields: { name: string; phone: string; city: string }, id?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  saveVisit: (id: string, inventory: Inv, balance: number, record?: Omit<VisitRecord, "clientId" | "at">) => Promise<void>;
  visits: VisitRecord[];
  products: Product[];
  saveProduct: (fields: { name: string; price: number }, id?: string) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
};
const Context = createContext<Directory | null>(null);
export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(CLIENTS);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [custom, setCustom] = useState(false);
  const generation = useRef(0);
  async function refresh() {
    const request = ++generation.current;
    setError("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (request !== generation.current) return;
    setUserId(user?.id ?? null);
    if (!user) { setVisits([]); setClients(CLIENTS); setProducts(PRODUCTS); setCustom(false); setLoading(false); return; }
    if (authError) throw authError;
    const catalog = await supabase.from("products").select("id,name,price").eq("owner_id", user.id).order("created_at");
    if (request !== generation.current) return;
    if (catalog.error) { setError("No se pudo cargar el catálogo. Intenta de nuevo."); setLoading(false); return; }
    const list = catalog.data.length ? catalog.data.map((p) => ({ id: p.id, name: p.name, price: Number(p.price) })) : PRODUCTS;
    setProducts(list); setCustom(catalog.data.length > 0);
    const rows = [];
    for (let start = 0; ; start += 1000) {
      const { data, error } = await supabase.from("clients").select("*").eq("owner_id", user.id).order("created_at").range(start, start + 999);
      if (request !== generation.current) return;
      if (error) { setError("No se pudieron cargar los clientes. Intenta de nuevo."); setLoading(false); return; }
      rows.push(...data);
      if (data.length < 1000) break;
    }
    setClients(rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone, city: r.city, previousBalance: Number(r.balance),
      inventory: Object.fromEntries(list.map((p) => [p.id, Math.max(0, Number((r.inventory as Record<string, unknown>)?.[p.id]) || 0)])) as Inv })));
    const since = new Date(); since.setDate(since.getDate() - 40);
    const log = await supabase.from("visits").select("client_id,kind,units,amount,created_at").eq("owner_id", user.id).gte("created_at", since.toISOString()).order("created_at").limit(5000);
    if (request !== generation.current) return;
    if (log.data) setVisits(log.data.map((v) => ({ clientId: v.client_id, kind: v.kind === "cons" ? "cons" : "liq", units: v.units, amount: Number(v.amount), at: v.created_at })));
    setLoading(false);
  }
  useEffect(() => {
    void refresh().catch(() => { setError("No se pudo conectar. Intenta de nuevo."); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        ++generation.current; setClients([]); setUserId(null); setLoading(true);
        setTimeout(() => void refresh().catch(() => { setError("No se pudo conectar. Intenta de nuevo."); setLoading(false); }), 0);
      }
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
  async function saveVisit(id: string, inventory: Inv, balance: number, record?: Omit<VisitRecord, "clientId" | "at">) {
    if (!userId) { if (record) setVisits((v) => [...v, { ...record, clientId: id, at: new Date().toISOString() }]); return; }
    if (record) {
      const r = await supabase.from("visits").insert({ client_id: id, kind: record.kind, units: Math.max(0, Math.round(record.units)), amount: Math.max(0, Math.round(record.amount)) });
      if (r.error) throw new Error("No se pudo registrar la visita. Intenta de nuevo.");
    }
    const { error } = await supabase.from("clients").update({ inventory, balance }).eq("id", id).select().single();
    if (error) throw new Error("No se pudo guardar la visita. Intenta de nuevo.");
    await refresh();
  }
  // El catálogo base se guarda en la cuenta la primera vez que se edita.
  async function materialize() {
    if (custom || !userId) return;
    const { error } = await supabase.from("products").upsert(PRODUCTS.map((p) => ({ owner_id: userId, id: p.id, name: p.name, price: p.price })), { onConflict: "owner_id,id" });
    if (error) throw new Error("No se pudo guardar el catálogo. Intenta de nuevo.");
  }
  async function saveProduct(fields: { name: string; price: number }, id?: string) {
    requireUser();
    const name = fields.name.trim(); const price = Math.round(Number(fields.price));
    if (!name) throw new Error("Escribe el nombre del producto.");
    if (!Number.isFinite(price) || price < 0) throw new Error("Escribe un precio válido.");
    await materialize();
    const { error } = id ? await supabase.from("products").update({ name, price }).eq("owner_id", userId!).eq("id", id).select().single()
      : await supabase.from("products").insert({ owner_id: userId!, name, price });
    if (error) throw new Error("No se pudo guardar el producto. Intenta de nuevo.");
    await refresh();
  }
  async function removeProduct(id: string) {
    requireUser();
    const holders = clients.filter((c) => (c.inventory[id] ?? 0) > 0).length;
    if (holders) throw new Error(`No se puede eliminar: ${holders} cliente(s) aún tienen unidades de este producto.`);
    if (products.length <= 1) throw new Error("El catálogo debe tener al menos un producto.");
    await materialize();
    const { error } = await supabase.from("products").delete().eq("owner_id", userId!).eq("id", id).select().single();
    if (error) throw new Error("No se pudo eliminar el producto. Intenta de nuevo.");
    await refresh();
  }
  return <Context.Provider value={{ clients, userId, loading, error, refresh, save, remove, saveVisit, visits, products, saveProduct, removeProduct }}>{children}</Context.Provider>;
}
export function useClients() {
  const value = useContext(Context);
  if (!value) throw new Error("Falta el directorio de clientes");
  return value;
}