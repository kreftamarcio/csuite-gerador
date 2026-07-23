import { z } from "zod";
import type { AgenteMeta } from "./core";
import * as whatsapp from "./ceoWhatsapp";
import * as comercial from "./ceoComercial";

export const LOOP_META: AgenteMeta = {
  id: "loop",
  nome: "Loop Agent",
  funcao: "Orquestrador (Protocolo Loop Q1)",
  descricao:
    "Conecta os 4 CEOs: roteia handoffs por regra e encadeia os agentes numa jornada. Nenhum lead cai no vao entre setores.",
  capacidades: [
    "Handoff por regra (deterministico)",
    "Orquestracao multi-agente",
    "Corte de budget automatico",
    "Cruzamento review x pipeline",
  ],
};

// ===================================================================
// 1) ROTEAMENTO DETERMINISTICO — os 3 gatilhos canonicos do Protocolo.
//    Zero LLM aqui: a decisao de handoff e codigo puro (nao alucina).
// ===================================================================
export const EventoSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("lead_fechado"), lead: z.string().min(1).max(120), perfil: z.string().max(200).optional() }),
  z.object({ tipo: z.literal("leads_frios_seguidos"), quantidade: z.number().int().min(1).max(1000), campanha: z.string().max(120).optional() }),
  z.object({ tipo: z.literal("review_negativa"), autor: z.string().min(1).max(120), nota: z.number().min(1).max(5), e_cliente: z.boolean(), texto: z.string().max(1500).optional() }),
]);
export type EventoLoop = z.infer<typeof EventoSchema>;

export interface Handoff {
  de: string;
  para: string;
  acao: string;
  prazo: string;
}
export interface ResultadoLoop {
  evento: string;
  narrativa: string;
  handoffs: Handoff[];
}

export function processarEvento(ev: EventoLoop): ResultadoLoop {
  switch (ev.tipo) {
    case "lead_fechado":
      return {
        evento: ev.tipo,
        narrativa: `Lead "${ev.lead}" fechou. O Loop reforca a segmentacao que converteu e programa o pedido de review.`,
        handoffs: [
          { de: "Loop", para: "CEO Ads", acao: `Reforcar a segmentacao do perfil que converteu${ev.perfil ? ` (${ev.perfil})` : ""}`, prazo: "imediato" },
          { de: "Loop", para: "CEO Local", acao: `Agendar pedido de review para "${ev.lead}"`, prazo: "em 3 dias" },
        ],
      };

    case "leads_frios_seguidos": {
      const corta = ev.quantidade >= 3;
      return {
        evento: ev.tipo,
        narrativa: corta
          ? `CEO Comercial marcou ${ev.quantidade} leads frios seguidos${ev.campanha ? ` da campanha "${ev.campanha}"` : ""}. O Loop aciona o corte de budget.`
          : `${ev.quantidade} lead(s) frio(s): abaixo do gatilho de 3. O Loop apenas monitora.`,
        handoffs: corta
          ? [{ de: "CEO Comercial", para: "CEO Ads", acao: `Cortar/realocar budget${ev.campanha ? ` da campanha "${ev.campanha}"` : ""}`, prazo: "em 48h" }]
          : [{ de: "Loop", para: "CEO Comercial", acao: "Seguir monitorando a qualidade dos leads", prazo: "continuo" }],
      };
    }

    case "review_negativa":
      return ev.e_cliente
        ? {
            evento: ev.tipo,
            narrativa: `Review nota ${ev.nota} de "${ev.autor}", que E cliente. O Loop cruza com o pipeline e sobe pro comercial antes de responder.`,
            handoffs: [{ de: "Loop", para: "CEO Comercial", acao: `Contatar "${ev.autor}" (cliente) para resolver antes de responder publicamente`, prazo: "antes de responder" }],
          }
        : {
            evento: ev.tipo,
            narrativa: `Review nota ${ev.nota} de "${ev.autor}", que NAO e cliente. O CEO Local responde publicamente.`,
            handoffs: [{ de: "Loop", para: "CEO Local", acao: `Responder publicamente a review de "${ev.autor}"`, prazo: "em 2h" }],
          };
  }
}

