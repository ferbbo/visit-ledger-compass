import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Search, MapPin, Minus, Plus, Check, AlertTriangle, Phone, ChevronLeft, PackagePlus, RotateCcw, Receipt, ClipboardCheck, ChevronRight } from "lucide-react";
import {
  CLIENTS, clientById, searchClients, openClient, saveClient, DEMO_LINES, DEMO_NEW, PRODUCTS, METHODS, LIQ_STEPS, defaultLines, initialState, loadState, money, reconcile, setCount, settlement, sum,
  type CountKey, type Inv, type State, type Lines,
} from "@/lib/visit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visita comercial — Consignaciones" },
      { name: "description", content: "App móvil para liquidar y consignar accesorios durante una visita." },
      { property: "og:title", content: "Visita comercial — Consignaciones" },
      { property: "og:description", content: "Liquida, cobra y consigna desde el teléfono." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VisitApp,
});

const KEY = "visita-state-v1";
const EMPTY: Inv = { usb: 0, usbc: 0, charger: 0, hands: 0 };
const autoLines = (l: Lines, inv: Inv): Lines =>
  Object.fromEntries(PRODUCTS.map((p) => { const x = l[p.id]; return [p.id, { ...x, manual: false, physical: Math.max(0, inv[p.id] - x.sold - x.returned - x.lost) }]; })) as Lines;

