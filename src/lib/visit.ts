export type ProductId = "usb" | "usbc" | "charger" | "hands";
export type Inv = Record<ProductId, number>;
export type Lines = Record<ProductId, Line>;
export type Product = { id: ProductId; name: string; price: number };
export type Line = { sold: number; returned: number; lost: number; physical: number; manual?: boolean };
export type CountKey = "sold" | "returned" | "lost" | "physical";

export type State = {
  step: number;
  inventory: Inv;
  startInventory: Inv;
  lines: Lines;
  balance: number; // cuenta corriente
  charged: number;
  payment: number;
  method: string;
  newCons: Inv;
  consigned: number;
  view: View;
  validate: boolean; // conteo físico opcional
  clientId: string | null; // null = dashboard de búsqueda
  book: Book; // inventario y saldo guardado por cliente
};
export type View = "home" | "liq" | "cons";
export const LIQ_STEPS = ["Registro", "Resumen", "Pago", "Listo"];

export const PRODUCTS: Product[] = [
  { id: "usb", name: "Cable USB", price: 3000 },
  { id: "usbc", name: "Cable USB Tipo C", price: 4000 },
  { id: "charger", name: "Cargador Tipo C", price: 12000 },
  { id: "hands", name: "Manos libres", price: 7000 },
];

export type Client = { id: string; name: string; phone: string; city: string; previousBalance: number; inventory: Inv };
export const CLIENTS: Client[] = [
  { id: "c1", name: "Juan Martínez", phone: "+57 300 555 0142", city: "Bogotá · Chapinero", previousBalance: 20000, inventory: { usb: 10, usbc: 10, charger: 5, hands: 5 } },
  { id: "c2", name: "Celulares La 14", phone: "+57 301 555 0198", city: "Cali · Centro", previousBalance: 0, inventory: { usb: 6, usbc: 8, charger: 3, hands: 4 } },
  { id: "c3", name: "Tecno Ana Gómez", phone: "+57 310 555 0177", city: "Medellín · Laureles", previousBalance: 45000, inventory: { usb: 12, usbc: 6, charger: 2, hands: 6 } },
  { id: "c4", name: "Variedades Pedro", phone: "+57 315 555 0110", city: "Bogotá · Suba", previousBalance: 8000, inventory: { usb: 4, usbc: 4, charger: 4, hands: 2 } },
];
export const CLIENT: Client = CLIENTS[0]!;
export const clientById = (id: string | null | undefined, clients = CLIENTS) => clients.find((c) => c.id === id);
export type Book = Record<string, { inventory: Inv; balance: number }>;
export const initialBook = (clients = CLIENTS): Book =>
  Object.fromEntries(clients.map((c) => [c.id, { inventory: { ...c.inventory }, balance: c.previousBalance }]));
// Filtra por nombre, teléfono o ciudad, sin importar tildes ni mayúsculas.
const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const searchClients = (q: string, clients = CLIENTS) => {
  const n = norm(q.trim()); const d = q.replace(/\D/g, "");
  return clients.filter((c) => !n || norm(c.name).includes(n) || norm(c.city).includes(n) || (d.length > 0 && c.phone.replace(/\D/g, "").includes(d)));
};

export const INITIAL_INVENTORY: Inv = { usb: 10, usbc: 10, charger: 5, hands: 5 };

export const DEMO_LINES: Lines = {
  usb: { sold: 8, returned: 0, lost: 0, physical: 2 },
  usbc: { sold: 6, returned: 1, lost: 0, physical: 3 },
  charger: { sold: 3, returned: 1, lost: 0, physical: 1 },
  hands: { sold: 2, returned: 0, lost: 1, physical: 2 },
};

export const DEMO_NEW: Inv = { usb: 10, usbc: 5, charger: 2, hands: 3 };

export const STEPS = ["Cliente", "Inventario", "Liquidación", "Conciliación", "Resumen", "Pago", "Consignación", "Fin"];
export const METHODS = ["Efectivo", "Transferencia", "Nequi"] as const;
const isMethod = (m: unknown) => (METHODS as readonly string[]).includes(String(m));

const EMPTY_INV: Inv = { usb: 0, usbc: 0, charger: 0, hands: 0 };

// El conteo físico arranca con lo que hay registrado en inventario.
export const defaultLines = (inv: Inv | undefined): Lines =>
  Object.fromEntries(PRODUCTS.map((p) => [p.id, { sold: 0, returned: 0, lost: 0, physical: inv?.[p.id] ?? 0 }])) as Lines;

// Al registrar vendidas/devueltas/mermas, el conteo físico se ajusta solo
// (inventario − movimientos). Editarlo a mano lo deja como conteo real del cliente.
export function setCount(prev: Line, k: CountKey, v: number, available: number): Line {
  const clamp = (n: number) => Math.max(0, Math.min(available, n));
  const next: Line = { ...prev, [k]: clamp(v) };
  if (k === "physical") next.manual = true;
  else if (!prev.manual) next.physical = Math.max(0, available - next.sold - next.returned - next.lost);
  return next;
}

const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const clampNum = (v: unknown, max: number) => Math.max(0, Math.min(Math.max(0, Math.round(max)), Math.round(num(v, 0))));

