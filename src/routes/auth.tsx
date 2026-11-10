import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthScreen } from "@/components/auth-screen";
import { authDestination } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({ redirect: authDestination(search['redirect']) }),
  head: () => ({ meta: [
    { title: "Iniciar sesión — Visita comercial" },
    { name: "description", content: "Accede a tu cuenta y administra tus clientes privados." },
    { property: "og:title", content: "Iniciar sesión — Visita comercial" },
    { property: "og:description", content: "Acceso seguro a tus clientes y consignaciones." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  return <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
    <header className="flex items-center gap-3 border-b p-4"><Button asChild variant="ghost" size="icon"><Link to="/" aria-label="Volver al inicio"><ChevronLeft /></Link></Button><span className="font-display text-xl font-bold">Visita comercial</span></header>
    <AuthScreen redirect={redirect} />
  </div>;
}
