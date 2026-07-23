import { getAgente } from "@/lib/agents/registry";
import { segredoConfere } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Executa UM agente CEO. Auth + rate limit + validacao de entrada por agente.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const reqId = crypto.randomUUID();

  if (!segredoConfere(req.headers.get("x-api-secret"))) {
    return Response.json({ erro: "NAO_AUTORIZADO" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(ip)) {
    return Response.json({ erro: "RATE_LIMIT", detalhe: "max 10 req/min" }, { status: 429 });
  }

  const { id } = await ctx.params;
  const agente = getAgente(id);
  if (!agente) {
    return Response.json({ erro: "AGENTE_NAO_ENCONTRADO", id }, { status: 404 });
  }

  let bruto: unknown;
  try {
    bruto = await req.json();
  } catch {
    return Response.json({ erro: "JSON_INVALIDO" }, { status: 400 });
  }

  const parsed = agente.inputSchema.safeParse(bruto);
  if (!parsed.success) {
    return Response.json(
      { erro: "INVALIDO", campos: parsed.error.issues.map((i) => i.path.join(".")) },
      { status: 422 }
    );
  }

  try {
    const start = Date.now();
    const saida = await agente.executar(parsed.data);
    return Response.json({ reqId, agente: id, saida, latencia_ms: Date.now() - start });
  } catch (e: any) {
    console.error(JSON.stringify({ reqId, agente: id, erro: String(e?.message ?? e) }));
    return Response.json({ reqId, erro: "AGENTE_FALHOU" }, { status: 503 });
  }
}
