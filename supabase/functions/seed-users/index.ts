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

  const users = [
    {
      email: "7estrivos@7estrivos.app",
      password: "admin123",
      meta: {
        nome_completo: "Juliana Cristina Ribeiro",
        nome_usuario: "7estrivos",
        telefone: "(16) 99114-9227",
        email_contato: "lgfpesponto@gmail.com",
        cpf_cnpj: "02139487000113",
      },
      role: "admin" as const,
    },
    {
      email: "fernanda@7estrivos.app",
      password: "admin123",
      meta: {
        nome_completo: "Fernanda ADM",
        nome_usuario: "fernanda",
        telefone: "",
        email_contato: "fernanda@7estrivos.com",
        cpf_cnpj: "",
      },
      role: "admin" as const,
    },
    {
      email: "demo@7estrivos.app",
      password: "123456",
      meta: {
        nome_completo: "Revendedor Demo",
        nome_usuario: "demo",
        telefone: "(11) 99999-9999",
        email_contato: "demo@7estrivos.com",
        cpf_cnpj: "12345678900",
      },
      role: "user" as const,
    },
  ];

  const results = [];

  for (const u of users) {
    // Check if user already exists by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((x: any) => x.email === u.email);

    let userId: string;

    if (existing) {
      userId = existing.id;
      results.push({ email: u.email, status: "already_exists", id: userId });
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: u.meta,
      });

      if (error) {
        results.push({ email: u.email, status: "error", error: error.message });
        continue;
      }
      userId = data.user.id;
      results.push({ email: u.email, status: "created", id: userId });
    }

    // Ensure admin role if needed
    if (u.role === "admin") {
      await supabase.from("user_roles").upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role" }
      );
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
