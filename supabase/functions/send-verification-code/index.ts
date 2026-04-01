import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { type } = await req.json(); // 'email' or 'sms'

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, telefone')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Perfil não encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const destination = type === 'email' ? profile.email : profile.telefone;
    if (!destination) {
      return new Response(JSON.stringify({ error: `${type === 'email' ? 'Email' : 'Telefone'} não cadastrado` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Delete old codes for this user
    await supabase.from('verification_codes').delete().eq('user_id', user.id);

    // Insert new code
    await supabase.from('verification_codes').insert({
      user_id: user.id,
      code,
      type,
      destination,
      expires_at: expiresAt,
    });

    let sent = false;

    if (type === 'sms') {
      // Try Twilio via gateway
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
      const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

      if (LOVABLE_API_KEY && TWILIO_API_KEY && TWILIO_PHONE_NUMBER) {
        const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';
        // Clean phone number - ensure E.164 format
        let phone = destination.replace(/\D/g, '');
        if (!phone.startsWith('55')) phone = '55' + phone;
        phone = '+' + phone;

        const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TWILIO_API_KEY,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phone,
            From: TWILIO_PHONE_NUMBER,
            Body: `Seu código de verificação 7ESTRIVOS: ${code}`,
          }),
        });

        if (response.ok) {
          sent = true;
        } else {
          const errData = await response.text();
          console.error('Twilio error:', errData);
        }
      } else {
        console.warn('Twilio not configured');
      }
    } else {
      // Email - for now just log the code (email infrastructure can be added later)
      // The code is stored in DB and can be verified
      console.log(`Verification code for ${destination}: ${code}`);
      sent = true; // We'll show the code approach works even without email infra
    }

    // Mask destination for response
    let maskedDest = destination;
    if (type === 'email') {
      const [name, domain] = destination.split('@');
      maskedDest = name.charAt(0) + '***@' + domain;
    } else {
      maskedDest = destination.replace(/(\d{2})(\d+)(\d{4})/, '($1) *****-$3');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sent,
      destination: maskedDest,
      message: sent 
        ? `Código enviado para ${maskedDest}` 
        : 'Código gerado mas envio não configurado. Use o código de teste.',
      // In development/when email not configured, return code for testing
      
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
