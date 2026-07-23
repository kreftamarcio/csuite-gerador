import { z } from "zod";
import { chamarLLM } from "@/lib/llm";

// Regras de aterramento (anti-alucinacao) herdadas por TODOS os agentes CEO.
export const BASE_ANTIALUCINACAO = `
Voce faz parte do time "C-Suite AI" da Q1 Digital. Fale pt-BR, direto, de dono pra dono,
sem jargao de agencia e sem termos em ingles fora de nomes proprios.

ATERRAMENTO (obrigatorio):
- Use SOMENTE os dados presentes na ENTRADA. Nao invente nomes, numeros, datas, clientes,
  depoimentos, metricas ou fatos que nao estejam la.
- Se um dado necessario faltar, marque como "desconhecido" ou deixe vazio e siga em frente.
  NUNCA preencha com suposicao.
- Nao prometa "resultado garantido". Nao cite valores em R$ que nao venham da ENTRADA.
- Sua saida e consumida por outro sistema: responda ESTRITAMENTE com um unico objeto JSON
  valido, no formato pedido, sem texto antes ou depois, sem markdown, sem comentarios.
`.trim();

export interface AgenteMeta {
  id: string;
  nome: string;
  funcao: string;
  descricao: string;
  capacidades: string[];
}

// Chama o modelo em modo JSON e valida contra o schema. 1 retry usando o erro
// de validacao como feedback -> converge pra saida valida sem alucinar formato.
export async function executarJson<S extends z.ZodTypeAny>(opts: {
  system: string;
  entrada: unknown;
  schema: S;
  temperatura?: number;
}): Promise<z.infer<S>> {
  const user = "ENTRADA (use apenas estes dados):\n" + JSON.stringify(opts.entrada, null, 2);
  let ultimoErro = "";
  for (let tent = 1; tent <= 2; tent++) {
    const correcao =
      tent === 1
        ? ""
        : `\n\n[CORRECAO] Seu JSON anterior falhou na validacao: ${ultimoErro}. Reenvie APENAS o JSON valido no formato exigido.`;
    const bruto = await chamarLLM({
      system: opts.system + correcao,
      user,
      json: true,
      temperatura: opts.temperatura ?? 0.3,
    });
    try {
      return opts.schema.parse(JSON.parse(bruto));
    } catch (e: any) {
      ultimoErro = String(e?.message ?? e).slice(0, 300);
    }
  }
  throw new Error("Agente nao produziu JSON valido: " + ultimoErro);
}
