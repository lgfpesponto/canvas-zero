import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Query database size using service role (has access to pg functions)
    const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;

    // Use the postgres connection to get db size
    // Since we can't easily use pg driver in edge functions, we'll use the REST API
    // to call a simple RPC or estimate from table counts
    
    // Get order count
    const { count: orderCount } = await adminClient
      .from("orders")
      .select("*", { count: "exact", head: true });

    const { count: deletedCount } = await adminClient
      .from("deleted_orders")
      .select("*", { count: "exact", head: true });

    // Estimate size: avg order ~5KB, deleted_orders with jsonb ~10KB each
    // This is a rough estimate since we can't directly query pg_database_size from edge functions
    // A more accurate approach: count rows and estimate based on column types
    const estimatedOrderSizeMb = ((orderCount || 0) * 5) / 1024;
    const estimatedDeletedSizeMb = ((deletedCount || 0) * 10) / 1024;
    const estimatedTotalMb = Math.round((estimatedOrderSizeMb + estimatedDeletedSizeMb) * 10) / 10;

    return new Response(
      JSON.stringify({
        db_size_mb: estimatedTotalMb,
        order_count: orderCount || 0,
        deleted_order_count: deletedCount || 0,
        limit_mb: 500,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
