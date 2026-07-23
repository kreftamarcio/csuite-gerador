import { EntradaSchema } from "@/lib/schema";
import { calcRoi, tierPorLeads } from "@/lib/roi";
import { validar, Violacao } from "@/lib/validators";
import { chamarLLM } from "@/lib/llm";
import { rateLimit } from "@/lib/ratelimit";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { segredoConfere } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120; // Vercel Pro: até 300s; Hobby: 60s

const MAX_TENTATIVAS = 3;

export async function POST(req: Request) {
  const reqId = crypto.randomUUID();
  const start = Date.now();

  // 0. Auth constante no tempo + fail-closed
  if (!segredoConfere(req.headers.get("x-api-secret"))) {
    return Response.json({ erro: "NAO_AUTORIZADO" }, { status: 401 });
  }

  // 1. Rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(ip)) {
    return Response.json({ erro: "RATE_LIMIT", detalhe: "max 10 req/min" }, { status: 429 });
  }

  // 2. Parse body
  let bruto: unknown;
  try {
    bruto = await req.json();
  } catch {
    return Response.json({ erro: "JSON_INVALIDO" }, { status: 400 });
  }

  // 3. Validação (zod)
  const parsed = EntradaSchema.safeParse(bruto);
  if (!parsed.success) {
    return Response.json(
      { erro: "INVALIDO", campos: parsed.error.issues.map((i) => i.path.join(".")) },
      { status: 422 }
    );
  }

  const input = parsed.data;

  // 4. ROI em código (fonte da verdade)
  const roi = calcRoi(input);
  const tier = tierPorLeads(input.leads_por_mes);

  const entrada = {
    ...input,
    tier_recomendado: tier,
    valor_tier_recomendado_fmt: tier.mensal_fmt,
    roi,
  };

  // 5. Set de números permitidos (o juiz usa pra validar)
  const permitidos = new Set<string>([
    roi.prejuizo_atual_fmt,
    roi.receita_recuperada_fmt,
    roi.tres_tickets_fmt,
    roi.ticket_medio_fmt,
    tier.mensal_fmt,
    tier.setup_fmt,
    // Preços fixos das tabelas
    "R$ 1.997", "R$ 2.997", "R$ 4.997",
    "R$ 4.997", "R$ 6.997", "R$ 9.997",
    // Âncora humana
    "R$ 3.000", "R$ 2.500", "R$ 5.000", "R$ 2.000", "R$ 12.500",
  ]);

  // 6. Monta system prompt com entrada injetada
  const system = SYSTEM_PROMPT.replace(
    "{{ENTRADA_JSON_PLACEHOLDER}}",
    JSON.stringify(entrada, null, 2)
  );

  // 7. Loop gerar → validar → corrigir (max 3)
  let saida = "";
  let violacoes: Violacao[] = [];
  let tentativas = 0;

  for (let t = 1; t <= MAX_TENTATIVAS; t++) {
    tentativas = t;
    const feedback =
      t === 1
        ? ""
        : `\n\n[CORRECAO OBRIGATORIA] Sua versão anterior reprovou nos seguintes itens. Corrija APENAS estes e regere COMPLETO:\n${violacoes.map((v) => `- ${v.detalhe}`).join("\n")}`;

    try {
      saida = await chamarLLM({ system: system + feedback, tentativa: t });
    } catch (e: any) {
      // Detalhe do erro fica SO no log do servidor; a resposta ao cliente
      // nao vaza internals (nome de env, stack, config do provedor).
      console.error(JSON.stringify({ reqId, tentativa: t, erro: String(e?.message ?? e) }));
      return Response.json(
        { reqId, erro: "LLM_INDISPONIVEL" },
        { status: 503 }
      );
    }

    violacoes = validar(saida, permitidos, input.cidade ?? null);

    console.log(
      JSON.stringify({
        reqId,
        tentativa: t,
        violacoes: violacoes.length,
        detalhes: violacoes.map((v) => v.detalhe),
        latencia_ms: Date.now() - start,
      })
    );

    if (violacoes.length === 0) break;
  }

  // 8. Tabela de variáveis (gerada 100% em código, NUNCA pelo modelo)
  const tabelaVariaveis = {
    nicho: input.nicho,
    cidade: input.cidade ?? null,
    caso: input.caso,
    ticket_medio: roi.ticket_medio_fmt,
    leads_por_mes: input.leads_por_mes,
    taxa_perda_atual: `${Math.round(input.taxa_perda_atual * 100)}%`,
    leads_perdidos: roi.leads_perdidos_fmt,
    clientes_perdidos: roi.clientes_perdidos,
    prejuizo_atual: roi.prejuizo_atual_fmt,
    leads_recuperados: roi.leads_recuperados_fmt,
    novos_clientes: roi.novos_clientes_fmt,
    receita_recuperada: roi.receita_recuperada_fmt,
    tier: tier.nome,
    mensal: tier.mensal_fmt,
    setup: tier.setup_fmt,
    roi_mult: roi.roi_mult,
    flags: { roi_alto: roi.roi_alto, ganho_baixo: roi.ganho_baixo },
  };

  return Response.json({
    reqId,
    status: violacoes.length === 0 ? "ok" : "revisar",
    tentativas,
    violacoes: violacoes.map((v) => v.detalhe),
    variaveis: tabelaVariaveis,
    markdown: saida,
    latencia_ms: Date.now() - start,
  });
}
