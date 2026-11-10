import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { authDestination, type AuthDestination } from "@/lib/auth";

// La misma pantalla de acceso se muestra en /auth y en el inicio cuando no hay sesión.
export function AuthScreen({ redirect }: { redirect: AuthDestination }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const destination = authDestination(sessionStorage.getItem("auth-destination") ?? redirect);
        sessionStorage.removeItem("auth-destination");
        void navigate({ to: destination, replace: true });
      }
    });
  }, [navigate, redirect]);

  function changeMode(next: typeof mode) { setMode(next); setError(""); setMessage(""); setPassword(""); }

  async function submit() {
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "forgot") {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw result.error;
        setMessage("Si el correo tiene una cuenta, recibirás un enlace para cambiar la contraseña.");
      } else if (mode === "signup") {
        const result = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
        if (result.error) throw result.error;
        if (result.data.session) await navigate({ to: redirect, replace: true });
        else setMessage("Revisa tu correo y confirma tu cuenta antes de iniciar sesión.");
      } else {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
        await navigate({ to: redirect, replace: true });
      }
    } catch { setError(mode === "login" ? "No pudimos iniciar sesión. Revisa el correo, la contraseña y la confirmación de tu cuenta." : "No se pudo completar la solicitud. Revisa los datos e intenta de nuevo."); }
    finally { setBusy(false); }
  }

  async function social(provider: "google" | "lovable") {
    setBusy(true); setError("");
    try {
      sessionStorage.setItem("auth-destination", redirect);
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
      if (result.error) throw result.error;
      if (!result.redirected) {
        const { data } = await supabase.auth.getUser();
        if (data.user) await navigate({ to: redirect, replace: true });
      }
    } catch { setError("No se pudo iniciar sesión. Intenta de nuevo."); }
    finally { setBusy(false); }
  }

  return (
    <>
      <main className="flex-1 space-y-6 p-5 pb-28">
        <LockKeyhole className="mt-6 h-10 w-10 text-primary" />
        <div><h1 className="font-display text-2xl font-bold">{mode === "login" ? "Iniciar sesión" : mode === "signup" ? "Crear cuenta" : "Recuperar contraseña"}</h1><p className="mt-2 text-sm text-muted-foreground">Tus clientes, saldos e inventarios son privados.</p></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="text-sm text-success">{message}</p>}
        <form id="auth-form" className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <div><label htmlFor="email" className="mb-2 block text-sm font-medium">Correo electrónico</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-lg border bg-muted/40 px-3 outline-none focus:ring-2 focus:ring-ring" /></div>
          {mode !== "forgot" && <div><label htmlFor="password" className="mb-2 block text-sm font-medium">Contraseña</label><div className="relative"><input id="password" type={visible ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-lg border bg-muted/40 pl-3 pr-12 outline-none focus:ring-2 focus:ring-ring" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1.5" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} title={visible ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</Button></div>{mode === "signup" && <p className="mt-2 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>}</div>}
        </form>
        {mode === "login" && <Button variant="link" disabled={busy} onClick={() => changeMode("forgot")}>¿Olvidaste tu contraseña?</Button>}
        {mode !== "forgot" && <div className="space-y-3 border-t pt-5"><Button variant="outline" className="h-12 w-full" disabled={busy} onClick={() => void social("google")}>Continuar con Google</Button><Button variant="outline" className="h-12 w-full" disabled={busy} onClick={() => void social("lovable")}>Continuar con Lovable</Button></div>}
        <Button variant="link" className="w-full" disabled={busy} onClick={() => changeMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Crear una cuenta" : "Ya tengo cuenta · Iniciar sesión"}</Button>
      </main>
      <footer className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-background p-4"><Button type="submit" form="auth-form" disabled={busy} className="h-12 w-full"><Mail />{busy ? "Espera…" : mode === "login" ? "Iniciar sesión" : mode === "signup" ? "Crear cuenta" : "Enviar enlace"}</Button></footer>
    </>
  );
}
