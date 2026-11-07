import { describe, expect, it } from "vitest";
import { authDestination } from "./auth";

describe("Auth destinations", () => {
  it("returns Clientes after sign-in by default", () => { expect(authDestination(undefined)).toBe("/clientes"); });
  it("never redirects to an external destination", () => { expect(authDestination("https://external.example")).toBe("/clientes"); });
});