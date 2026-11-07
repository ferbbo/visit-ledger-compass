import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Plus, Pencil, Trash2, Users, Search, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClients } from "@/components/clients-provider";
import { lovable } from "@/integrations/lovable";
import { money, searchClients, type Client } from "@/lib/visit";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [
    { title: "Clientes — Visita comercial" }, { name: "description", content: "Crea, actualiza y elimina los clientes de tus visitas comerciales." },
    { property: "og:title", content: "Clientes — Visita comercial" }, { property: "og:description", content: "Administra tu directorio de clientes." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: ClientsPage,
});
function ClientsPage() {
  const { clients, userId, loading, error, refresh, save, remove } = useClients();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const [fields, setFields] = useState({ name: "", phone: "", city: "" });
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  function edit(client: Client | "new") {
    setFailure(""); setMessage(""); setEditing(client);
    setFields(client === "new" ? { name: "", phone: "", city: "" } : { name: client.name, phone: client.phone, city: client.city });
  }
  async function action(fn: () => Promise<void>, success: string) {
    setBusy(true); setFailure("");
    try { await fn(); setEditing(null); setDeleting(null); setMessage(success); }
    catch (e) { setFailure(e instanceof Error ? e.message : "No se pudo guardar. Intenta de nuevo."); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto min-h-screen max-w-md bg-background">
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 p-4 backdrop-blur">
      <Button variant="ghost" size="icon" asChild><Link to="/" aria-label="Volver al inicio"><ChevronLeft /></Link></Button>
      <h1 className="flex-1 font-display text-xl font-bold">Clientes</h1>
      {userId && !editing && <Button size="icon" aria-label="Crear cliente" title="Crear cliente" onClick={() => edit("new")}><Plus /></Button>}
    </header>
    <main className="space-y-4 p-4 pb-28">
      {(failure || error) && <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">{failure || error}{error && <Button variant="link" onClick={() => void refresh()}>Reintentar</Button>}</div>}
      {message && <p role="status" className="text-sm text-success">{message}</p>}
      {loading ? <p className="text-muted-foreground">Cargando clientes…</p> : !userId ? <section className="space-y-4 py-8">
        <Users className="h-10 w-10 text-primary" /><h2 className="font-display text-2xl font-bold">Tu directorio de clientes</h2>
        <p className="text-sm text-muted-foreground">Inicia sesión para guardar tus clientes de forma privada.</p>
        <Button className="h-12 w-full" disabled={busy} onClick={() => void action(async () => {
          const result = await lovable.auth.signInWithOAuth("lovable", { redirect_uri: window.location.origin + "/clientes" });
          if (result.error) throw result.error;
        }, "")}>Continuar con Lovable</Button>
      </section> : editing ? <form id="client-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); void action(() => save(fields, editing === "new" ? undefined : editing.id), editing === "new" ? "Cliente creado" : "Cliente actualizado"); }}>
        <h2 className="font-display text-xl font-bold">{editing === "new" ? "Nuevo cliente" : "Editar cliente"}</h2>
        {([['name', 'Nombre'], ['phone', 'Teléfono'], ['city', 'Ciudad / zona']] as const).map(([key, label]) => <div key={key}>
          <label htmlFor={key} className="mb-2 block text-sm font-medium">{label}</label>
          <input id={key} required={key === "name"} maxLength={key === "name" ? 120 : 100} type={key === "phone" ? "tel" : "text"} autoComplete={key === "phone" ? "tel" : "off"} value={fields[key]} onChange={(e) => setFields({ ...fields, [key]: e.target.value })} className="h-12 w-full rounded-lg border bg-muted/40 px-3 outline-none focus:ring-2 focus:ring-ring" />
        </div>)}
        <footer className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md gap-2 border-t bg-background p-4">
          <Button type="button" variant="outline" className="h-12" disabled={busy} onClick={() => setEditing(null)}><X />Cancelar</Button>
          <Button type="submit" className="h-12 flex-1" disabled={busy || !fields.name.trim()}><Save />{busy ? "Guardando…" : "Guardar cliente"}</Button>
        </footer>
      </form> : <>
        <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{clients.length} clientes</p><Button variant="outline" onClick={() => edit("new")}><Plus />Nuevo cliente</Button></div>
        <div className="relative"><Search className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" /><input aria-label="Buscar en clientes" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre, teléfono o ciudad" className="h-12 w-full rounded-lg border bg-muted/40 pl-10 pr-3 outline-none focus:ring-2 focus:ring-ring" /></div>
        {searchClients(query, clients).map((c) => <article key={c.id} className="flex items-center gap-2 rounded-lg border bg-card p-3">
          <div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{c.name}</h2><p className="break-words text-xs text-muted-foreground">{c.phone}{c.city && ` · ${c.city}`}</p><p className="mt-1 text-sm">{money(c.previousBalance)}</p></div>
          <Button variant="ghost" size="icon" aria-label={`Editar ${c.name}`} title="Editar cliente" onClick={() => edit(c)}><Pencil /></Button>
          <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Eliminar ${c.name}`} title="Eliminar cliente" onClick={() => { setFailure(""); setDeleting(c); }}><Trash2 /></Button>
        </article>)}
        {!searchClients(query, clients).length && <p className="py-8 text-center text-sm text-muted-foreground">{query ? "No hay coincidencias." : "Aún no tienes clientes."}</p>}
      </>}
    </main>
    {deleting && <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/90 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-title">
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-5"><h2 id="delete-title" className="font-display text-xl font-bold">¿Eliminar cliente?</h2><p className="break-words text-sm">{deleting.name}</p><p className="text-sm text-muted-foreground">Se eliminarán su ficha, saldo e inventario. No se puede deshacer.</p>{failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
        <div className="flex gap-2"><Button variant="outline" className="flex-1" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</Button><Button variant="destructive" className="flex-1" disabled={busy} onClick={() => void action(() => remove(deleting.id), "Cliente eliminado")}><Trash2 />{busy ? "Eliminando…" : "Eliminar"}</Button></div>
      </div>
    </div>}
  </div>;
}