import { describe, it, expect } from "vitest";
import { DEMO_LINES, DEMO_NEW, INITIAL_INVENTORY, reconcile, settlement, sum, CLIENT } from "./visit";

describe("visita demo", () => {
  it("concilia sin diferencias", () => {
    expect(reconcile(INITIAL_INVENTORY, DEMO_LINES).every((r) => r.diff === 0)).toBe(true);
  });
  it("detecta diferencia", () => {
    const lines = { ...DEMO_LINES, usb: { ...DEMO_LINES.usb, physical: 1 } };
    expect(reconcile(INITIAL_INVENTORY, lines).find((r) => r.product.id === "usb")!.diff).toBe(1);
  });
  it("liquida $98.000 (precios × vendidas) sin cobrar mermas", () => {
    const s = settlement(DEMO_LINES);
    expect(s).toEqual({ sold: 19, returned: 2, lost: 1, remaining: 8, total: 98000 });
  });
  it("saldo pendiente 48.000 e inventario final 28", () => {
    const s = settlement(DEMO_LINES);
    expect(CLIENT.previousBalance + s.total - 70000).toBe(48000);
    expect(s.remaining + sum(DEMO_NEW)).toBe(28);
  });
});