// ===================================================================
// 2) ORQUESTRACAO INTEGRADA — jornada de um lead novo.
//    CEO WhatsApp -> (decisao deterministica do Loop) -> CEO Comercial.
//    A saida ESTRUTURADA de um agente vira a ENTRADA do proximo:
//    nenhum texto solto vaza entre etapas (aterramento entre agentes).
// ===================================================================
export const JornadaInputSchema = z.object({
  nicho: z.string().trim().min(2).max(120),
  cidade: z.string().trim().min(2).max(80).nullable().optional().default(null),
  ticket_medio: z.number().positive().max(1_000_000).nullable().optional().default(null),
  mensagem_do_lead: z.string().trim().min(1).max(1500),
  nome_lead: z.string().trim().min(1).max(120).default("Lead"),
});
export type JornadaInput = z.infer<typeof JornadaInputSchema>;

export interface PassoJornada {
  agente: string;
  papel: string;
  saida: unknown;
}
export interface ResultadoJornada {
  timeline: PassoJornada[];
  handoffs: Handoff[];
  decisao: string;
}

export async function orquestrarLeadNovo(input: JornadaInput): Promise<ResultadoJornada> {
  const timeline: PassoJornada[] = [];
  const handoffs: Handoff[] = [];

  // Passo 1 — CEO WhatsApp atende e qualifica (BANT + score)
  const q = await whatsapp.executar({
    nicho: input.nicho,
    cidade: input.cidade,
    ticket_medio: input.ticket_medio,
    mensagem_do_lead: input.mensagem_do_lead,
    historico: [],
  });
  timeline.push({ agente: "CEO WhatsApp", papel: "Atendimento e qualificacao", saida: q });

  // Decisao do Loop — DETERMINISTICA (nao e o modelo que decide o handoff)
  const pronto = q.precisa_handoff || q.qualificado;

  if (pronto) {
    handoffs.push({
      de: "CEO WhatsApp",
      para: "CEO Comercial",
      acao: `Assumir "${input.nome_lead}" (score ${Math.round(q.score)}${q.motivo_handoff ? `, ${q.motivo_handoff}` : ""})`,
      prazo: "agora",
    });

    // Passo 2 — CEO Comercial recebe o lead JA qualificado e prepara o follow-up.
    // A entrada vem 100% da saida estruturada do WhatsApp (grounding entre agentes).
    const plano = await comercial.executar({
      nicho: input.nicho,
      leads: [
        {
          nome: input.nome_lead,
          estagio: "qualificado",
          dias_no_estagio: 0,
          score: Math.round(q.score),
          observacao: `BANT B:${q.bant.budget} A:${q.bant.authority} N:${q.bant.need} T:${q.bant.timing}. Proxima acao sugerida pelo atendimento: ${q.proxima_acao}`,
        },
      ],
    });
    timeline.push({ agente: "CEO Comercial", papel: "Diretor de vendas", saida: plano });

    return {
      timeline,
      handoffs,
      decisao: `Lead qualificado (score ${Math.round(q.score)}) -> handoff pro CEO Comercial, que ja preparou o follow-up.`,
    };
  }

  // Lead ainda frio: sem handoff (nao queimar o lead) — o WhatsApp segue nutrindo.
  handoffs.push({ de: "Loop", para: "CEO WhatsApp", acao: `Nutrir "${input.nome_lead}" ate esquentar`, prazo: "continuo" });
  return {
    timeline,
    handoffs,
    decisao: `Lead ainda frio (score ${Math.round(q.score)}). O CEO WhatsApp segue nutrindo; sem handoff pra nao queimar o lead.`,
  };
}
