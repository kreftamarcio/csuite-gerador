import { z } from "zod";
import { AgenteMeta, BASE_ANTIALUCINACAO, executarJson } from "./core";

export const meta: AgenteMeta = {
  id: "comercial",
  nome: "CEO Comercial",
  funcao: "Diretor de vendas",
  descricao:
    "Faz lead scoring, prioriza o pipeline, gera follow-ups prontos e o relatorio diario do dono.",
  capacidades: ["Lead scoring", "Pipeline priorizado", "Follow-up automatico", "Relatorio diario"],
};

const Estagio = z.enum([
  "novo",
  "contatado",
  "qualificado",
  "proposta",
  "negociacao",
  "fechado",
  "perdido",
]);

export const InputSchema = z.object({
  nicho: z.string().trim().min(2).max(120),
  leads: z
    .array(
      z.object({
        nome: z.string().trim().min(1).max(120),
        estagio: Estagio,
        dias_no_estagio: z.number().int().min(0).max(3650),
        score: z.number().min(0).max(100).nullable().optional().default(null),
        observacao: z.string().max(500).nullable().optional().default(null),
      })
    )
    .min(1)
    .max(50),
});
export type Input = z.infer<typeof InputSchema>;

const Prioridade = z.enum(["alta", "media", "baixa"]);
export const OutputSchema = z.object({
  scoring: z.array(z.object({ nome: z.string(), score: z.number().min(0).max(100), prioridade: Prioridade })),
  follow_ups: z.array(z.object({ nome: z.string(), quando: z.string(), canal: z.string(), mensagem: z.string() })),
  alertas: z.array(z.string()),
  relatorio_diario: z.object({
    resumo: z.string(),
    quentes: z.array(z.string()),
    frios: z.array(z.string()),
    acao_do_dia: z.string(),
  }),
});
export type Output = z.infer<typeof OutputSchema>;

const SYSTEM = `${BASE_ANTIALUCINACAO}

Voce e o CEO Comercial: diretor de vendas do time C-Suite AI.
Trabalhe SOMENTE com os leads da entrada (mesmos nomes, sem inventar leads novos).

REGRAS:
- "scoring": para CADA lead da entrada, um score 0-100 e prioridade (alta/media/baixa),
  coerentes com estagio e dias_no_estagio (parado ha muito tempo => mais frio ou vira alerta).
- "follow_ups": 1 acao por lead que precise, com "quando" (ex.: "hoje", "em 2 dias"), canal e a
  "mensagem" pronta pra enviar (curta, de dono pra dono).
- "alertas": riscos objetivos (ex.: "Fulano ha 9 dias em proposta sem resposta").
- "relatorio_diario": resumo do dia, listas "quentes"/"frios" (apenas nomes da entrada) e a
  "acao_do_dia" (a coisa mais importante a fazer hoje).

FORMATO (responda so este JSON):
{"scoring":[{"nome":"...","score":0,"prioridade":"..."}],"follow_ups":[{"nome":"...","quando":"...","canal":"...","mensagem":"..."}],"alertas":["..."],"relatorio_diario":{"resumo":"...","quentes":["..."],"frios":["..."],"acao_do_dia":"..."}}`;

export function executar(input: Input): Promise<Output> {
  return executarJson({ system: SYSTEM, entrada: input, schema: OutputSchema, temperatura: 0.3 });
}
