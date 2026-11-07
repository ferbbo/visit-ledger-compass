export function authDestination(value: unknown): "/" | "/clientes" {
  return value === "/" ? "/" : "/clientes";
}