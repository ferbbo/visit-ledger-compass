import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useClients } from "@/components/clients-provider";
import { supabase } from "@/integrations/supabase/client";

export function AccountControl() {
  const { userId, loading } = useClients();
  const router = useRouter();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true); setError("");
    await router.options.context.queryClient.cancelQueries();
    router.options.context.queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { setError("No se pudo cerrar sesión."); setBusy(false); return; }
    await navigate({ to: "/auth", search: { redirect: "/clientes" }, replace: true });
  }
  if (loading) return null;
  return <div>{userId ? <Button variant="ghost" size="icon" disabled={busy} aria-label="Cerrar sesión" title="Cerrar sesión" onClick={() => void signOut()}><LogOut /></Button> : <Button asChild variant="ghost"><Link to="/auth" search={{ redirect: "/clientes" }}><LogIn />Iniciar sesión</Link></Button>}{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}