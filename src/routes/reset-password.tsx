import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Nueva contraseña — Visita comercial" }, { name: "description", content: "Restablece la contraseña de tu cuenta de Visita comercial." },
    { property: "og:title", content: "Nueva contraseña — Visita comercial" }, { property: "og:description", content: "Recupera el acceso seguro a tus clientes." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: ResetPassword,
});
function ResetPassword() {
  const navigate = useNavigate();
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const recovery = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    void supabase.auth.getUser().then(({ data }) => setValid(recovery && !!data.user));
  }, []);
  async function submit() {
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError("El enlace venció o la contraseña no es válida. Solicita un nuevo enlace."); setBusy(false); return; }
    await navigate({ to: "/clientes", replace: true });
  }
  return <main className="mx-auto min-h-screen max-w-md space-y-5 bg-background p-5 pt-10"><h1 className="font-display text-2xl font-bold">Nueva contraseña</h1>{!valid ? <><p className="text-sm text-muted-foreground">Abre el enlace de recuperación que recibiste por correo.</p><Button asChild variant="outline"><Link to="/auth" search={{ redirect: "/clientes" }}>Volver al inicio de sesión</Link></Button></> : <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}><label className="block text-sm">Nueva contraseña<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 h-12 w-full rounded-lg border bg-muted/40 px-3" /></label><label className="block text-sm">Confirmar contraseña<input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-2 h-12 w-full rounded-lg border bg-muted/40 px-3" /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy} className="h-12 w-full" type="submit">{busy ? "Guardando…" : "Guardar contraseña"}</Button></form>}</main>;
}