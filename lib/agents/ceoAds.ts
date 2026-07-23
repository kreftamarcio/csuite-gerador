import { z } from "zod";
import { AgenteMeta, BASE_ANTIALUCINACAO, executarJson } from "./core";

export const meta: AgenteMeta = {
  id: "ads",
  nome: "CEO Ads",
  funcao: "Trafego pago autonomo",
  descricao:
    "Monta briefing e criativos, define a metrica-alvo e a regra de pausa/realocacao de budget.",
  capacidades: ["Briefing de campanha", "Criativos", "Metrica-alvo (CPL/ROAS)", "Regra de pausa automatica"],
};

export const InputSchema = z.object({
  nicho: z.string().trim().min(2).max(120),
  cidade: z.string().trim().min(2).max(80).nullable().optional().default(null),
  ticket_medio: z.number().positive().max(1_000_000).nullable().optional().default(null),
  objetivo: z.string().trim().max(200).nullable().optional().default(null),
  orcamento_mensal: z.number().positive().max(10_000_000).nullable().optional().default(null),
});
export type Input = z.infer<typeof InputSchema>;

export const OutputSchema = z.object({
  publico_alvo: z.string().min(1),
  angulos: z.array(z.string()).min(1).max(5),
  criativos: z.array(z.object({ headline: z.string(), corpo: z.string(), cta: z.string() })).min(1).max(5),
  metrica_alvo: z.object({ cpl_max: z.string(), roas_min: z.string() }),
  regra_pausa: z.string().min(1),
});
export type Output = z.infer<typeof OutputSchema>;

const SYSTEM = `${BASE_ANTIALUCINACAO}

Voce e o CEO Ads: operador de trafego pago do time C-Suite AI.
Monte um plano enxuto e acionavel para o nicho da entrada.

REGRAS:
- "publico_alvo": 1 frase especifica do nicho (e da cidade, se vier).
- "angulos": 3 angulos de dor/desejo reais do nicho.
- "criativos": 3, cada um com headline curta, corpo de ate 2 frases e cta claro.
- "metrica_alvo": cpl_max e roas_min como METAS. Se ticket_medio vier, dimensione o CPL de
  forma coerente com ele; se nao vier, use meta generica e conservadora. Nao invente R$ fora
  do que a entrada permite deduzir.
- "regra_pausa": condicao objetiva pra pausar/realocar budget (ex.: "pausar conjunto com CPL
  2x acima da meta por 3 dias seguidos").

FORMATO (responda so este JSON):
{"publico_alvo":"...","angulos":["..."],"criativos":[{"headline":"...","corpo":"...","cta":"..."}],"metrica_alvo":{"cpl_max":"...","roas_min":"..."},"regra_pausa":"..."}`;

export function executar(input: Input): Promise<Output> {
  return executarJson({ system: SYSTEM, entrada: input, schema: OutputSchema, temperatura: 0.4 });
}
