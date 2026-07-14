// Endpoint público para receber pedidos aprovados do site atacado.7estrivos.com.br
// Autenticação: Bearer ATACADO_INGEST_TOKEN
// Cria pedidos atribuídos a Juliana Cristina Ribeiro, cliente = cliente_nome.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VENDEDOR_FIXO = "Juliana Cristina Ribeiro";

// ---------- Schema ----------
const FichaCamposSchema = z
  .object({
    modelo: z.string().optional(),
    solado: z.string().optional(),
    formatoBico: z.string().optional(),
    corVira: z.string().optional(),
    couroCano: z.string().optional(),
    couroGaspea: z.string().optional(),
    couroTaloneira: z.string().optional(),
    corCouroCano: z.string().optional(),
    corCouroGaspea: z.string().optional(),
    corCouroTaloneira: z.string().optional(),
    bordadoCano: z.string().optional(),
    bordadoGaspea: z.string().optional(),
    bordadoTaloneira: z.string().optional(),
    corBordadoCano: z.string().optional(),
    corBordadoGaspea: z.string().optional(),
    corBordadoTaloneira: z.string().optional(),
    bordadoVariadoDescCano: z.string().optional(),
    bordadoVariadoDescGaspea: z.string().optional(),
    bordadoVariadoDescTaloneira: z.string().optional(),
    personalizacaoNome: z.string().optional(),
    personalizacaoBordado: z.string().optional(),
    nomeBordadoDesc: z.string().optional(),
    corLinha: z.string().optional(),
    corBorrachinha: z.string().optional(),
    trisce: z.string().optional(),
    triceDesc: z.string().optional(),
    tiras: z.string().optional(),
    tirasDesc: z.string().optional(),
    metais: z.string().optional(),
    tipoMetal: z.string().optional(),
    corMetal: z.string().optional(),
    acessorios: z.string().optional(),
    desenvolvimento: z.string().optional(),
    sobMedida: z.boolean().optional(),
    sobMedidaDesc: z.string().optional(),
    observacao: z.string().optional(),
    laserCano: z.string().optional(),
    laserGaspea: z.string().optional(),
    laserTaloneira: z.string().optional(),
    corGlitterCano: z.string().optional(),
    corGlitterGaspea: z.string().optional(),
    corGlitterTaloneira: z.string().optional(),
    estampa: z.string().optional(),
    estampaDesc: z.string().optional(),
    pintura: z.string().optional(),
    pinturaDesc: z.string().optional(),
    costuraAtras: z.string().optional(),
    corSola: z.string().optional(),
    carimbo: z.string().optional(),
    carimboDesc: z.string().optional(),
    corVivo: z.string().optional(),
    adicionalDesc: z.string().optional(),
    adicionalValor: z.number().optional(),
    forma: z.string().optional(),
    recorteCano: z.string().optional(),
    recorteGaspea: z.string().optional(),
    recorteTaloneira: z.string().optional(),
    corRecorteCano: z.string().optional(),
    corRecorteGaspea: z.string().optional(),
    corRecorteTaloneira: z.string().optional(),
    genero: z.string().optional(),
    strassQtd: z.number().int().optional(),
    cruzMetalQtd: z.number().int().optional(),
    bridaoMetalQtd: z.number().int().optional(),
  })
  .passthrough();

const FichaSchema = z.object({
  tipo: z.enum(["grade", "individual"]),
  titulo: z.string().optional(),
  preco_unitario: z.number().nonnegative(),
  foto_drive_url: z.string().url().optional(),
  qr_code_url: z.string().url().optional(),
  tamanho: z.string().optional(),
  grade: z
    .array(z.object({ tamanho: z.string().min(1), quantidade: z.number().int().positive() }))
    .optional(),
  ficha: FichaCamposSchema.optional().default({}),
  ficha_snapshot: z.any().optional(),
  personalizacoes_residuais: z
    .array(z.object({ campo: z.string(), valor: z.string(), preco: z.number().optional() }))
    .optional(),
  personalizacoes: z
    .array(z.object({ campo: z.string(), valor: z.string(), preco: z.number().optional() }))
    .optional(),
});

