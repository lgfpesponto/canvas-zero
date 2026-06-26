// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN = Deno.env.get("BAGY_WEBHOOK_TOKEN") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: claims, error } = await userClient.auth.getClaims(
    auth.slice("Bearer ".length),
  );
  if (error || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", claims.claims.sub);
  const isAdmin = (roles || []).some((r: any) =>
    r.role === "admin_master" || r.role === "admin_producao"
  );
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const url =
    `${SUPABASE_URL}/functions/v1/bagy-webhook?token=${encodeURIComponent(TOKEN)}`;
  return new Response(
    JSON.stringify({ webhook_url: url, token_set: !!TOKEN }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
