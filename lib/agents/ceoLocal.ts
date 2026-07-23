import { z } from "zod";
import { AgenteMeta, BASE_ANTIALUCINACAO, executarJson } from "./core";

export const meta: AgenteMeta = {
  id: "local",
  nome: "CEO Local",
  funcao: "Google Business + SEO local",
  descricao: "Responde reviews, mede sentimento, cuida do perfil e alerta queda de ranking.",
  capacidades: ["Resposta a reviews", "Analise de sentimento", "Perfil atualizado", "Alerta de ranking"],
};

export const InputSchema = z.object({
  nicho: z.string().trim().min(2).max(120),
  cidade: z.string().trim().min(2).max(80).nullable().optional().default(null),
  reviews: z
    .array(
      z.object({
        autor: z.string().trim().min(1).max(120),
        nota: z.number().min(1).max(5),
        texto: z.string().trim().max(1500).default(""),
      })
    )
    .min(1)
    .max(50),
});
export type Input = z.infer<typeof InputSchema>;

export const OutputSchema = z.object({
  respostas: z.array(z.object({ autor: z.string(), nota: z.number(), resposta: z.string() })),
  sentimento_geral: z.enum(["positivo", "neutro", "negativo"]),
  nota_media: z.number(),
  alertas: z.array(z.string()),
  acoes_perfil: z.array(z.string()),
});
export type Output = z.infer<typeof OutputSchema>;

const SYSTEM = `${BASE_ANTIALUCINACAO}

Voce e o CEO Local: cuida da reputacao (Google Business) e do SEO local do time C-Suite AI.
Trabalhe SOMENTE com as reviews da entrada (mesmos autores e notas).

REGRAS:
- "respostas": 1 resposta publica por review, no tom do dono, curta, educada e especifica.
  Review baixa (nota <= 2): reconheca o problema e chame pro privado pra resolver, sem prometer
  nada falso. Review alta: agradeca de forma especifica, nunca generica.
- "sentimento_geral": positivo/neutro/negativo olhando o conjunto.
- "nota_media": a media das notas (o sistema recalcula em codigo depois; seja fiel a entrada).
- "alertas": ex.: "3 reviews baixas seguidas => risco de ranking".
- "acoes_perfil": melhorias concretas de perfil/SEO local pro nicho (e cidade, se vier).

FORMATO (responda so este JSON):
{"respostas":[{"autor":"...","nota":5,"resposta":"..."}],"sentimento_geral":"...","nota_media":0,"alertas":["..."],"acoes_perfil":["..."]}`;

export async function executar(input: Input): Promise<Output> {
  const out = await executarJson({ system: SYSTEM, entrada: input, schema: OutputSchema, temperatura: 0.3 });
  // Fonte da verdade: a nota media e calculada em codigo, nao pelo modelo.
  const media = input.reviews.reduce((s, r) => s + r.nota, 0) / input.reviews.length;
  out.nota_media = Math.round(media * 10) / 10;
  return out;
}
