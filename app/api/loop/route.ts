import { processarEvento, EventoSchema } from "@/lib/agents/loop";
import { segredoConfere } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

// Roteamento deterministico do Protocolo Loop Q1 (sem LLM).
export async function POST(req: Request) {
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

  const parsed = EventoSchema.safeParse(bruto);
  if (!parsed.success) {
    return Response.json(
      { erro: "INVALIDO", campos: parsed.error.issues.map((i) => i.path.join(".")) },
      { status: 422 }
    );
  }

  return Response.json({ resultado: processarEvento(parsed.data) });
}
