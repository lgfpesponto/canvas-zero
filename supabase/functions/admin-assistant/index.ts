// Admin Assistant - Chat IA exclusivo para admin_master
// Tool calling expandido (consultas read-only ao banco)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOOL_RESULT_LIMIT = 20000;
const MAX_TOOL_ITER = 12;

const SYSTEM_PROMPT = `Você é o "Assistente 7Estrivos", uma IA especializada no portal interno de gestão de pedidos da fábrica de botas, cintos e acessórios 7ESTRIVOS. Você conversa apenas com a Juliana (admin_master) ou outras admins master da empresa.

# Sua função
Ajudar a admin a:
- Investigar problemas (pedidos travados, saldos errados, alterações suspeitas, dúvidas de regra de negócio)
- Consultar dados reais do banco usando as tools disponíveis (NUNCA invente dados)
- Sugerir planos de ação. Você só CONSULTA — quem executa mudanças é a admin
- Explicar regras do sistema com clareza em português brasileiro

# Estilo
- Português brasileiro, direto e prático
- Markdown (listas, negrito, tabelas quando útil)
- Sumarize resultados das tools (não cole JSON cru)
- Se uma tool retornar erro, tente uma abordagem diferente (outra tool, parâmetros diferentes) antes de desistir
- Se faltar dado, peça à admin ou use uma tool

# Regras de negócio principais

## Roles
- admin_master (Juliana, login \`7estrivos\`): acesso total. Única que pode apagar
- admin_producao (Fernanda): admin sem vendas e sem delete
- vendedor / vendedor_comissao: revendedores
- bordado: portal restrito do setor bordado

## Pedidos (\`orders\`)
- Numeração: \`7E-AAAA0001\`
- Tipos: bota (sem \`tipo_extra\`) ou extras (cinto, kit_faca, tiras_laterais, revitalizador, bota_pronta_entrega, gravata_pronta_entrega, etc)
- Fluxo: Em aberto → Impresso → Aguardando → Aguardando Couro → Corte → Baixa Corte → Sem bordado/Bordado → Pesponto → Montagem → Revisão → Expedição → Entregue → Cobrado → Pago
- Cancelado: excluído de vendas/comissão
- Prefixos excluídos de métricas: TROCA, REFAZENDO, ERRO, INFLUENCER
- Vendedor "Estoque" = pedido interno
- Clientes da Juliana = vendedores virtuais

## Preços
- Cascata: \`ficha_variacoes\` → \`custom_options\` → fallback hardcoded
- Modelo e Bordado exigem preço > 0 (exceto "Sem bordado")
- Cor da Sola é contextual (modelo+solado+bico, PVC = R$ 0)
- Laser: R$ 50 fixo
- Valor final = preco × quantidade − desconto

## Saldo do revendedor
- Tabelas: \`revendedor_comprovantes\`, \`revendedor_saldo_movimentos\`, \`revendedor_baixas_pedido\`
- View: \`vw_revendedor_saldo\`. RPC: \`saldo_atual_revendedor\`
- Aprovar comprovante → tenta baixa automática FIFO em pedidos Cobrados

## Auditoria
- \`orders.alteracoes\` (jsonb): cada edição de campo no detalhe vira um item
- \`orders.historico\` (jsonb): cada mudança de status
- View consolidada: \`vw_auditoria_alteracoes\` + RPC \`get_auditoria_alteracoes\`
- Use a tool \`buscar_alteracoes\` para investigar quem mudou o quê

## Prazos
- Bota: 15 dias úteis. Cinto: 5. Demais extras: 1.

# IMPORTANTE
- Use as tools sempre que precisar de dado real
- Nunca afirme que executou uma ação — você só consulta
- Se a admin perguntar "quem alterou X" ou "por que mudou", use \`buscar_alteracoes\`
- Para preços vigentes, use \`consultar_preco_vigente\`
- Para investigar valores estranhos em pedidos, combine \`consultar_pedido\` + \`buscar_alteracoes\` + \`verificar_preco_pedido\`
- Para "financeiro do X não bate", "como está a baixa do X", "quanto X enviou de comprovante", use \`conciliacao_financeira_revendedor\` (passa o período se a admin mencionar)
- Para "PDF não bate com portal", "valor do PDF diferente", "cobrança que mandei estava em R$ X mas agora dá Y", use \`comparar_pdf_snapshot\`
- Para "por que o preço do pedido 7E-XXXX está errado", use \`verificar_preco_pedido\`
- Quando a admin pedir para "salvar", "guardar", "anotar este plano/roteiro/checklist", chame \`salvar_plano\` com um título curto e descritivo. Confirme depois o ID retornado.
- Quando a admin perguntar "quais planos tenho salvos" ou "abre o plano X", use \`listar_planos\` ou \`obter_plano\`.
`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "consultar_pedido",
      description: "Busca um pedido por número (7E-AAAA0001) ou últimos chars do UUID. Retorna todos os campos.",
      parameters: { type: "object", properties: { identificador: { type: "string" } }, required: ["identificador"] },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_pedidos",
      description: "Lista pedidos com filtros. Máx 50 por chamada.",
      parameters: {
        type: "object",
        properties: {
          vendedor: { type: "string" },
          status: { type: "string" },
          tipo_extra: { type: "string", description: "ex: cinto, kit_faca, ou 'bota'" },
          data_de: { type: "string", description: "YYYY-MM-DD" },
          data_ate: { type: "string", description: "YYYY-MM-DD" },
          limite: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_vendedor",
      description: "Resumo de um vendedor: pedidos por status, valores, últimos 10.",
      parameters: { type: "object", properties: { nome: { type: "string" } }, required: ["nome"] },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_saldo_revendedor",
      description: "Saldo atual + últimos 30 movimentos de saldo de um revendedor.",
      parameters: { type: "object", properties: { nome: { type: "string" } }, required: ["nome"] },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_estatisticas",
      description: "Totais gerais: produção, vendas, atrasados.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_pedidos_em_alerta",
      description: "Pedidos atrasados (dias_restantes <= 0 e fora de conclusão).",
      parameters: { type: "object", properties: { vendedor: { type: "string" }, limite: { type: "number" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_alteracoes",
      description: "Auditoria global: lista alterações em pedidos, mudanças de status, movimentos de saldo, exclusões e avisos. Use para 'quem alterou', 'o que mudou', 'por que mudou de status'.",
      parameters: {
        type: "object",
        properties: {
          numero: { type: "string", description: "Filtrar por número do pedido (ex: 23468)" },
          usuario: { type: "string", description: "Filtrar por quem fez a alteração" },
          vendedor: { type: "string", description: "Vendedor do pedido" },
          tipo: { type: "string", description: "alteracao_pedido | mudanca_status | saldo_baixa_pedido | saldo_entrada_comprovante | saldo_estorno | saldo_ajuste_admin | pedido_excluido | aviso_sistema" },
          de: { type: "string", description: "YYYY-MM-DD" },
          ate: { type: "string", description: "YYYY-MM-DD" },
          busca: { type: "string", description: "Texto livre na descrição/justificativa" },
          limite: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_movimentos_saldo",
      description: "Movimentos de saldo de um revendedor com filtro de período/tipo.",
      parameters: {
        type: "object",
        properties: {
          vendedor: { type: "string" },
          tipo: { type: "string" },
          de: { type: "string" },
          ate: { type: "string" },
          limite: { type: "number" },
        },
        required: ["vendedor"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_comprovantes",
      description: "Lista comprovantes enviados (pendente/aprovado/reprovado/utilizado).",
      parameters: {
        type: "object",
        properties: {
          vendedor: { type: "string" },
          status: { type: "string" },
          de: { type: "string" },
          ate: { type: "string" },
          limite: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_preco_vigente",
      description: "Consulta o preço atual configurado de uma variação em ficha_variacoes ou custom_options.",
      parameters: {
        type: "object",
        properties: {
          categoria: { type: "string", description: "ex: bordado, modelo, solado, cor_sola..." },
          busca: { type: "string", description: "Parte do nome da variação" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_usuarios_e_roles",
      description: "Lista todos os usuários do portal com seus roles.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_pedidos_excluidos",
      description: "Lista pedidos excluídos recentemente (deleted_orders).",
      parameters: { type: "object", properties: { limite: { type: "number" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "conciliacao_financeira_revendedor",
      description: "Pacote completo de conciliação financeira de um revendedor: saldo atual, comprovantes do período (com status), baixas geradas, pedidos Cobrados/Pago/Entregue, totais enviado vs baixado vs em aberto. Use para 'financeiro não bate', 'como está a baixa do X', 'quanto X enviou'.",
      parameters: {
        type: "object",
        properties: {
          vendedor: { type: "string" },
          de: { type: "string", description: "YYYY-MM-DD (opcional)" },
          ate: { type: "string", description: "YYYY-MM-DD (opcional)" },
        },
        required: ["vendedor"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "comparar_pdf_snapshot",
      description: "Compara um PDF gerado (pdf_snapshots) com o estado ATUAL dos pedidos. Mostra pedidos cujo preço/quantidade mudou desde a geração do PDF e a diferença total. Use para 'PDF não bate com portal'.",
      parameters: {
        type: "object",
        properties: {
          snapshot_id: { type: "string", description: "UUID do snapshot (opcional)" },
          tipo: { type: "string", description: "Filtra por tipo do PDF (ex: cobranca)" },
          vendedor: { type: "string", description: "Filtra pelo vendedor dos pedidos do snapshot" },
          de: { type: "string", description: "YYYY-MM-DD geração (opcional)" },
          ate: { type: "string", description: "YYYY-MM-DD geração (opcional)" },
          limite_snapshots: { type: "number", description: "Quantos snapshots recentes considerar (padrão 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verificar_preco_pedido",
      description: "Diagnóstico de preço de um pedido: mostra preco gravado, breakdown dos campos selecionados, preço atual de cada variação em ficha_variacoes/custom_options, desconto, alteracoes recentes de preço/qtd. NÃO recalcula automaticamente — apresenta os dados para você raciocinar sobre divergências.",
      parameters: {
        type: "object",
        properties: { numero: { type: "string", description: "Número (7E-AAAA0001) ou apenas dígitos" } },
        required: ["numero"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "salvar_plano",
      description: "Salva um plano/roteiro/checklist em markdown para reuso futuro. Retorna o id criado.",
      parameters: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          conteudo: { type: "string", description: "Markdown do plano" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["titulo", "conteudo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_planos",
      description: "Lista planos salvos. Opcionalmente filtra por busca em título/tag.",
      parameters: { type: "object", properties: { busca: { type: "string" }, limite: { type: "number" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "obter_plano",
      description: "Abre um plano salvo pelo id.",
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
  },
];

// ───────── Admin client ─────────
function makeAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

// ───────── Tool implementations ─────────
async function tool_consultar_pedido(args: any) {
  const admin = makeAdminClient();
  const id = String(args.identificador || "").trim();
  if (!id) return { erro: "identificador vazio" };

  if (id.toUpperCase().startsWith("7E-")) {
    const { data, error } = await admin.from("orders").select("*").eq("numero", id).maybeSingle();
    if (error) return { erro: error.message };
    if (data) return { pedido: data };
  }
  // Tenta como número simples (23468)
  if (/^\d+$/.test(id)) {
    const { data } = await admin.from("orders").select("*").ilike("numero", `%${id}%`).limit(5);
    if (data && data.length === 1) return { pedido: data[0] };
    if (data && data.length > 1) return { multiplos: data.map(p => ({ id: p.id, numero: p.numero, vendedor: p.vendedor, status: p.status })) };
  }
  const { data, error } = await admin.rpc("find_order_by_id_suffix", { suffix: id.toLowerCase() });
  if (error) return { erro: error.message };
  if (Array.isArray(data) && data.length > 0) return { pedido: data[0] };
  return { erro: "Pedido não encontrado", buscado: id };
}

async function tool_listar_pedidos(args: any) {
  const admin = makeAdminClient();
  const limite = Math.min(Number(args.limite) || 20, 50);
  let q = admin.from("orders")
    .select("id, numero, vendedor, cliente, status, tipo_extra, modelo, preco, quantidade, desconto, data_criacao, dias_restantes")
    .order("created_at", { ascending: false })
    .limit(limite);

  if (args.vendedor) q = q.eq("vendedor", args.vendedor);
  if (args.status) q = q.eq("status", args.status);
  if (args.tipo_extra) {
    if (args.tipo_extra === "bota") q = q.is("tipo_extra", null);
    else q = q.eq("tipo_extra", args.tipo_extra);
  }
  if (args.data_de) q = q.gte("data_criacao", args.data_de);
  if (args.data_ate) q = q.lte("data_criacao", args.data_ate);

  const { data, error } = await q;
  if (error) return { erro: error.message };
  return { total: data?.length || 0, pedidos: data || [] };
}

async function tool_consultar_vendedor(args: any) {
  const admin = makeAdminClient();
  const nome = String(args.nome || "").trim();
  if (!nome) return { erro: "nome vazio" };

  const { data: pedidos, error } = await admin
    .from("orders")
    .select("id, numero, status, preco, quantidade, desconto, data_criacao, tipo_extra")
    .or(`vendedor.eq.${nome},and(vendedor.eq.Juliana Cristina Ribeiro,cliente.eq.${nome})`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return { erro: error.message };

  const porStatus: Record<string, number> = {};
  let valorTotal = 0;
  let valorEmAberto = 0;
  for (const p of pedidos || []) {
    porStatus[p.status] = (porStatus[p.status] || 0) + 1;
    const v = Number(p.preco || 0) * Number(p.quantidade || 1) - Number(p.desconto || 0);
    valorTotal += v;
    if (!["Pago", "Cancelado"].includes(p.status)) valorEmAberto += v;
  }

  return {
    vendedor: nome,
    total_pedidos: pedidos?.length || 0,
    valor_total: valorTotal,
    valor_em_aberto: valorEmAberto,
    pedidos_por_status: porStatus,
    ultimos_10: (pedidos || []).slice(0, 10),
  };
}

async function tool_consultar_saldo_revendedor(args: any) {
  const admin = makeAdminClient();
  const nome = String(args.nome || "").trim();
  if (!nome) return { erro: "nome vazio" };

  const { data: saldo, error: sErr } = await admin.rpc("saldo_atual_revendedor", { _vendedor: nome });
  if (sErr) return { erro: sErr.message };

  const { data: movs, error: mErr } = await admin
    .from("revendedor_saldo_movimentos")
    .select("*")
    .eq("vendedor", nome)
    .order("created_at", { ascending: false })
    .limit(30);
  if (mErr) return { erro: mErr.message };

  return { vendedor: nome, saldo_atual: saldo, ultimos_movimentos: movs || [] };
}

async function tool_consultar_estatisticas() {
  const admin = makeAdminClient();
  const { data: prod } = await admin.rpc("get_production_counts");
  const { data: tot } = await admin.rpc("get_orders_totals");
  const { count: atrasados } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .lte("dias_restantes", 0)
    .not("status", "in", '("Entregue","Cobrado","Pago","Cancelado")');
  return { producao: prod?.[0] || null, totais_geral: tot?.[0] || null, pedidos_atrasados_aprox: atrasados || 0 };
}

async function tool_consultar_pedidos_em_alerta(args: any) {
  const admin = makeAdminClient();
  const limite = Math.min(Number(args.limite) || 30, 100);
  let q = admin.from("orders")
    .select("id, numero, vendedor, cliente, status, modelo, tipo_extra, dias_restantes, data_criacao")
    .lte("dias_restantes", 0)
    .not("status", "in", '("Entregue","Cobrado","Pago","Cancelado")')
    .order("dias_restantes", { ascending: true })
    .limit(limite);
  if (args.vendedor) q = q.eq("vendedor", args.vendedor);
  const { data, error } = await q;
  if (error) return { erro: error.message };
  return { total: data?.length || 0, pedidos: data || [] };
}

async function tool_buscar_alteracoes(args: any) {
  const admin = makeAdminClient();
  const limite = Math.min(Number(args.limite) || 100, 500);
  const { data, error } = await admin.rpc("get_auditoria_alteracoes", {
    _de: args.de || null,
    _ate: args.ate || null,
    _usuario: args.usuario || null,
    _vendedor: args.vendedor || null,
    _numero: args.numero || null,
    _tipos: args.tipo ? [args.tipo] : null,
    _busca: args.busca || null,
    _limit: limite,
    _offset: 0,
  });
  if (error) return { erro: error.message };
  return { total: data?.length || 0, eventos: data || [] };
}

async function tool_listar_movimentos_saldo(args: any) {
  const admin = makeAdminClient();
  const limite = Math.min(Number(args.limite) || 50, 200);
  let q = admin.from("revendedor_saldo_movimentos")
    .select("*")
    .eq("vendedor", args.vendedor)
    .order("created_at", { ascending: false })
    .limit(limite);
  if (args.tipo) q = q.eq("tipo", args.tipo);
  if (args.de) q = q.gte("created_at", args.de);
  if (args.ate) q = q.lte("created_at", args.ate + "T23:59:59");
  const { data, error } = await q;
  if (error) return { erro: error.message };
  return { total: data?.length || 0, movimentos: data || [] };
}

async function tool_listar_comprovantes(args: any) {
  const admin = makeAdminClient();
  const limite = Math.min(Number(args.limite) || 50, 200);
  let q = admin.from("revendedor_comprovantes")
    .select("id, vendedor, valor, data_pagamento, status, observacao, motivo_reprovacao, created_at, pagador_nome, tipo_detectado")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (args.vendedor) q = q.eq("vendedor", args.vendedor);
  if (args.status) q = q.eq("status", args.status);
  if (args.de) q = q.gte("data_pagamento", args.de);
  if (args.ate) q = q.lte("data_pagamento", args.ate);
  const { data, error } = await q;
  if (error) return { erro: error.message };
  return { total: data?.length || 0, comprovantes: data || [] };
}

async function tool_consultar_preco_vigente(args: any) {
  const admin = makeAdminClient();
  const busca = String(args.busca || "").trim();
  const out: any = { ficha_variacoes: [], custom_options: [] };

  // ficha_variacoes (com nome da categoria)
  let q1 = admin.from("ficha_variacoes")
    .select("nome, preco_adicional, ativo, categoria_id, ficha_categorias!inner(nome, slug)")
    .eq("ativo", true)
    .order("nome")
    .limit(50);
  if (busca) q1 = q1.ilike("nome", `%${busca}%`);
  if (args.categoria) q1 = q1.ilike("ficha_categorias.slug" as any, `%${args.categoria}%`);
  const { data: v1 } = await q1;
  out.ficha_variacoes = v1 || [];

  // custom_options
  let q2 = admin.from("custom_options").select("categoria, label, preco").order("categoria").limit(100);
  if (args.categoria) q2 = q2.ilike("categoria", `%${args.categoria}%`);
  if (busca) q2 = q2.ilike("label", `%${busca}%`);
  const { data: v2 } = await q2;
  out.custom_options = v2 || [];

  return out;
}

async function tool_listar_usuarios_e_roles() {
  const admin = makeAdminClient();
  const { data: profiles } = await admin.from("profiles").select("id, nome_completo, nome_usuario, email, telefone");
  const { data: roles } = await admin.from("user_roles").select("user_id, role");
  const rolesByUser: Record<string, string[]> = {};
  for (const r of roles || []) {
    rolesByUser[r.user_id] = rolesByUser[r.user_id] || [];
    rolesByUser[r.user_id].push(r.role);
  }
  return {
    total: profiles?.length || 0,
    usuarios: (profiles || []).map(p => ({ ...p, roles: rolesByUser[p.id] || [] })),
  };
}

async function tool_consultar_pedidos_excluidos(args: any) {
  const admin = makeAdminClient();
  const limite = Math.min(Number(args.limite) || 30, 100);
  const { data, error } = await admin.from("deleted_orders")
    .select("id, order_id, deleted_at, deleted_by, order_data")
    .order("deleted_at", { ascending: false })
    .limit(limite);
  if (error) return { erro: error.message };
  return { total: data?.length || 0, excluidos: data || [] };
}

// ───────── Conciliação financeira ─────────
async function tool_conciliacao_financeira_revendedor(args: any) {
  const admin = makeAdminClient();
  const vendedor = String(args.vendedor || "").trim();
  if (!vendedor) return { erro: "vendedor vazio" };
  const de = args.de || null;
  const ate = args.ate || null;

  const { data: saldo } = await admin.rpc("saldo_atual_revendedor", { _vendedor: vendedor });

  let qComp = admin.from("revendedor_comprovantes")
    .select("id, valor, data_pagamento, status, observacao, motivo_reprovacao, created_at, pagador_nome, tipo_detectado, aprovado_em")
    .eq("vendedor", vendedor)
    .order("data_pagamento", { ascending: false })
    .limit(200);
  if (de) qComp = qComp.gte("data_pagamento", de);
  if (ate) qComp = qComp.lte("data_pagamento", ate);
  const { data: comprovantes } = await qComp;

  let qMov = admin.from("revendedor_saldo_movimentos")
    .select("id, tipo, valor, descricao, order_id, comprovante_id, saldo_anterior, saldo_posterior, created_at")
    .eq("vendedor", vendedor)
    .order("created_at", { ascending: false })
    .limit(300);
  if (de) qMov = qMov.gte("created_at", de);
  if (ate) qMov = qMov.lte("created_at", ate + "T23:59:59");
  const { data: movimentos } = await qMov;

  let qBaixas = admin.from("revendedor_baixas_pedido")
    .select("id, order_id, valor_pedido, created_at")
    .eq("vendedor", vendedor)
    .order("created_at", { ascending: false })
    .limit(300);
  if (de) qBaixas = qBaixas.gte("created_at", de);
  if (ate) qBaixas = qBaixas.lte("created_at", ate + "T23:59:59");
  const { data: baixas } = await qBaixas;

  // Pedidos do vendedor por status (Cobrado/Pago/Entregue)
  let qPed = admin.from("orders")
    .select("id, numero, status, preco, quantidade, desconto, data_criacao, tipo_extra")
    .or(`vendedor.eq.${vendedor},and(vendedor.eq.Juliana Cristina Ribeiro,cliente.eq.${vendedor})`)
    .in("status", ["Cobrado", "Pago", "Entregue"])
    .order("data_criacao", { ascending: false })
    .limit(500);
  if (de) qPed = qPed.gte("data_criacao", de);
  if (ate) qPed = qPed.lte("data_criacao", ate);
  const { data: pedidos } = await qPed;

  const totalEnviadoAprovado = (comprovantes || [])
    .filter(c => c.status === "aprovado" || c.status === "utilizado")
    .reduce((s, c) => s + Number(c.valor || 0), 0);
  const totalEnviadoPendente = (comprovantes || [])
    .filter(c => c.status === "pendente")
    .reduce((s, c) => s + Number(c.valor || 0), 0);
  const totalEnviadoReprovado = (comprovantes || [])
    .filter(c => c.status === "reprovado")
    .reduce((s, c) => s + Number(c.valor || 0), 0);
  const totalBaixado = (baixas || []).reduce((s, b) => s + Number(b.valor_pedido || 0), 0);
  const totalCobrado = (pedidos || []).filter(p => p.status === "Cobrado").reduce((s, p) => s + Number(p.preco || 0), 0);
  const totalPago = (pedidos || []).filter(p => p.status === "Pago").reduce((s, p) => s + Number(p.preco || 0), 0);
  const totalEntregue = (pedidos || []).filter(p => p.status === "Entregue").reduce((s, p) => s + Number(p.preco || 0), 0);

  return {
    vendedor,
    periodo: { de, ate },
    saldo_atual: saldo,
    totais: {
      comprovantes_aprovados: totalEnviadoAprovado,
      comprovantes_pendentes: totalEnviadoPendente,
      comprovantes_reprovados: totalEnviadoReprovado,
      baixas_em_pedidos: totalBaixado,
      pedidos_cobrado_em_aberto: totalCobrado,
      pedidos_pago: totalPago,
      pedidos_entregue_nao_cobrado: totalEntregue,
    },
    contagens: {
      comprovantes: comprovantes?.length || 0,
      movimentos: movimentos?.length || 0,
      baixas: baixas?.length || 0,
      pedidos: pedidos?.length || 0,
    },
    comprovantes: comprovantes || [],
    movimentos: movimentos || [],
    baixas: baixas || [],
    pedidos_aberto_cobrado: (pedidos || []).filter(p => p.status === "Cobrado"),
  };
}

// ───────── Comparar PDF snapshot vs estado atual ─────────
async function tool_comparar_pdf_snapshot(args: any) {
  const admin = makeAdminClient();
  const limiteSnap = Math.min(Number(args.limite_snapshots) || 5, 20);

  let qSnap = admin.from("pdf_snapshots")
    .select("id, tipo, gerado_em, gerado_por_nome, filtros, order_ids, totais, nome_arquivo")
    .order("gerado_em", { ascending: false })
    .limit(limiteSnap);
  if (args.snapshot_id) qSnap = qSnap.eq("id", args.snapshot_id).limit(1);
  if (args.tipo) qSnap = qSnap.eq("tipo", args.tipo);
  if (args.de) qSnap = qSnap.gte("gerado_em", args.de);
  if (args.ate) qSnap = qSnap.lte("gerado_em", args.ate + "T23:59:59");
  const { data: snaps, error } = await qSnap;
  if (error) return { erro: error.message };
  if (!snaps || snaps.length === 0) return { erro: "Nenhum PDF snapshot encontrado com esses filtros" };

  const resultado: any[] = [];
  for (const snap of snaps) {
    if (args.vendedor && snap.filtros?.vendedor && snap.filtros.vendedor !== args.vendedor) continue;

    const ids: string[] = Array.isArray(snap.order_ids) ? snap.order_ids : [];
    if (ids.length === 0) {
      resultado.push({ snapshot: snap, divergencias: [], total_snapshot: snap.totais, total_atual: null, observacao: "Snapshot sem order_ids" });
      continue;
    }

    const { data: atuais } = await admin
      .from("orders")
      .select("id, numero, vendedor, status, preco, quantidade, desconto")
      .in("id", ids);

    const atualMap = new Map((atuais || []).map(o => [o.id, o]));
    const divergencias: any[] = [];
    let totalAtual = 0;
    let totalAtualEm = 0;
    for (const id of ids) {
      const at = atualMap.get(id);
      if (!at) {
        divergencias.push({ id, motivo: "Pedido não existe mais (apagado?)" });
        continue;
      }
      totalAtual += Number(at.preco || 0);
    }
    const totalSnap = Number(snap.totais?.valor_total || snap.totais?.total || 0);
    const diff = totalAtual - totalSnap;

    // Detalhe por pedido com mudança de preço se snapshot guardou preços individuais
    const precosSnap = snap.totais?.precos_por_id || {};
    for (const at of atuais || []) {
      const precoAntigo = Number(precosSnap[at.id] ?? NaN);
      if (!isNaN(precoAntigo) && Math.abs(precoAntigo - Number(at.preco || 0)) > 0.01) {
        divergencias.push({
          numero: at.numero,
          id: at.id,
          preco_no_pdf: precoAntigo,
          preco_atual: at.preco,
          diferenca: Number(at.preco || 0) - precoAntigo,
          status_atual: at.status,
        });
      }
    }

    resultado.push({
      snapshot: { id: snap.id, tipo: snap.tipo, gerado_em: snap.gerado_em, gerado_por: snap.gerado_por_nome, filtros: snap.filtros, nome_arquivo: snap.nome_arquivo },
      qtd_pedidos_snapshot: ids.length,
      qtd_pedidos_existentes: atuais?.length || 0,
      total_snapshot: totalSnap,
      total_atual: totalAtual,
      diferenca: diff,
      divergencias,
    });
  }

  return { total_snapshots: resultado.length, resultados: resultado };
}

// ───────── Verificar preço de um pedido (raw data, sem recalcular) ─────────
async function tool_verificar_preco_pedido(args: any) {
  const admin = makeAdminClient();
  const id = String(args.numero || "").trim();
  if (!id) return { erro: "numero vazio" };

  let pedido: any = null;
  if (id.toUpperCase().startsWith("7E-")) {
    const { data } = await admin.from("orders").select("*").eq("numero", id).maybeSingle();
    pedido = data;
  } else if (/^\d+$/.test(id)) {
    const { data } = await admin.from("orders").select("*").ilike("numero", `%${id}%`).limit(1);
    pedido = data?.[0];
  }
  if (!pedido) return { erro: "Pedido não encontrado", buscado: id };

  // Coleta valores selecionados nas categorias chave para buscar preços vigentes
  const camposChave = [
    "modelo", "solado", "formato_bico", "cor_vira", "cor_sola",
    "couro_cano", "couro_gaspea", "couro_taloneira",
    "bordado_cano", "bordado_gaspea", "bordado_taloneira",
    "laser_cano", "laser_gaspea", "laser_taloneira",
    "recorte_cano", "recorte_gaspea", "recorte_taloneira",
    "estampa", "pintura", "carimbo", "personalizacao_nome", "personalizacao_bordado",
  ];
  const selecionados: Record<string, string> = {};
  for (const k of camposChave) if (pedido[k]) selecionados[k] = pedido[k];

  // Busca preços vigentes
  const nomes = [...new Set(Object.values(selecionados).filter(Boolean))];
  const precosVigentes: any[] = [];
  if (nomes.length > 0) {
    const { data: variacoes } = await admin
      .from("ficha_variacoes")
      .select("nome, preco_adicional, ativo, categoria_id, ficha_categorias!inner(nome, slug)")
      .in("nome", nomes);
    for (const v of variacoes || []) precosVigentes.push({ fonte: "ficha_variacoes", ...v });

    const { data: customs } = await admin
      .from("custom_options")
      .select("categoria, label, preco")
      .in("label", nomes);
    for (const c of customs || []) precosVigentes.push({ fonte: "custom_options", ...c });
  }

  // Alterações de preço/qtd do pedido
  const alteracoes = Array.isArray(pedido.alteracoes) ? pedido.alteracoes : [];
  const altPrecoQtd = alteracoes.filter((a: any) =>
    String(a?.campo || "").match(/preco|quantidade|desconto/i)
  ).slice(-30);

  return {
    pedido: {
      id: pedido.id, numero: pedido.numero, vendedor: pedido.vendedor, cliente: pedido.cliente,
      status: pedido.status, tipo_extra: pedido.tipo_extra,
      preco: pedido.preco, quantidade: pedido.quantidade, desconto: pedido.desconto,
      preco_anterior: pedido.preco_anterior, quantidade_anterior: pedido.quantidade_anterior,
      preco_migrado_v2: pedido.preco_migrado_v2, preco_regra_versao: pedido.preco_regra_versao,
    },
    valor_final_calculado: Number(pedido.preco || 0) * Number(pedido.quantidade || 1) - Number(pedido.desconto || 0),
    campos_selecionados: selecionados,
    precos_vigentes: precosVigentes,
    alteracoes_preco_qtd: altPrecoQtd,
    extra_detalhes: pedido.extra_detalhes,
    adicional: { valor: pedido.adicional_valor, desc: pedido.adicional_desc },
  };
}

// ───────── Planos salvos ─────────
async function tool_salvar_plano(args: any, userId: string) {
  const admin = makeAdminClient();
  const titulo = String(args.titulo || "").trim();
  const conteudo = String(args.conteudo || "").trim();
  if (!titulo || !conteudo) return { erro: "titulo e conteudo são obrigatórios" };
  const tags = Array.isArray(args.tags) ? args.tags.map(String) : [];

  const { data, error } = await admin.from("admin_assistant_planos")
    .insert({ titulo, conteudo, tags, created_by: userId })
    .select("id, titulo, created_at")
    .single();
  if (error) return { erro: error.message };
  return { ok: true, plano: data, mensagem: `Plano "${data.titulo}" salvo com sucesso (id ${data.id}).` };
}

async function tool_listar_planos(args: any) {
  const admin = makeAdminClient();
  const limite = Math.min(Number(args.limite) || 30, 100);
  let q = admin.from("admin_assistant_planos")
    .select("id, titulo, tags, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limite);
  if (args.busca) q = q.ilike("titulo", `%${args.busca}%`);
  const { data, error } = await q;
  if (error) return { erro: error.message };
  return { total: data?.length || 0, planos: data || [] };
}

async function tool_obter_plano(args: any) {
  const admin = makeAdminClient();
  const { data, error } = await admin.from("admin_assistant_planos")
    .select("*")
    .eq("id", args.id)
    .maybeSingle();
  if (error) return { erro: error.message };
  if (!data) return { erro: "Plano não encontrado" };
  return { plano: data };
}

async function executeTool(name: string, args: any, userId: string): Promise<any> {
  try {
    switch (name) {
      case "consultar_pedido": return await tool_consultar_pedido(args);
      case "listar_pedidos": return await tool_listar_pedidos(args);
      case "consultar_vendedor": return await tool_consultar_vendedor(args);
      case "consultar_saldo_revendedor": return await tool_consultar_saldo_revendedor(args);
      case "consultar_estatisticas": return await tool_consultar_estatisticas();
      case "consultar_pedidos_em_alerta": return await tool_consultar_pedidos_em_alerta(args);
      case "buscar_alteracoes": return await tool_buscar_alteracoes(args);
      case "listar_movimentos_saldo": return await tool_listar_movimentos_saldo(args);
      case "listar_comprovantes": return await tool_listar_comprovantes(args);
      case "consultar_preco_vigente": return await tool_consultar_preco_vigente(args);
      case "listar_usuarios_e_roles": return await tool_listar_usuarios_e_roles();
      case "consultar_pedidos_excluidos": return await tool_consultar_pedidos_excluidos(args);
      case "conciliacao_financeira_revendedor": return await tool_conciliacao_financeira_revendedor(args);
      case "comparar_pdf_snapshot": return await tool_comparar_pdf_snapshot(args);
      case "verificar_preco_pedido": return await tool_verificar_preco_pedido(args);
      case "salvar_plano": return await tool_salvar_plano(args, userId);
      case "listar_planos": return await tool_listar_planos(args);
      case "obter_plano": return await tool_obter_plano(args);
      default: return { erro: `Tool desconhecida: ${name}` };
    }
  } catch (e: any) {
    console.error(`Tool ${name} failed:`, e?.stack || e);
    return { erro: `Falha ao executar ${name}: ${e?.message || String(e)}. Tente outra abordagem ou ajuste os parâmetros.` };
  }
}

// ───────── HTTP handler ─────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const adminClient = makeAdminClient();
    const { data: hasMaster, error: roleErr } = await adminClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin_master",
    });
    if (roleErr || !hasMaster) {
      return new Response(JSON.stringify({ error: "Acesso restrito a admin_master" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const model = body.model || "google/gemini-3-flash-preview";

    const conversation: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (let iter = 0; iter < MAX_TOOL_ITER; iter++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: conversation, tools: TOOLS, tool_choice: "auto" }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde alguns segundos." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "Saldo de IA esgotado. Adicione créditos em Settings → Cloud & AI balance." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await aiResp.text();
        console.error("AI Gateway error:", aiResp.status, errText);
        return new Response(JSON.stringify({ error: `Erro na IA: ${aiResp.status}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResp.json();
      const choice = aiData.choices?.[0];
      const msg = choice?.message;

      if (!msg) {
        return new Response(JSON.stringify({ error: "Resposta vazia da IA" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const toolCalls = msg.tool_calls;
      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        conversation.push({ role: "assistant", content: msg.content || "", tool_calls: toolCalls });
        for (const tc of toolCalls) {
          let parsedArgs: any = {};
          try { parsedArgs = JSON.parse(tc.function?.arguments || "{}"); } catch { parsedArgs = {}; }
          console.log(`[tool] ${tc.function?.name}`, JSON.stringify(parsedArgs).slice(0, 200));
          const result = await executeTool(tc.function?.name, parsedArgs);
          const serialized = JSON.stringify(result);
          conversation.push({
            role: "tool",
            tool_call_id: tc.id,
            content: serialized.length > TOOL_RESULT_LIMIT
              ? serialized.slice(0, TOOL_RESULT_LIMIT) + `\n[TRUNCADO — resultado original tinha ${serialized.length} chars. Refine os filtros para ver menos resultados.]`
              : serialized,
          });
        }
        continue;
      }

      return new Response(JSON.stringify({
        content: msg.content || "",
        finish_reason: choice.finish_reason,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      content: "Resposta interrompida (limite de iterações de ferramentas atingido).",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("admin-assistant error:", e?.stack || e);
    return new Response(JSON.stringify({ error: e?.message || "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