const PayloadSchema = z.object({
  pedido: z.object({
    id: z.string().max(100).optional(),
    numero_pedido: z.string().min(1).max(50),
    cliente_nome: z.string().min(1).max(200),
    cliente_email: z.string().max(200).optional(),
    total: z.number().optional(),
    criado_em: z.string().optional(),
  }),
  fichas: z.array(FichaSchema).min(1).max(100),
});

// ---------- Helpers ----------
function brasiliaParts() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    data: `${parts.year}-${parts.month}-${parts.day}`,
    hora: `${parts.hour}:${parts.minute}`,
  };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

type PlannedRow = {
  numero: string;
  tamanho: string;
  ficha_index: number;
  preco_unit: number;
  ficha: any;
};

// Mesma lógica do GradeEstoque.tsx: `${numero_pedido}${tamanho}${seq.padStart(2,'0')}`
// O site já manda numero_pedido pronto (AT008, AT008A, AT008B...).
// Sequencial reinicia em 01 por (numero_pedido, tamanho).
function buildPlannedRows(payload: z.infer<typeof PayloadSchema>): PlannedRow[] {
  const numeroBase = payload.pedido.numero_pedido.trim();
  const planned: PlannedRow[] = [];
  const seqByTamanho = new Map<string, number>();

  function nextNumeroFor(tamanho: string): string {
    const used = seqByTamanho.get(tamanho) ?? 0;
    const next = used + 1;
    seqByTamanho.set(tamanho, next);
    return `${numeroBase}${tamanho}${String(next).padStart(2, "0")}`;
  }

  payload.fichas.forEach((ficha, idx) => {
    if (ficha.tipo === "individual") {
      const tamanho = (ficha.tamanho ?? "").trim();
      if (!tamanho) {
        throw new Error(`Ficha #${idx} tipo=individual sem tamanho`);
      }
      planned.push({
        numero: nextNumeroFor(tamanho),
        tamanho,
        ficha_index: idx,
        preco_unit: ficha.preco_unitario,
        ficha,
      });
    } else {
      if (!ficha.grade || ficha.grade.length === 0) {
        throw new Error(`Ficha #${idx} tipo=grade sem array grade`);
      }
      const ordered = [...ficha.grade].sort(
        (a, b) => Number(a.tamanho) - Number(b.tamanho),
      );
      for (const item of ordered) {
        for (let i = 0; i < item.quantidade; i++) {
          planned.push({
            numero: nextNumeroFor(item.tamanho),
            tamanho: item.tamanho,
            ficha_index: idx,
            preco_unit: ficha.preco_unitario,
            ficha,
          });
        }
      }
    }
  });

  return planned;
}


