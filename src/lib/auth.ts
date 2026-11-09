export type AuthDestination = "/" | "/clientes" | "/catalogo";
export function authDestination(value: unknown): AuthDestination {
  return value === "/" || value === "/catalogo" ? value : "/clientes";
}
