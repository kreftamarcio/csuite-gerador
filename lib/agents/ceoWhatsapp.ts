import { z } from "zod";
import { AgenteMeta, BASE_ANTIALUCINACAO, executarJson } from "./core";

export const meta: AgenteMeta = {
  id: "whatsapp",
  nome: "CEO WhatsApp",
  funcao: "Atendimento e qualificacao 24/7",
  descricao:
    "Responde o lead em segundos, qualifica por BANT, agenda e faz handoff quando o lead esquenta.",
  capacidades: ["Resposta 24/7 em ate 40s", "Qualificacao BANT", "Agendamento", "Handoff inteligente"],
};

export const InputSchema = z.object({
  nicho: z.string().trim().min(2).max(120),
  cidade: z.string().trim().min(2).max(80).nullable().optional().default(null),
  ticket_medio: z.number().positive().max(1_000_000).nullable().optional().default(null),
  mensagem_do_lead: z.string().trim().min(1).max(1500),
  historico: z
    .array(z.object({ de: z.enum(["lead", "agente"]), texto: z.string().max(1500) }))
    .max(20)
    .optional()
    .default([]),
});
export type Input = z.infer<typeof InputSchema>;

const Nivel = z.enum(["alto", "medio", "baixo", "desconhecido"]);
export const OutputSchema = z.object({
  resposta: z.string().min(1),
  bant: z.object({ budget: Nivel, authority: Nivel, need: Nivel, timing: Nivel }),
  score: z.number().min(0).max(100),
  qualificado: z.boolean(),
  proxima_acao: z.string().min(1),
  precisa_handoff: z.boolean(),
  motivo_handoff: z.string().default(""),
});
export type Output = z.infer<typeof OutputSchema>;

const SYSTEM = `${BASE_ANTIALUCINACAO}

Voce e o CEO WhatsApp: operador de atendimento e qualificacao do time C-Suite AI.
Meta: responder rapido (tom de quem responde em ate 40s), acolher a dor real do nicho e
qualificar por BANT sem soar interrogatorio.

REGRAS:
- "resposta": no maximo 3 frases, humana, terminando com 1 pergunta que avanca a venda.
  Se a cidade vier na entrada, pode cita-la; se nao vier, nao invente cidade.
- "bant": classifique cada dimensao (budget, authority, need, timing) SO com base no que o
  lead disse no historico/mensagem. Sem sinal claro = "desconhecido".
- "score": 0-100 = prontidao de compra. "qualificado" = (score >= 60).
- "precisa_handoff": true quando o lead esta quente (pede preco/proposta/quer fechar ou marcar)
  ou pede algo alem de atendimento; senao false. "motivo_handoff": curto, ou "" se false.

FORMATO (responda so este JSON):
{"resposta":"...","bant":{"budget":"...","authority":"...","need":"...","timing":"..."},"score":0,"qualificado":false,"proxima_acao":"...","precisa_handoff":false,"motivo_handoff":""}`;

export function executar(input: Input): Promise<Output> {
  return executarJson({ system: SYSTEM, entrada: input, schema: OutputSchema, temperatura: 0.4 });
}
