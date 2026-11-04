import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Minus, Plus, Check, AlertTriangle, Phone, ChevronLeft, PackagePlus, Flag, RotateCcw } from "lucide-react";
import {
  CLIENT, DEMO_LINES, DEMO_NEW, PRODUCTS, METHODS, STEPS, initialState, loadState, money, reconcile, setCount, settlement, sum,
  type CountKey, type Inv, type State,
} from "@/lib/visit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visita comercial — Consignaciones" },
      { name: "description", content: "Prototipo móvil para liquidar consignaciones de accesorios durante una visita." },
      { property: "og:title", content: "Visita comercial — Consignaciones" },
      { property: "og:description", content: "Liquida, cobra y reconsigna desde el teléfono." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VisitApp,
});

const KEY = "visita-state-v1";

function VisitApp() {
  const [s, setS] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) { const v = JSON.parse(raw); if (v.startInventory) setS(migrate(v)); } } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(s)); }, [s, ready]);

  const up = (p: Partial<State>) => setS((x) => ({ ...x, ...p }));
  const go = (step: number) => { up({ step }); window.scrollTo(0, 0); };
  const rec = reconcile(s.startInventory, s.lines);
  const st = settlement(s.lines);
  const ok = rec.every((r) => r.diff === 0);
  const totalDue = s.balance;
  const pending = Math.max(0, totalDue - s.payment);

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background shadow-xl">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
          <div className="flex items-center gap-2">
            {s.step > 0 && s.step < 5 && (
              <button aria-label="Atrás" onClick={() => go(s.step - 1)} className="-ml-2 rounded-full p-2 hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
            )}
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Paso {s.step + 1} de 8</p>
              <h1 className="font-display text-xl font-bold">{STEPS[s.step]}</h1>
            </div>
            <button aria-label="Reiniciar demo" onClick={() => { if (confirm("¿Reiniciar la demostración?")) setS(initial()); }} className="rounded-full p-2 text-muted-foreground hover:bg-muted"><RotateCcw className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 flex gap-1">
            {STEPS.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= s.step ? "bg-primary" : "bg-muted"}`} />)}
          </div>
        </header>

        <main className="flex-1 space-y-3 p-4 pb-32">
          {s.step === 0 && (
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-xl font-bold text-primary-foreground">JM</div>
                <div>
                  <p className="font-display text-lg font-bold">{CLIENT.name}</p>
                  <a href={`tel:${CLIENT.phone}`} className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" />{CLIENT.phone}</a>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Stat label="Inventario" value={`${sum(s.inventory)} u.`} />
                <Stat label="Saldo pendiente" value={money(s.balance)} />
              </div>
            </Card>
          )}

          {s.step === 1 && PRODUCTS.map((p) => (
            <Card key={p.id} className="flex items-center justify-between">
              <div><p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">{money(p.price)} c/u</p></div>
              <p className="font-display text-2xl font-bold">{s.inventory[p.id]}<span className="ml-1 text-sm font-normal text-muted-foreground">u.</span></p>
            </Card>
          ))}

          {s.step === 2 && (
            <>
              <button onClick={() => up({ lines: structuredClone(DEMO_LINES) })} className="w-full rounded-xl border border-dashed border-primary/50 py-2 text-sm font-medium text-primary">Cargar datos de prueba</button>
              <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">El conteo <b className="text-foreground">Física</b> arranca con lo registrado en inventario y se baja solo con cada venta, devolución o merma. Escríbelo si el conteo real es otro.</p>
              {PRODUCTS.map((p) => {
                const l = s.lines[p.id]; const avail = s.startInventory[p.id];
                const diff = rec.find((r) => r.product.id === p.id)!.diff;
                const set = (k: CountKey) => (v: number) => up({ lines: { ...s.lines, [p.id]: setCount(l, k, v, avail) } });
                return (
                  <Card key={p.id}>
                    <div className="mb-3 flex items-baseline justify-between">
                      <p className="font-semibold">{p.name}</p>
                      <span className={`text-xs font-medium ${diff === 0 ? "text-success" : "text-muted-foreground"}`}>{avail} disp. · {diff === 0 ? "cuadra" : `faltan ${diff}`}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Stepper label="Vendidas" value={l.sold} onChange={set("sold")} max={avail} />
                      <Stepper label="Devueltas" value={l.returned} onChange={set("returned")} max={avail} />
                      <Stepper label="Mermas" value={l.lost} onChange={set("lost")} max={avail} />
                      <Stepper label="Física" value={l.physical} onChange={set("physical")} max={avail} />
                    </div>
                    {l.manual && (
                      <button onClick={() => up({ lines: { ...s.lines, [p.id]: { ...l, manual: false, physical: Math.max(0, avail - l.sold - l.returned - l.lost) } } })}
                        className="mt-2 text-xs font-medium text-primary underline underline-offset-2">Deshacer conteo manual</button>
                    )}
                  </Card>
                );
              })}
            </>
          )}

          {s.step === 3 && (
            <>
              <Card className={ok ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"}>
                <div className="flex items-center gap-3">
                  {ok ? <Check className="h-6 w-6 text-success" /> : <AlertTriangle className="h-6 w-6 text-destructive" />}
                  <p className="font-semibold">{ok ? "Inventario conciliado correctamente" : "Hay diferencias. Corrige antes de continuar."}</p>
                </div>
              </Card>
              {rec.map(({ product: p, diff }) => {
                const l = s.lines[p.id];
                return (
                  <Card key={p.id}>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{p.name}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${diff === 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{diff === 0 ? "OK" : `Dif. ${diff > 0 ? "+" : ""}${diff}`}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.startInventory[p.id]} − {l.sold} − {l.returned} − {l.lost} − {l.physical} = <b className="text-foreground">{diff}</b></p>
                  </Card>
                );
              })}
            </>
          )}

          {s.step === 4 && (
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

          {s.step === 5 && (
            <>
              <Card>
                <Row label="Saldo anterior" value={money(s.balance - s.charged)} />
                <Row label="Cargo liquidación" value={`+ ${money(s.charged)}`} />
                <div className="mt-2 border-t pt-3"><Row label="Saldo total" value={money(totalDue)} big /></div>
              </Card>
              <Card>
                <label className="text-sm font-medium text-muted-foreground" htmlFor="pay">Valor del pago</label>
                <input id="pay" inputMode="numeric" value={s.payment.toLocaleString("es-CO")}
                  onChange={(e) => up({ payment: Math.min(totalDue, Number(e.target.value.replace(/\D/g, "")) || 0) })}
                  className="mt-1 w-full rounded-xl border bg-muted/40 px-4 py-3 font-display text-2xl font-bold outline-none focus:ring-2 focus:ring-ring" />
                <div className="mt-2 flex gap-2">
                  {[70000, totalDue].map((v) => <button key={v} onClick={() => up({ payment: v })} className="rounded-full border px-3 py-1 text-xs font-medium">{v === totalDue ? "Total" : money(v)}</button>)}
                </div>
                <p className="mb-2 mt-4 text-sm font-medium text-muted-foreground">Medio de pago</p>
                <div className="grid grid-cols-3 gap-2">
                  {["Efectivo", "Transferencia", "Nequi"].map((m) => (
                    <button key={m} onClick={() => up({ method: m })} className={`rounded-xl border py-2.5 text-sm font-medium ${s.method === m ? "border-primary bg-primary text-primary-foreground" : ""}`}>{m}</button>
                  ))}
                </div>
              </Card>
              <Card className="bg-accent"><Row label="Saldo pendiente" value={money(pending)} big /></Card>
            </>
          )}

          {s.step === 6 && (
            <>
              <Card><p className="font-display text-lg font-bold">¿El cliente necesita más mercancía?</p><p className="text-sm text-muted-foreground">La consignación no genera cargos. Inventario actual: {st.remaining} u.</p></Card>
              <button onClick={() => up({ newCons: { ...DEMO_NEW } })} className="w-full rounded-xl border border-dashed border-primary/50 py-2 text-sm font-medium text-primary">Cargar datos de prueba</button>
              {PRODUCTS.map((p) => (
                <Card key={p.id} className="flex items-center justify-between gap-3">
                  <div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">Tiene {s.lines[p.id].physical}</p></div>
                  <div className="w-36"><Stepper value={s.newCons[p.id]} onChange={(v) => up({ newCons: { ...s.newCons, [p.id]: v } })} max={999} /></div>
                </Card>
              ))}
              <Card className="bg-accent"><Row label={`Nuevas: ${sum(s.newCons)} u.`} value={`Final: ${st.remaining + sum(s.newCons)} u.`} big /></Card>
            </>
          )}

          {s.step === 7 && (
            <>
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success text-success-foreground"><Check className="h-10 w-10" strokeWidth={3} /></div>
                <p className="mt-4 font-display text-2xl font-bold">Visita finalizada</p>
                <p className="text-sm text-muted-foreground">{CLIENT.name}</p>
              </div>
              <Card>
                <Row label="Unidades vendidas" value={`${st.sold} u.`} />
                <Row label="Valor liquidado" value={money(s.charged)} />
                <Row label={`Pago recibido (${s.method})`} value={money(s.payment)} />
                <Row label="Saldo pendiente" value={money(s.balance)} />
                <Row label="Inventario restante" value={`${st.remaining} u.`} />
                <Row label="Nuevas consignadas" value={`${s.consigned} u.`} />
                <div className="mt-2 border-t pt-3"><Row label="Inventario final" value={`${sum(s.inventory)} u.`} big /></div>
              </Card>
            </>
          )}
        </main>

        <footer className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md space-y-2 border-t bg-background/95 p-4 backdrop-blur">
          {s.step === 0 && <Primary onClick={() => go(1)}>Iniciar visita</Primary>}
          {s.step === 1 && <Primary onClick={() => go(2)}>Iniciar liquidación</Primary>}
          {s.step === 2 && <Primary onClick={() => go(3)}>Conciliar inventario</Primary>}
          {s.step === 3 && <Primary disabled={!ok} onClick={() => go(4)}>{ok ? "Confirmar conciliación" : "Corrige las diferencias"}</Primary>}
          {s.step === 4 && <Primary onClick={() => {
            if (!confirm(`¿Confirmar liquidación por ${money(st.total)}? Se cargará a la cuenta del cliente.`)) return;
            up({ balance: s.balance + st.total, charged: st.total, step: 5 }); window.scrollTo(0, 0);
          }}>Confirmar liquidación · {money(st.total)}</Primary>}
          {s.step === 5 && <Primary onClick={() => {
            if (!confirm(`¿Registrar pago de ${money(s.payment)} en ${s.method}?`)) return;
            const inv = Object.fromEntries(PRODUCTS.map((p) => [p.id, s.lines[p.id].physical])) as Inv;
            up({ balance: s.balance - s.payment, inventory: inv, step: 6 }); window.scrollTo(0, 0);
          }}>Registrar pago</Primary>}
          {s.step === 6 && (
            <div className="grid grid-cols-2 gap-2">
              <Secondary onClick={() => { up({ newCons: (Object.fromEntries(PRODUCTS.map((p) => [p.id, 0])) as Inv), consigned: 0 }); go(7); }}><Flag className="h-4 w-4" />Finalizar</Secondary>
              <Primary disabled={sum(s.newCons) === 0} onClick={() => {
                if (!confirm(`¿Consignar ${sum(s.newCons)} unidades?`)) return;
                const inv = Object.fromEntries(PRODUCTS.map((p) => [p.id, s.inventory[p.id] + s.newCons[p.id]])) as Inv;
                up({ inventory: inv, consigned: sum(s.newCons), step: 7 }); window.scrollTo(0, 0);
              }}><PackagePlus className="h-4 w-4" />Consignar</Primary>
            </div>
          )}
          {s.step === 7 && <Secondary onClick={() => setS(initial())}><RotateCcw className="h-4 w-4" />Nueva demostración</Secondary>}
        </footer>
      </div>
    </div>
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
function Secondary({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 font-semibold">{children}</button>;
}
