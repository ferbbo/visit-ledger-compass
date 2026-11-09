// Pruebas sobre el catálogo base: se accede a productos conocidos por nombre.
// @ts-nocheck
import { describe, it, expect } from "vitest";
import {
  CLIENT, DEMO_LINES, DEMO_NEW, INITIAL_INVENTORY, METHODS, defaultLines, initialState, loadState, reconcile, setCount, settlement, sum,
} from "./visit";

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

describe("estado guardado", () => {
  const broken = [
    null,
    "",
    "no es json",
    "{}",
    '{"startInventory":{"usb":10}}',
    '{"lines":null,"method":"Bitcoin","step":99}',
    '{"lines":{"usb":{"sold":"3","physical":99}}}',
    '{"step":-5,"payment":"70000","newCons":null,"consigned":"x"}',
    '{"startInventory":null,"inventory":7,"lines":[1,2]}',
  ];
  it.each(broken)("ningún estado guardado (%s) deja huecos en la visita", (raw) => {
    const s = loadState(raw);
    for (const id of ["usb", "usbc", "charger", "hands"] as const) {
      expect(typeof s.lines[id]?.physical).toBe("number");
      expect(Number.isFinite(s.inventory[id])).toBe(true);
      expect(Number.isFinite(s.startInventory[id])).toBe(true);
      expect(Number.isFinite(s.newCons[id])).toBe(true);
    }
    expect(s.step).toBeGreaterThanOrEqual(0);
    expect(s.step).toBeLessThan(8);
    expect(METHODS).toContain(s.method);
    expect(reconcile(s.startInventory, s.lines).length).toBe(4);
    expect(Number.isFinite(settlement(s.lines).total)).toBe(true);
  });
  it("un estado sin 'lines' no revienta la conciliación ni la liquidación", () => {
    expect(reconcile(undefined, undefined).every((r) => r.diff === 0)).toBe(true);
    expect(settlement(undefined)).toEqual({ sold: 0, returned: 0, lost: 0, remaining: 0, total: 0 });
  });
  it("una visita antigua conserva lo anotado y completa la Física con el inventario", () => {
    const s = loadState(JSON.stringify({
      step: 2,
      startInventory: INITIAL_INVENTORY,
      lines: { usb: { sold: 3, returned: 0, lost: 0, physical: 7 }, usbc: { sold: 0, returned: 0, lost: 0, physical: 0 } },
    }));
    expect(s.lines.usb).toEqual({ sold: 3, returned: 0, lost: 0, physical: 7, manual: false });
    expect(s.lines.usbc.physical).toBe(10);
    expect(s.lines.charger.physical).toBe(5);
    expect(s.lines.hands.physical).toBe(5);
    expect(s.step).toBe(2);
    expect(s.payment).toBe(70000);
  });
  it("ajusta lo imposible: paso, medio de pago y conteos pasados de stock", () => {
    const s = loadState('{"step":99,"method":"Bitcoin","lines":{"usb":{"sold":1,"physical":99}}}');
    expect(s.step).toBe(7);
    expect(s.method).toBe("Efectivo");
    expect(s.lines.usb.physical).toBe(10);
    expect(loadState('{"step":-5}').step).toBe(0);
  });
  it("sin nada guardado arranca con la visita nueva y conciliada", () => {
    const s = loadState(null);
    expect(s).toEqual(initialState());
    expect(reconcile(s.startInventory, s.lines).every((r) => r.diff === 0)).toBe(true);
  });
});

import { searchClients as _sc, openClient as _oc, saveClient as _sv, initialState as _is } from "./visit";
describe("búsqueda de clientes", () => {
  it("reconstruye la visita de un cliente creado sin perder su inventario", () => {
    const clients = [{ id: "nuevo", name: "Cliente nuevo", phone: "3001234567", city: "Cali", previousBalance: 0, inventory: { usb: 4, usbc: 0, charger: 0, hands: 0 } }];
    const state = _oc(_is(clients), "nuevo", clients);
    const restored = loadState(JSON.stringify({ ...state, view: "cons" }), clients);
    expect(restored.clientId).toBe("nuevo");
    expect(restored.inventory.usb).toBe(4);
    expect(restored.book['nuevo']?.balance).toBe(0);
    expect(_sc("nuevo", clients).map((c) => c.id)).toEqual(["nuevo"]);
  });
  it("un cliente eliminado no reaparece al restaurar su visita", () => {
    const restored = loadState(JSON.stringify(_oc(_is(), "c1")), []);
    expect(restored.clientId).toBe(null);
    expect(restored.book).toEqual({});
    expect(restored.view).toBe("home");
  });
  it("encuentra sin tildes ni mayúsculas", () => { expect(_sc("medellin").map((c) => c.id)).toEqual(["c3"]); });
  it("encuentra por teléfono", () => { expect(_sc("0198").map((c) => c.id)).toEqual(["c2"]); });
  it("guarda el saldo del cliente al volver", () => {
    const s = _sv({ ..._oc(_is(), "c2"), balance: 5000 });
    expect(_oc(s, "c2").balance).toBe(5000);
  });
});
