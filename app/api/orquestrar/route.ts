import { orquestrarLeadNovo, JornadaInputSchema } from "@/lib/agents/loop";
import { segredoConfere } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60; // Limite do plano Vercel Hobby (Pro suporta até 300s)

// Orquestracao integrada: CEO WhatsApp -> Loop (decisao) -> CEO Comercial.
// Multiplas chamadas ao modelo encadeadas com aterramento entre etapas.
export async function POST(req: Request) {
  const reqId = crypto.randomUUID();

  if (!segredoConfere(req.headers.get("x-api-secret"))) {
    return Response.json({ erro: "NAO_AUTORIZADO" }, { status: 401 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(ip)) {
    return Response.json({ erro: "RATE_LIMIT" }, { status: 429 });
  }

  let bruto: unknown;
  try {
    bruto = await req.json();
  } catch {
    return Response.json({ erro: "JSON_INVALIDO" }, { status: 400 });
  }

  const parsed = JornadaInputSchema.safeParse(bruto);
  if (!parsed.success) {
    return Response.json(
      { erro: "INVALIDO", campos: parsed.error.issues.map((i) => i.path.join(".")) },
      { status: 422 }
    );
  }

  try {
    const start = Date.now();
    const resultado = await orquestrarLeadNovo(parsed.data);
    return Response.json({ reqId, resultado, latencia_ms: Date.now() - start });
  } catch (e: any) {
    console.error(JSON.stringify({ reqId, erro: String(e?.message ?? e) }));
    return Response.json({ reqId, erro: "ORQUESTRACAO_FALHOU" }, { status: 503 });
  }
}
