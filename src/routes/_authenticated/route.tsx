import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authDestination } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw redirect({ to: "/auth", search: { redirect: authDestination(location.pathname) } });
  },
  component: Outlet,
});