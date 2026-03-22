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
      id: "41b2324e-ac6d-4b11-a74d-346137660e23",
      email: "7estrivos@7estrivos.app",
      password: "admin123",
      meta: { nome_completo: "Juliana Cristina Ribeiro", nome_usuario: "7estrivos", telefone: "(16) 99114-9227", email_contato: "lgfpesponto@gmail.com", cpf_cnpj: "02139487000113" },
      role: "admin" as const,
    },
    {
      id: "3ccc3488-a391-47d6-917d-e2f1b0ea2596",
      email: "fernanda@7estrivos.app",
      password: "admin123",
      meta: { nome_completo: "Fernanda ADM", nome_usuario: "fernanda", telefone: "16997391071", email_contato: "expedicaoestrivos@gmail.com", cpf_cnpj: "" },
      role: "admin" as const,
    },
    {
      id: "62a6c0da-33f3-43e2-b58e-1b5ff0e2dd6b",
      email: "demo@7estrivos.app",
      password: "123456",
      meta: { nome_completo: "Revendedor Demo", nome_usuario: "demo", telefone: "(11) 99999-9999", email_contato: "demo@7estrivos.com", cpf_cnpj: "12345678900" },
      role: "user" as const,
    },
    {
      id: "d7d881ba-de02-43a9-9da8-76f8528b7865",
      email: "stefany@7estrivos.app",
      password: "stefany123",
      meta: { nome_completo: "stefany ribeiro feliciano", nome_usuario: "stefany", telefone: "16994240881", email_contato: "stefanyr.mkt@gmail.com", cpf_cnpj: "42124889818" },
      role: "user" as const,
    },
    {
      id: "182c0b50-ea91-41e6-9b31-2afd9e81e884",
      email: "site@7estrivos.app",
      password: "156651",
      meta: { nome_completo: "Rancho Chique", nome_usuario: "site", telefone: "16991344590", email_contato: "suporte7estrivos@gmail.com", cpf_cnpj: "26830599814" },
      role: "user" as const,
    },
    {
      id: "f84f3538-01e1-41c1-bd72-3d81b9479f56",
      email: "gabi@7estrivos.app",
      password: "gabi123",
      meta: { nome_completo: "Maria Gabriela", nome_usuario: "gabi", telefone: "16 99344-4945", email_contato: "gabiplacido1906@hotmail.com", cpf_cnpj: "474.084.698-50" },
      role: "user" as const,
    },
    {
      id: "60cda917-f177-4305-8d6b-bbcb1ac6f212",
      email: "rafa@7estrivos.app",
      password: "rafa123",
      meta: { nome_completo: "Rafael Silva", nome_usuario: "rafa", telefone: "16 99284-9865", email_contato: "rafaelsplacido@hotmail.com", cpf_cnpj: "443.985.348-06" },
      role: "user" as const,
    },
    {
      id: "16e6aa2b-4db5-4431-9940-af091edd68e8",
      email: "denise@7estrivos.app",
      password: "denise123",
      meta: { nome_completo: "Denise Garcia Feliciano", nome_usuario: "denise", telefone: "16 99154-7740", email_contato: "denisegfeliciano@gmail.com", cpf_cnpj: "290.564.758-27" },
      role: "user" as const,
    },
    {
      id: "99d43733-a318-4b57-832c-c5932f2bb910",
      email: "samuel@7estrivos.app",
      password: "samuel123",
      meta: { nome_completo: "Samuel Silva Plácido", nome_usuario: "samuel", telefone: "16 99113-6042", email_contato: "samuelsilvaplacido@gmail.com", cpf_cnpj: "472.701.008-96" },
      role: "user" as const,
    },
    {
      id: "ad2ecdf4-44e8-4417-af5a-a0bb8999c109",
      email: "larissa@7estrivos.app",
      password: "larissa123",
      meta: { nome_completo: "Larissa Silva", nome_usuario: "larissa", telefone: "16 99345-2386", email_contato: "lalaplacido2018@gmail.com", cpf_cnpj: "472.701.188-33" },
      role: "user" as const,
    },
    {
      id: "466aa402-3a22-4c89-a10b-62b2457236ba",
      email: "fabi@7estrivos.app",
      password: "fabi123",
      meta: { nome_completo: "Fabiana Silva", nome_usuario: "fabi", telefone: "16 99313-3977", email_contato: "fabisilva78@hotmail.com", cpf_cnpj: "281.307.198-60" },
      role: "user" as const,
    },
  ];

  const results = [];

  // Fetch all existing users once
  const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existingEmails = new Map((existingUsers?.users || []).map((x: any) => [x.email, x.id]));

  for (const u of users) {
    try {
      let userId: string;

      if (existingEmails.has(u.email)) {
        userId = existingEmails.get(u.email)!;
        results.push({ email: u.email, status: "already_exists", id: userId });
      } else {
        console.log(`Creating user: ${u.email}`);
        const { data, error } = await supabase.auth.admin.createUser({
          id: u.id,
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: u.meta,
        });

        if (error) {
          console.error(`Error creating ${u.email}:`, error.message);
          results.push({ email: u.email, status: "error", error: error.message });
          continue;
        }
        userId = data.user.id;
        results.push({ email: u.email, status: "created", id: userId });
      }

      // Upsert profile
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: userId,
        nome_usuario: u.meta.nome_usuario,
        nome_completo: u.meta.nome_completo,
        email: u.meta.email_contato,
        telefone: u.meta.telefone,
        cpf_cnpj: u.meta.cpf_cnpj,
        verificado: true,
      }, { onConflict: "id" });
      if (profileErr) console.error(`Profile error for ${u.email}:`, profileErr.message);

      if (u.role === "admin") {
        await supabase.from("user_roles").upsert(
          { user_id: userId, role: "admin" },
          { onConflict: "user_id,role" }
        );
      }
    } catch (err) {
      console.error(`Exception for ${u.email}:`, err);
      results.push({ email: u.email, status: "exception", error: String(err) });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
