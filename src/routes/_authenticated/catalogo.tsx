import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Plus, Pencil, Trash2, Save, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClients } from "@/components/clients-provider";
import { AccountControl } from "@/components/account-control";
import { money, type Product } from "@/lib/visit";

export const Route = createFileRoute("/_authenticated/catalogo")({
  head: () => ({ meta: [
    { title: "Catálogo — Visita comercial" }, { name: "description", content: "Carga y administra los productos que consignas y liquidas." },
    { property: "og:title", content: "Catálogo — Visita comercial" }, { property: "og:description", content: "Administra tu catálogo de productos." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: CatalogPage,
});

function CatalogPage() {
  const { products, clients, loading, error, refresh, saveProduct, removeProduct } = useClients();
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [fields, setFields] = useState({ name: "", price: "" });
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const units = (id: string) => clients.reduce((a, c) => a + (c.inventory[id] ?? 0), 0);
  function edit(p: Product | "new") {
    setFailure(""); setMessage(""); setEditing(p);
    setFields(p === "new" ? { name: "", price: "" } : { name: p.name, price: String(p.price) });
  }
  async function action(fn: () => Promise<void>, success: string) {
    setBusy(true); setFailure("");
    try { await fn(); setEditing(null); setDeleting(null); setMessage(success); }
    catch (e) { setFailure(e instanceof Error ? e.message : "No se pudo guardar. Intenta de nuevo."); }
    finally { setBusy(false); }
  }
  const price = Number(fields.price.replace(/\D/g, "")) || 0;
  return <div className="mx-auto min-h-screen max-w-md bg-background">
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 p-4 backdrop-blur">
      <Button variant="ghost" size="icon" asChild><Link to="/" aria-label="Volver al inicio"><ChevronLeft /></Link></Button>
      <h1 className="flex-1 font-display text-xl font-bold">Catálogo</h1>
      <AccountControl />
      {!editing && <Button size="icon" aria-label="Agregar producto" title="Agregar producto" onClick={() => edit("new")}><Plus /></Button>}
    </header>
    <main className="space-y-3 p-4 pb-28">
      {(failure || error) && !deleting && <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">{failure || error}{error && <Button variant="link" onClick={() => void refresh()}>Reintentar</Button>}</div>}
      {message && <p role="status" className="text-sm text-success">{message}</p>}
      {loading ? <p className="text-muted-foreground">Cargando catálogo…</p> : editing ? <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void action(() => saveProduct({ name: fields.name, price }, editing === "new" ? undefined : editing.id), editing === "new" ? "Producto agregado" : "Producto actualizado"); }}>
        <h2 className="font-display text-xl font-bold">{editing === "new" ? "Nuevo producto" : "Editar producto"}</h2>
        <div><label htmlFor="pname" className="mb-2 block text-sm font-medium">Nombre</label>
          <input id="pname" required maxLength={120} value={fields.name} onChange={(e) => setFields({ ...fields, name: e.target.value })} className="h-12 w-full rounded-lg border bg-muted/40 px-3 outline-none focus:ring-2 focus:ring-ring" /></div>
        <div><label htmlFor="pprice" className="mb-2 block text-sm font-medium">Precio por unidad</label>
          <input id="pprice" inputMode="numeric" value={fields.price ? money(price) : ""} placeholder="$0" onChange={(e) => setFields({ ...fields, price: e.target.value.replace(/\D/g, "") })} className="h-12 w-full rounded-lg border bg-muted/40 px-3 font-display text-lg font-bold outline-none focus:ring-2 focus:ring-ring" /></div>
        <footer className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md gap-2 border-t bg-background p-4">
          <Button type="button" variant="outline" className="h-12" disabled={busy} onClick={() => setEditing(null)}><X />Cancelar</Button>
          <Button type="submit" className="h-12 flex-1" disabled={busy || !fields.name.trim()}><Save />{busy ? "Guardando…" : "Guardar producto"}</Button>
        </footer>
      </form> : <>
        <p className="text-sm text-muted-foreground">{products.length} productos</p>
        {products.map((p) => <article key={p.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Package className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{money(p.price)} · {units(p.id)} u. en clientes</p></div>
          <Button variant="ghost" size="icon" aria-label={`Editar ${p.name}`} onClick={() => edit(p)}><Pencil /></Button>
          <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Eliminar ${p.name}`} onClick={() => { setFailure(""); setDeleting(p); }}><Trash2 /></Button>
        </article>)}
      </>}
    </main>
    {deleting && <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/90 p-4" role="dialog" aria-modal="true" aria-labelledby="pdel">
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-5"><h2 id="pdel" className="font-display text-xl font-bold">¿Eliminar producto?</h2><p className="break-words text-sm">{deleting.name}</p>{failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
        <div className="flex gap-2"><Button variant="outline" className="flex-1" disabled={busy} onClick={() => { setDeleting(null); setFailure(""); }}>Cancelar</Button><Button variant="destructive" className="flex-1" disabled={busy} onClick={() => void action(() => removeProduct(deleting.id), "Producto eliminado")}><Trash2 />{busy ? "Eliminando…" : "Eliminar"}</Button></div>
      </div>
    </div>}
  </div>;
}
