import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ClientsProvider, useClients } from "@/components/clients-provider";

const mocked = vi.hoisted(() => ({
  user: "account-a" as string | null,
  listener: (_event: string) => {},
  owners: [] as string[],
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: {
    getUser: async () => ({ data: { user: mocked.user ? { id: mocked.user } : null }, error: null }),
    onAuthStateChange: (listener: (event: string) => void) => { mocked.listener = listener; return { data: { subscription: { unsubscribe() {} } } }; },
  },
  from: () => ({ select: () => ({ eq: (_key: string, owner: string) => {
    mocked.owners.push(owner);
    return { order: () => ({ then: (ok: (v: unknown) => unknown) => Promise.resolve({ error: null, data: [] }).then(ok), range: async () => ({ error: null, data: [{ id: owner, name: `Cliente ${owner}`, phone: "", city: "", balance: 0, inventory: {} }] }) }) };
  } }) }),
} }));
function Directory() {
  const { clients, loading } = useClients();
  return <div>{loading ? "loading" : clients.map((c) => c.name).join(",")}</div>;
}
afterEach(cleanup);
it("replaces private clients when accounts change and clears them on sign-out", async () => {
  render(<ClientsProvider><Directory /></ClientsProvider>);
  await screen.findByText("Cliente account-a");
  act(() => { mocked.user = "account-b"; mocked.listener("SIGNED_IN"); });
  await screen.findByText("Cliente account-b");
  expect(screen.queryByText("Cliente account-a")).not.toBeInTheDocument();
  expect(mocked.owners).toEqual(["account-a", "account-b"]);
  act(() => { mocked.user = null; mocked.listener("SIGNED_OUT"); });
  await waitFor(() => expect(screen.queryByText("loading")).not.toBeInTheDocument());
  expect(screen.queryByText("Cliente account-b")).not.toBeInTheDocument();
});