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
      email: "site@7estrivos.app", password: "156651",
      meta: { nome_completo: "Rancho Chique", nome_usuario: "site", telefone: "16991344590", email_contato: "suporte7estrivos@gmail.com", cpf_cnpj: "26830599814" },
    },
    {
      email: "gabi@7estrivos.app", password: "gabi123",
      meta: { nome_completo: "Maria Gabriela", nome_usuario: "gabi", telefone: "16 99344-4945", email_contato: "gabiplacido1906@hotmail.com", cpf_cnpj: "474.084.698-50" },
    },
    {
      email: "rafa@7estrivos.app", password: "rafa123",
      meta: { nome_completo: "Rafael Silva", nome_usuario: "rafa", telefone: "16 99284-9865", email_contato: "rafaelsplacido@hotmail.com", cpf_cnpj: "443.985.348-06" },
    },
    {
      email: "denise@7estrivos.app", password: "denise123",
      meta: { nome_completo: "Denise Garcia Feliciano", nome_usuario: "denise", telefone: "16 99154-7740", email_contato: "denisegfeliciano@gmail.com", cpf_cnpj: "290.564.758-27" },
    },
    {
      email: "samuel@7estrivos.app", password: "samuel123",
      meta: { nome_completo: "Samuel Silva Plácido", nome_usuario: "samuel", telefone: "16 99113-6042", email_contato: "samuelsilvaplacido@gmail.com", cpf_cnpj: "472.701.008-96" },
    },
    {
      email: "larissa@7estrivos.app", password: "larissa123",
      meta: { nome_completo: "Larissa Silva", nome_usuario: "larissa", telefone: "16 99345-2386", email_contato: "lalaplacido2018@gmail.com", cpf_cnpj: "472.701.188-33" },
    },
    {
      email: "fabi@7estrivos.app", password: "fabi123",
      meta: { nome_completo: "Fabiana Silva", nome_usuario: "fabi", telefone: "16 99313-3977", email_contato: "fabisilva78@hotmail.com", cpf_cnpj: "281.307.198-60" },
    },
  ];

  const results = [];

  for (const u of users) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: u.meta,
      });

      if (error) {
        results.push({ email: u.email, status: "error", error: error.message });
      } else {
        results.push({ email: u.email, status: "created", id: data.user.id });
      }
    } catch (err) {
      results.push({ email: u.email, status: "exception", error: String(err) });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