function VisitApp() {
  const [s, setS] = useState<State>(initialState);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => { setS(loadState(localStorage.getItem(KEY))); setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(s)); }, [s, ready]);

  const up = (p: Partial<State>) => { setS((x) => ({ ...x, ...p })); window.scrollTo(0, 0); };
  const rec = reconcile(s.startInventory, s.lines);
  const st = settlement(s.lines);
  const ok = !s.validate || rec.every((r) => r.diff === 0);
  const pending = Math.max(0, s.balance - s.payment);
  const [q, setQ] = useState("");
  const client = clientById(s.clientId);
  const home = (msg = "") => { setNotice(msg); setS((x) => saveClient({ ...x, view: "home", step: 0 })); window.scrollTo(0, 0); };
  const toDashboard = () => { setNotice(""); setS((x) => ({ ...saveClient(x), clientId: null, view: "home" })); };
  const pick = (id: string) => { setNotice(""); setQ(""); setS((x) => openClient(saveClient(x), id)); window.scrollTo(0, 0); };
  const results = searchClients(q);
  const initials = (n: string) => n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const startLiq = () => { setNotice(""); up({ view: "liq", step: 0, startInventory: { ...s.inventory }, lines: defaultLines(s.inventory), charged: 0, validate: false }); };
  const startCons = () => { setNotice(""); up({ view: "cons", newCons: { ...EMPTY } }); };

  const title = !client ? "Buscar cliente" : s.view === "home" ? "Visita comercial" : s.view === "cons" ? "Consignación" : `Liquidación · ${LIQ_STEPS[s.step]}`;
  const canBack = !!client && (s.view === "home" || s.view === "cons" || (s.view === "liq" && s.step <= 1));
  const back = () => (s.view === "home" ? toDashboard() : s.view === "liq" && s.step === 1 ? up({ step: 0 }) : home());

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background shadow-xl">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
          <div className="flex items-center gap-2">
            {canBack && (
              <button aria-label="Atrás" onClick={back} className="-ml-2 rounded-full p-2 hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
            )}
            <h1 className="flex-1 font-display text-xl font-bold">{title}</h1>
            {!client && <button aria-label="Reiniciar demo" onClick={() => { if (confirm("¿Reiniciar la demostración?")) { setNotice(""); setS(initialState()); } }} className="rounded-full p-2 text-muted-foreground hover:bg-muted"><RotateCcw className="h-4 w-4" /></button>}
          </div>
          {s.view === "liq" && <div className="mt-3 flex gap-1">{LIQ_STEPS.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= s.step ? "bg-primary" : "bg-muted"}`} />)}</div>}
        </header>

        <main className="flex-1 space-y-3 p-4 pb-32">
          {!client && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Clientes" value={CLIENTS.length} />
                <Stat label="Por cobrar" value={money(CLIENTS.reduce((a, c) => a + (s.book[c.id]?.balance ?? 0), 0))} />
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input autoFocus aria-label="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, teléfono o ciudad"
                  className="h-14 w-full rounded-2xl border bg-muted/40 pl-12 pr-4 text-base outline-none focus:ring-2 focus:ring-ring" />
              </div>
              {results.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Ningún cliente coincide con "{q}".</p>}
              {results.map((c) => {
                const e = s.book[c.id];
                return (
                  <button key={c.id} onClick={() => pick(c.id)} className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition active:scale-[0.98]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 font-display font-bold text-primary">{initials(c.name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.name}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{c.city}</p>
                    </div>
                    <div className="text-right"><p className="text-sm font-bold">{money(e?.balance ?? 0)}</p><p className="text-xs text-muted-foreground">{sum(e?.inventory)} u.</p></div>
                  </button>
                );
              })}
            </>
          )}

          {client && s.view === "home" && (
            <>
              {notice && <Card className="border-success/40 bg-success/10"><div className="flex items-center gap-2 text-sm font-medium"><Check className="h-4 w-4 text-success" />{notice}</div></Card>}
              <Card>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-xl font-bold text-primary-foreground">{initials(client.name)}</div>
                  <div>
                    <p className="font-display text-lg font-bold">{client.name}</p>
                    <a href={`tel:${client.phone}`} className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" />{client.phone}</a>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Stat label="Inventario" value={`${sum(s.inventory)} u.`} />
                  <Stat label="Saldo pendiente" value={money(s.balance)} />
                </div>
              </Card>
              <p className="pt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Módulos</p>
              <Module icon={<Receipt className="h-6 w-6" />} title="Liquidación" desc="Registra ventas, devoluciones y mermas, y cobra al cliente." onClick={startLiq} />
              <Module icon={<PackagePlus className="h-6 w-6" />} title="Consignación" desc="Entrega mercancía nueva. No genera cargos." onClick={startCons} />
              <Card>
                <p className="mb-2 text-sm font-semibold">Inventario en el cliente</p>
                {PRODUCTS.map((p) => <Row key={p.id} label={`${p.name} · ${money(p.price)}`} value={`${s.inventory[p.id]} u.`} />)}
              </Card>
            </>
          )}

          {s.view === "liq" && s.step === 0 && (
            <>
              <button onClick={() => setS((x) => ({ ...x, lines: x.validate ? structuredClone(DEMO_LINES) : autoLines(structuredClone(DEMO_LINES), x.startInventory) }))} className="w-full rounded-xl border border-dashed border-primary/50 py-2 text-sm font-medium text-primary">Cargar datos de prueba</button>
              <Card className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <div className="flex-1"><p className="text-sm font-semibold">Validar existencias</p><p className="text-xs text-muted-foreground">Opcional: cuenta lo que hay en físico y concilia.</p></div>
                <button role="switch" aria-checked={s.validate} aria-label="Validar existencias"
                  onClick={() => setS((x) => ({ ...x, validate: !x.validate, lines: x.validate ? autoLines(x.lines, x.startInventory) : x.lines }))}
                  className={`relative h-7 w-12 rounded-full transition ${s.validate ? "bg-primary" : "bg-muted"}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-background shadow transition ${s.validate ? "left-6" : "left-1"}`} />
                </button>
              </Card>
              {s.validate && (
                <Card className={ok ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"}>
                  <div className="flex items-center gap-2 text-sm font-medium">{ok ? <Check className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}{ok ? "Existencias conciliadas" : "Hay diferencias en el conteo físico"}</div>
                </Card>
              )}
              {PRODUCTS.map((p) => {
                const l = s.lines[p.id]; const avail = s.startInventory[p.id];
                const diff = rec.find((r) => r.product.id === p.id)!.diff;
                const set = (k: CountKey) => (v: number) => setS((x) => ({ ...x, lines: { ...x.lines, [p.id]: setCount(x.lines[p.id], k, v, avail) } }));
                return (
                  <Card key={p.id}>
                    <div className="mb-3 flex items-baseline justify-between">
                      <p className="font-semibold">{p.name}</p>
                      <span className={`text-xs font-medium ${!s.validate ? "text-muted-foreground" : diff === 0 ? "text-success" : "text-destructive"}`}>{avail} disp.{s.validate && ` · ${diff === 0 ? "cuadra" : `dif. ${diff}`}`}{!s.validate && ` · quedan ${l.physical}`}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Stepper label="Vendidas" value={l.sold} onChange={set("sold")} max={avail} />
                      <Stepper label="Devueltas" value={l.returned} onChange={set("returned")} max={avail} />
                      <Stepper label="Mermas" value={l.lost} onChange={set("lost")} max={avail} />
                      {s.validate && <Stepper label="Física" value={l.physical} onChange={set("physical")} max={avail} />}
                    </div>
                    {s.validate && l.manual && (
                      <button onClick={() => setS((x) => ({ ...x, lines: { ...x.lines, [p.id]: { ...l, manual: false, physical: Math.max(0, avail - l.sold - l.returned - l.lost) } } }))}
                        className="mt-2 text-xs font-medium text-primary underline underline-offset-2">Deshacer conteo manual</button>
                    )}
                  </Card>
                );
              })}
            </>
          )}

          {s.view === "liq" && s.step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Vendidas" value={st.sold} /><Stat label="Devueltas" value={st.returned} />
                <Stat label="Mermas (sin cargo)" value={st.lost} /><Stat label="Restantes" value={st.remaining} />
              </div>
              <Card>
                {PRODUCTS.filter((p) => s.lines[p.id].sold > 0).map((p) => (
                  <Row key={p.id} label={`${p.name} · ${s.lines[p.id].sold} × ${money(p.price)}`} value={money(s.lines[p.id].sold * p.price)} />
                ))}
                <div className="mt-2 border-t pt-3"><Row label="Total a liquidar" value={money(st.total)} big /></div>
              </Card>
            </>
          )}

          {s.view === "liq" && s.step === 2 && (
            <>
              <Card>
                <Row label="Saldo anterior" value={money(s.balance - s.charged)} />
                <Row label="Cargo liquidación" value={`+ ${money(s.charged)}`} />
                <div className="mt-2 border-t pt-3"><Row label="Saldo total" value={money(s.balance)} big /></div>
              </Card>
              <Card>
                <label className="text-sm font-medium text-muted-foreground" htmlFor="pay">Valor del pago</label>
                <input id="pay" inputMode="numeric" value={s.payment.toLocaleString("es-CO")}
                  onChange={(e) => setS((x) => ({ ...x, payment: Math.min(x.balance, Number(e.target.value.replace(/\D/g, "")) || 0) }))}
                  className="mt-1 w-full rounded-xl border bg-muted/40 px-4 py-3 font-display text-2xl font-bold outline-none focus:ring-2 focus:ring-ring" />
                <div className="mt-2 flex gap-2">
                  {[0, s.balance].map((v) => <button key={v} onClick={() => setS((x) => ({ ...x, payment: v }))} className="rounded-full border px-3 py-1 text-xs font-medium">{v === 0 ? "Sin pago" : "Total"}</button>)}
                </div>
                <p className="mb-2 mt-4 text-sm font-medium text-muted-foreground">Medio de pago</p>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map((m) => (
                    <button key={m} onClick={() => setS((x) => ({ ...x, method: m }))} className={`rounded-xl border py-2.5 text-sm font-medium ${s.method === m ? "border-primary bg-primary text-primary-foreground" : ""}`}>{m}</button>
                  ))}
                </div>
              </Card>
              <Card className="bg-accent"><Row label="Saldo pendiente" value={money(pending)} big /></Card>
            </>
          )}

          {s.view === "liq" && s.step === 3 && (
            <>
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success text-success-foreground"><Check className="h-10 w-10" strokeWidth={3} /></div>
                <p className="mt-4 font-display text-2xl font-bold">Liquidación registrada</p>
                <p className="text-sm text-muted-foreground">{client?.name}</p>
              </div>
              <Card>
                <Row label="Unidades vendidas" value={`${st.sold} u.`} />
                <Row label="Valor liquidado" value={money(s.charged)} />
                <Row label={`Pago recibido (${s.method})`} value={money(s.payment)} />
                <Row label="Existencias validadas" value={s.validate ? "Sí" : "No"} />
                <div className="mt-2 border-t pt-3"><Row label="Saldo pendiente" value={money(s.balance)} big /></div>
              </Card>
            </>
          )}

          {s.view === "cons" && (
            <>
              <Card><p className="font-display text-lg font-bold">Nueva mercancía</p><p className="text-sm text-muted-foreground">La consignación no genera cargos. Inventario actual: {sum(s.inventory)} u.</p></Card>
              <button onClick={() => setS((x) => ({ ...x, newCons: { ...DEMO_NEW } }))} className="w-full rounded-xl border border-dashed border-primary/50 py-2 text-sm font-medium text-primary">Cargar datos de prueba</button>
              {PRODUCTS.map((p) => (
                <Card key={p.id} className="flex items-center justify-between gap-3">
                  <div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">Tiene {s.inventory[p.id]}</p></div>
                  <div className="w-36"><Stepper value={s.newCons[p.id]} onChange={(v) => setS((x) => ({ ...x, newCons: { ...x.newCons, [p.id]: v } }))} max={999} /></div>
                </Card>
              ))}
              <Card className="bg-accent"><Row label={`Nuevas: ${sum(s.newCons)} u.`} value={`Final: ${sum(s.inventory) + sum(s.newCons)} u.`} big /></Card>
            </>
          )}
        </main>

        {client && s.view !== "home" && (
          <footer className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md space-y-2 border-t bg-background/95 p-4 backdrop-blur">
            {s.view === "liq" && s.step === 0 && <Primary disabled={!ok} onClick={() => up({ step: 1 })}>{ok ? "Ver resumen" : "Corrige las diferencias"}</Primary>}
            {s.view === "liq" && s.step === 1 && <Primary onClick={() => {
              if (!confirm(`¿Confirmar liquidación por ${money(st.total)}? Se cargará a la cuenta del cliente.`)) return;
              const inv = Object.fromEntries(PRODUCTS.map((p) => [p.id, s.lines[p.id].physical])) as Inv;
              up({ balance: s.balance + st.total, charged: st.total, inventory: inv, payment: s.balance + st.total, step: 2 });
            }}>Confirmar liquidación · {money(st.total)}</Primary>}
            {s.view === "liq" && s.step === 2 && <Primary onClick={() => {
              if (s.payment > 0 && !confirm(`¿Registrar pago de ${money(s.payment)} en ${s.method}?`)) return;
              up({ balance: s.balance - s.payment, step: 3 });
            }}>{s.payment > 0 ? "Registrar pago" : "Continuar sin pago"}</Primary>}
            {s.view === "liq" && s.step === 3 && <Primary onClick={() => home("Liquidación registrada")}>Volver al inicio</Primary>}
            {s.view === "cons" && <Primary disabled={sum(s.newCons) === 0} onClick={() => {
              if (!confirm(`¿Consignar ${sum(s.newCons)} unidades?`)) return;
              const inv = Object.fromEntries(PRODUCTS.map((p) => [p.id, s.inventory[p.id] + s.newCons[p.id]])) as Inv;
              const n = sum(s.newCons);
              setS((x) => ({ ...x, inventory: inv, consigned: n, newCons: { ...EMPTY } }));
              home(`${n} unidades consignadas`);
            }}><PackagePlus className="h-4 w-4" />Consignar</Primary>}
          </footer>
        )}
      </div>
    </div>
  );
}

function Module({ icon, title, desc, onClick }: { icon: ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition active:scale-[0.98]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div className="flex-1"><p className="font-display text-lg font-bold">{title}</p><p className="text-sm text-muted-foreground">{desc}</p></div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );
}
function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border bg-card p-4 ${className}`}>{children}</div>;
}
function Stat({ label, value }: { label: string; value: ReactNode }) {
  return <div className="rounded-xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-display text-xl font-bold">{value}</p></div>;
}
function Row({ label, value, big }: { label: string; value: ReactNode; big?: boolean }) {
  return <div className="flex items-center justify-between py-1"><span className={big ? "font-semibold" : "text-sm text-muted-foreground"}>{label}</span><span className={big ? "font-display text-xl font-bold" : "font-medium"}>{value}</span></div>;
}
function Stepper({ label, value, onChange, max }: { label?: string; value: number; onChange: (v: number) => void; max: number }) {
  const clamp = (v: number) => Math.max(0, Math.min(max, v));
  return (
    <div>
      {label && <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="flex items-center rounded-xl border bg-muted/40">
        <button aria-label={`Restar ${label ?? ""}`} onClick={() => onChange(clamp(value - 1))} className="flex h-11 w-11 items-center justify-center active:bg-muted"><Minus className="h-4 w-4" /></button>
        <input inputMode="numeric" value={value} onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, "")) || 0))} className="w-full min-w-0 bg-transparent text-center font-display text-lg font-bold outline-none" />
        <button aria-label={`Sumar ${label ?? ""}`} onClick={() => onChange(clamp(value + 1))} className="flex h-11 w-11 items-center justify-center active:bg-muted"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
function Primary({ children, ...p }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button {...p} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground shadow-lg transition active:scale-[0.98] disabled:opacity-40">{children}</button>;
}