function fichaToDbRow(args: {
  planned: PlannedRow;
  juliana_user_id: string;
  cliente_nome: string;
  data: string;
  hora: string;
  atacado_pedido_id?: string | null;
  lead_time_snapshot?: number | null;
}) {
  const { planned, juliana_user_id, cliente_nome, data, hora, atacado_pedido_id, lead_time_snapshot } = args;
  const f = planned.ficha.ficha ?? {};
  const residuais =
    planned.ficha.personalizacoes_residuais ?? planned.ficha.personalizacoes ?? [];

  const observacao_final = (() => {
    const base = (f.observacao ?? "").toString();
    if (!residuais.length) return base;
    const extras = residuais
      .map((p: any) => {
        const v = p.valor ?? "";
        const pr = p.preco ? ` (R$ ${Number(p.preco).toFixed(2)})` : "";
        return `${p.campo}: ${v}${pr}`;
      })
      .join("\n");
    return base ? `${base}\n${extras}` : extras;
  })();

  const fotos = planned.ficha.foto_drive_url ? [planned.ficha.foto_drive_url] : [];

  const extra_detalhes: Record<string, any> = {
    origem: "atacado_site",
    ficha_titulo: planned.ficha.titulo ?? null,
    qr_code_url: planned.ficha.qr_code_url ?? null,
    atacado_pedido_id: atacado_pedido_id ?? null,
  };
  if (residuais.length) extra_detalhes.personalizacoes_residuais = residuais;

  return {
    user_id: juliana_user_id,
    numero: planned.numero,
    vendedor: VENDEDOR_FIXO,
    cliente: cliente_nome,
    tamanho: planned.tamanho,
    genero: f.genero ?? null,
    modelo: f.modelo ?? "",
    solado: f.solado ?? "",
    formato_bico: f.formatoBico ?? "",
    cor_vira: f.corVira ?? "",
    couro_gaspea: f.couroGaspea ?? "",
    couro_cano: f.couroCano ?? "",
    couro_taloneira: f.couroTaloneira ?? "",
    cor_couro_gaspea: f.corCouroGaspea ?? null,
    cor_couro_cano: f.corCouroCano ?? null,
    cor_couro_taloneira: f.corCouroTaloneira ?? null,
    bordado_cano: f.bordadoCano ?? "",
    bordado_gaspea: f.bordadoGaspea ?? "",
    bordado_taloneira: f.bordadoTaloneira ?? "",
    cor_bordado_cano: f.corBordadoCano ?? null,
    cor_bordado_gaspea: f.corBordadoGaspea ?? null,
    cor_bordado_taloneira: f.corBordadoTaloneira ?? null,
    bordado_variado_desc_cano: f.bordadoVariadoDescCano ?? null,
    bordado_variado_desc_gaspea: f.bordadoVariadoDescGaspea ?? null,
    bordado_variado_desc_taloneira: f.bordadoVariadoDescTaloneira ?? null,
    personalizacao_nome: f.personalizacaoNome ?? "",
    personalizacao_bordado: f.personalizacaoBordado ?? "",
    nome_bordado_desc: f.nomeBordadoDesc ?? null,
    cor_linha: f.corLinha ?? "",
    cor_borrachinha: f.corBorrachinha ?? "",
    trisce: f.trisce ?? "Não",
    trice_desc: f.triceDesc ?? null,
    tiras: f.tiras ?? "Não",
    tiras_desc: f.tirasDesc ?? null,
    metais: f.metais ?? "",
    tipo_metal: f.tipoMetal ?? null,
    cor_metal: f.corMetal ?? null,
    strass_qtd: f.strassQtd ?? null,
    cruz_metal_qtd: f.cruzMetalQtd ?? null,
    bridao_metal_qtd: f.bridaoMetalQtd ?? null,
    acessorios: f.acessorios ?? "",
    desenvolvimento: f.desenvolvimento ?? "",
    sob_medida: !!f.sobMedida,
    sob_medida_desc: f.sobMedidaDesc ?? null,
    observacao: observacao_final,
    quantidade: 1,
    preco: Number(planned.preco_unit) || 0,
    preco_migrado_v2: true,
    preco_congelado: false,
    status: "Em aberto",
    data_criacao: data,
    hora_criacao: hora,
    dias_restantes: 15,
    tem_laser: !!(f.laserCano || f.laserGaspea || f.laserTaloneira),
    fotos,
    historico: [
      {
        data,
        hora,
        local: "Em aberto",
        descricao: "Pedido recebido via Atacado",
        usuario: "Site Atacado",
      },
    ],
    alteracoes: [],
    laser_cano: f.laserCano ?? null,
    cor_glitter_cano: f.corGlitterCano ?? null,
    laser_gaspea: f.laserGaspea ?? null,
    cor_glitter_gaspea: f.corGlitterGaspea ?? null,
    laser_taloneira: f.laserTaloneira ?? null,
    cor_glitter_taloneira: f.corGlitterTaloneira ?? null,
    estampa: f.estampa ?? null,
    estampa_desc: f.estampaDesc ?? null,
    pintura: f.pintura ?? null,
    pintura_desc: f.pinturaDesc ?? null,
    costura_atras: f.costuraAtras ?? null,
    cor_sola: f.corSola ?? null,
    carimbo: f.carimbo ?? null,
    carimbo_desc: f.carimboDesc ?? null,
    cor_vivo: f.corVivo ?? null,
    adicional_desc: f.adicionalDesc ?? null,
    adicional_valor: f.adicionalValor ?? null,
    forma: f.forma ?? null,
    recorte_cano: f.recorteCano ?? null,
    recorte_gaspea: f.recorteGaspea ?? null,
    recorte_taloneira: f.recorteTaloneira ?? null,
    cor_recorte_cano: f.corRecorteCano ?? null,
    cor_recorte_gaspea: f.corRecorteGaspea ?? null,
    cor_recorte_taloneira: f.corRecorteTaloneira ?? null,
    extra_detalhes,
    ficha_snapshot: planned.ficha.ficha_snapshot ?? null,
  };
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const token = Deno.env.get("ATACADO_INGEST_TOKEN");
    if (!token) {
      console.error("ATACADO_INGEST_TOKEN não configurado");
      return new Response(JSON.stringify({ error: "Servidor mal configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const receivedRaw = auth.slice("Bearer ".length);
    const received = receivedRaw.trim();
    const fp = (s: string) =>
      s.length <= 8
        ? `len=${s.length}`
        : `len=${s.length} head=${s.slice(0, 4)} tail=${s.slice(-4)}`;
    const tokenTrimmed = token.trim();
    console.log("[fichas-receber][auth-debug]", JSON.stringify({
      auth_len: auth.length,
      received_raw_len: receivedRaw.length,
      received: fp(received),
      token_env: fp(token),
      token_env_trimmed: fp(tokenTrimmed),
      token_env_has_whitespace: /\s/.test(token),
      received_has_whitespace: /\s/.test(received),
      received_first_charcode: received.charCodeAt(0),
      received_last_charcode: received.charCodeAt(received.length - 1),
      token_first_charcode: tokenTrimmed.charCodeAt(0),
      token_last_charcode: tokenTrimmed.charCodeAt(tokenTrimmed.length - 1),
      match_raw: received === token,
      match_trimmed: received === tokenTrimmed,
    }));
    if (!constantTimeEqual(received, tokenTrimmed)) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Payload inválido", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const payload = parsed.data;

    let planned: PlannedRow[];
    try {
      planned = buildPlannedRows(payload);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: (e as Error).message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (planned.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum par para criar" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: julianaProfile, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("nome_completo", VENDEDOR_FIXO)
      .maybeSingle();
    if (profErr || !julianaProfile) {
      console.error("Juliana não encontrada", profErr);
      return new Response(
        JSON.stringify({ error: "Perfil da Juliana não encontrado no portal" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const allNumeros = planned.map((p) => p.numero);
    const { data: existentes, error: chkErr } = await supabase
      .from("orders")
      .select("numero")
      .in("numero", allNumeros);
    if (chkErr) {
      console.error("Erro consultando duplicidade", chkErr);
      return new Response(JSON.stringify({ error: "Erro ao validar duplicidade" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (existentes && existentes.length > 0) {
      const dupes = existentes.map((e: any) => e.numero);
      return new Response(
        JSON.stringify({ error: `Números já existentes no portal: ${dupes.join(", ")}` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data, hora } = brasiliaParts();
    const rows = planned.map((p) =>
      fichaToDbRow({
        planned: p,
        juliana_user_id: julianaProfile.id as string,
        cliente_nome: payload.pedido.cliente_nome.trim(),
        data,
        hora,
        atacado_pedido_id: payload.pedido.id ?? null,
      }),
    );

    const { data: inserted, error: insErr } = await supabase
      .from("orders")
      .insert(rows)
      .select("id, numero");
    if (insErr) {
      console.error("Erro inserindo orders", insErr);
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total: inserted?.length ?? 0,
        criados: inserted ?? [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Erro inesperado", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
