export type ProductId = "usb" | "usbc" | "charger" | "hands";
export type Inv = Record<ProductId, number>;
export type Lines = Record<ProductId, Line>;
export type Product = { id: ProductId; name: string; price: number };
export type Line = { sold: number; returned: number; lost: number; physical: number; manual?: boolean };
export type CountKey = "sold" | "returned" | "lost" | "physical";

export const PRODUCTS: Product[] = [
  { id: "usb", name: "Cable USB", price: 3000 },
  { id: "usbc", name: "Cable USB Tipo C", price: 4000 },
  { id: "charger", name: "Cargador Tipo C", price: 12000 },
  { id: "hands", name: "Manos libres", price: 7000 },
];

export const CLIENT = { name: "Juan Martínez", phone: "+57 300 555 0142", previousBalance: 20000 };

export const INITIAL_INVENTORY: Inv = { usb: 10, usbc: 10, charger: 5, hands: 5 };

export const DEMO_LINES: Lines = {
  usb: { sold: 8, returned: 0, lost: 0, physical: 2 },
  usbc: { sold: 6, returned: 1, lost: 0, physical: 3 },
  charger: { sold: 3, returned: 1, lost: 0, physical: 1 },
  hands: { sold: 2, returned: 0, lost: 1, physical: 2 },
};

export const DEMO_NEW: Inv = { usb: 10, usbc: 5, charger: 2, hands: 3 };

// El conteo físico arranca con lo que hay registrado en inventario.
export const defaultLines = (inv: Inv): Lines =>
  Object.fromEntries(PRODUCTS.map((p) => [p.id, { sold: 0, returned: 0, lost: 0, physical: inv[p.id] }])) as Lines;

// Al registrar vendidas/devueltas/mermas, el conteo físico se ajusta solo
// (inventario − movimientos). Editarlo a mano lo deja como conteo real.
export function setCount(prev: Line, k: keyof Line, v: number, available: number): Line {
  const clamp = (n: number) => Math.max(0, Math.min(available, n));
  const next: Line = { ...prev, [k]: clamp(v) };
  if (k !== "physical") next.physical = Math.max(0, available - next.sold - next.returned - next.lost);
  return next;
}

export const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

export function difference(available: number, l: Line) {
  return available - l.sold - l.returned - l.lost - l.physical;
}

export function reconcile(inv: Inv, lines: Lines) {
  return PRODUCTS.map((p) => ({ product: p, diff: difference(inv[p.id], lines[p.id]) }));
}

export function settlement(lines: Lines) {
  let sold = 0, returned = 0, lost = 0, remaining = 0, total = 0;
  for (const p of PRODUCTS) {
    const l = lines[p.id];
    sold += l.sold; returned += l.returned; lost += l.lost; remaining += l.physical;
    total += l.sold * p.price; // mermas y devoluciones no generan cargo
  }
  return { sold, returned, lost, remaining, total };
}

export const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
