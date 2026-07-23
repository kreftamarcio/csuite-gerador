import Groq from "groq-sdk";

// Instancia lazy: o SDK lanca se a chave faltar NA CONSTRUCAO.
// No topo do modulo isso quebraria `next build` (page-data) e o deploy.
let _groq: Groq | null = null;
function getGroq(): Groq {
  if (_groq) return _groq;
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("LLM_API_KEY ausente no ambiente");
  _groq = new Groq({ apiKey });
  return _groq;
}

export async function chamarLLM(args: {
  system: string;
  user?: string;
  tentativa?: number;
  json?: boolean;        // força response_format json_object (usado pelos agentes CEO)
  temperatura?: number;  // default 0.4
}): Promise<string> {
  const model = process.env.LLM_MODEL ?? "llama-3.3-70b-versatile";

  for (let retry = 1; retry <= 3; retry++) {
    try {
      const completion = await getGroq().chat.completions.create({
        model,
        temperature: args.temperatura ?? 0.4,
        max_tokens: 4096,
        ...(args.json ? { response_format: { type: "json_object" as const } } : {}),
        messages: [
          { role: "system", content: args.system },
          {
            role: "user",
            content: args.user ?? "Gere os 6 entregáveis conforme a ENTRADA_JSON.",
          },
        ],
      });

      const text = completion.choices?.[0]?.message?.content;
      if (!text) throw new Error("Resposta vazia do modelo");
      return text;
    } catch (e: any) {
      // Rate limit ou erro transitório: espera e tenta de novo
      if (e?.status === 429 || e?.status >= 500) {
        if (retry === 3) throw e;
        await new Promise((r) => setTimeout(r, 2000 * retry));
        continue;
      }
      throw e; // Erro fatal (auth, input inválido)
    }
  }
  throw new Error("LLM indisponivel apos 3 tentativas");
}
