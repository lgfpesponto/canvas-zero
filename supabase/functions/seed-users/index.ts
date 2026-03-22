import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results = [];

  try {
    // Test creating just one user
    const { data, error } = await supabase.auth.admin.createUser({
      email: "stefany@7estrivos.app",
      password: "stefany123",
      email_confirm: true,
      user_metadata: {
        nome_completo: "stefany ribeiro feliciano",
        nome_usuario: "stefany",
        telefone: "16994240881",
        email_contato: "stefanyr.mkt@gmail.com",
        cpf_cnpj: "42124889818",
      },
    });

    if (error) {
      results.push({ status: "error", error: error.message });
    } else {
      results.push({ status: "created", id: data.user.id });
    }
  } catch (err) {
    results.push({ status: "exception", error: String(err) });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
