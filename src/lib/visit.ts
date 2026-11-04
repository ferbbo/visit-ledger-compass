export type Product = { id: string; name: string; price: number };
export type Line = { sold: number; returned: number; lost: number; physical: number };

export const PRODUCTS: Product[] = [
  { id: "usb", name: "Cable USB", price: 3000 },
  { id: "usbc", name: "Cable USB Tipo C", price: 4000 },
  { id: "charger", name: "Cargador Tipo C", price: 12000 },
  { id: "hands", name: "Manos libres", price: 7000 },
];

export const CLIENT = { name: "Juan Martínez", phone: "+57 300 555 0142", previousBalance: 20000 };

export const INITIAL_INVENTORY: Record<string, number> = { usb: 10, usbc: 10, charger: 5, hands: 5 };

export const DEMO_LINES: Record<string, Line> = {
  usb: { sold: 8, returned: 0, lost: 0, physical: 2 },
  usbc: { sold: 6, returned: 1, lost: 0, physical: 3 },
  charger: { sold: 3, returned: 1, lost: 0, physical: 1 },
  hands: { sold: 2, returned: 0, lost: 1, physical: 2 },
};

export const DEMO_NEW: Record<string, number> = { usb: 10, usbc: 5, charger: 2, hands: 3 };

export const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

export function difference(available: number, l: Line) {
  return available - l.sold - l.returned - l.lost - l.physical;
}

export function reconcile(inv: Record<string, number>, lines: Record<string, Line>) {
  return PRODUCTS.map((p) => ({ product: p, diff: difference(inv[p.id] ?? 0, lines[p.id]) }));
}

export function settlement(lines: Record<string, Line>) {
  let sold = 0, returned = 0, lost = 0, remaining = 0, total = 0;
  for (const p of PRODUCTS) {
    const l = lines[p.id];
    sold += l.sold; returned += l.returned; lost += l.lost; remaining += l.physical;
    total += l.sold * p.price; // mermas y devoluciones no generan cargo
  }
  return { sold, returned, lost, remaining, total };
}

export const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
