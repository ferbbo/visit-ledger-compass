import { describe, it, expect } from "vitest";
import { DEMO_LINES, DEMO_NEW, INITIAL_INVENTORY, defaultLines, reconcile, setCount, settlement, sum, CLIENT } from "./visit";

describe("visita demo", () => {
  it("concilia sin diferencias", () => {
    expect(reconcile(INITIAL_INVENTORY, DEMO_LINES).every((r) => r.diff === 0)).toBe(true);
  });
  it("el conteo físico arranca con el inventario registrado", () => {
    const lines = defaultLines(INITIAL_INVENTORY);
    expect(lines.usb).toEqual({ sold: 0, returned: 0, lost: 0, physical: 10 });
    expect(lines.charger.physical).toBe(5);
    expect(reconcile(INITIAL_INVENTORY, lines).every((r) => r.diff === 0)).toBe(true);
  });
  it("registrar una venta baja el conteo físico y mantiene la conciliación", () => {
    const l = setCount(defaultLines(INITIAL_INVENTORY).usb, "sold", 3, INITIAL_INVENTORY.usb);
    expect(l).toEqual({ sold: 3, returned: 0, lost: 0, physical: 7 });
    const lines = { ...defaultLines(INITIAL_INVENTORY), usb: l };
    expect(reconcile(INITIAL_INVENTORY, lines).find((r) => r.product.id === "usb")!.diff).toBe(0);
  });
  it("un conteo físico editado a mano marca la diferencia y no se sobreescribe", () => {
    let l = setCount(defaultLines(INITIAL_INVENTORY).usb, "physical", 6, INITIAL_INVENTORY.usb);
    expect(l.physical).toBe(6);
    l = setCount(l, "sold", 2, INITIAL_INVENTORY.usb);
    expect(l).toEqual({ sold: 2, returned: 0, lost: 0, physical: 6, manual: true });
    expect(reconcile(INITIAL_INVENTORY, { ...defaultLines(INITIAL_INVENTORY), usb: l })
      .find((r) => r.product.id === "usb")!.diff).toBe(2);
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