const invOf = (v: unknown, fallback: Inv): Inv =>
  Object.fromEntries(PRODUCTS.map((p) => {
    const raw = (v as Record<string, unknown> | null | undefined)?.[p.id];
    return [p.id, clampNum(raw ?? fallback[p.id], 9999)];
  })) as Inv;

// Cualquier estado guardado (o corrupto) se reconstruye completo: nunca se confía
// en que localStorage tenga todas las claves ni los productos.
export function loadState(raw: string | null, clients = CLIENTS): State {
  const base = initialState(clients);
  if (!raw) return base;
  let v: Partial<State> | null;
  try { v = JSON.parse(raw) as Partial<State>; } catch { return base; }
  if (!v || typeof v !== "object" || Array.isArray(v)) return base;

  const startInventory = invOf(v.startInventory, base.startInventory);
  const rawLines = (v.lines && typeof v.lines === "object" ? v.lines : {}) as Record<string, Partial<Line> | undefined>;
  const lines = Object.fromEntries(PRODUCTS.map((p) => {
    const src = rawLines[p.id] ?? {};
    const available = startInventory[p.id];
    const sold = clampNum(src.sold, available);
    const returned = clampNum(src.returned, available);
    const lost = clampNum(src.lost, available);
    const manual = src.manual === true;
    const physical = manual ? clampNum(src.physical, available) : (sold || returned || lost) ? clampNum(src.physical, available) : available;
    return [p.id, { sold, returned, lost, physical, manual }];
  })) as Lines;

  const balance = Math.round(num(v.balance, base.balance));
  return {
    step: Math.max(0, Math.min(STEPS.length - 1, Math.round(num(v.step, 0)))),
    inventory: invOf(v.inventory, startInventory),
    startInventory,
    lines,
    balance,
    charged: clampNum(v.charged, 999999999),
    payment: v.payment == null ? base.payment : clampNum(v.payment, 999999999),
    method: isMethod(v.method) ? String(v.method) : METHODS[0],
    newCons: invOf(v.newCons, EMPTY_INV),
    consigned: clampNum(v.consigned, 999999999),
    view: clientById(v.clientId, clients) && (v.view === "liq" || v.view === "cons") ? v.view : "home",
    validate: v.validate === true,
    clientId: clientById(v.clientId, clients) ? String(v.clientId) : null,
    book: Object.fromEntries(clients.map((c) => {
      const e = (v.book && typeof v.book === "object" ? (v.book as Record<string, unknown>)[c.id] : undefined) as { inventory?: unknown; balance?: unknown } | undefined;
      return [c.id, { inventory: invOf(e?.inventory, c.inventory), balance: Math.round(num(e?.balance, c.previousBalance)) }];
    })),
  };
}

export function initialState(clients = CLIENTS): State {
  return {
    step: 0,
    inventory: { ...INITIAL_INVENTORY },
    startInventory: { ...INITIAL_INVENTORY },
    lines: defaultLines(INITIAL_INVENTORY),
    balance: CLIENT.previousBalance,
    charged: 0,
    payment: 70000,
    method: METHODS[0],
    newCons: { ...EMPTY_INV },
    consigned: 0,
    view: "home",
    validate: false,
    clientId: null,
    book: initialBook(clients),
  };
}

// Abre la ficha del cliente con su inventario y saldo guardados.
export function openClient(s: State, id: string, clients = CLIENTS): State {
  const e = s.book[id] ?? initialBook(clients)[id];
  if (!e) return s;
  return { ...s, clientId: id, view: "home", step: 0, inventory: { ...e.inventory }, startInventory: { ...e.inventory },
    lines: defaultLines(e.inventory), balance: e.balance, charged: 0, payment: 0, validate: false, newCons: { ...EMPTY_INV }, consigned: 0 };
}
// Guarda lo hecho en la visita dentro del libro del cliente.
export const saveClient = (s: State): State =>
  s.clientId ? { ...s, book: { ...s.book, [s.clientId]: { inventory: { ...s.inventory }, balance: s.balance } } } : s;

export const sum = (o: Record<string, number> | undefined) =>
  o ? Object.values(o).reduce((a, b) => a + (Number(b) || 0), 0) : 0;

const safeLine = (l: Line | undefined): Line => l ?? { sold: 0, returned: 0, lost: 0, physical: 0 };

export function difference(available: number, l: Line | undefined) {
  const x = safeLine(l);
  return available - x.sold - x.returned - x.lost - x.physical;
}

export function reconcile(inv: Inv | undefined, lines: Lines | undefined) {
  return PRODUCTS.map((p) => ({ product: p, diff: difference(inv?.[p.id] ?? 0, lines?.[p.id]) }));
}

export function settlement(lines: Lines | undefined) {
  let sold = 0, returned = 0, lost = 0, remaining = 0, total = 0;
  for (const p of PRODUCTS) {
    const l = safeLine(lines?.[p.id]);
    sold += l.sold; returned += l.returned; lost += l.lost; remaining += l.physical;
    total += l.sold * p.price; // mermas y devoluciones no generan cargo
  }
  return { sold, returned, lost, remaining, total };
}

export const money = (n: number) => "$" + Math.round(num(n)).toLocaleString("es-CO");
