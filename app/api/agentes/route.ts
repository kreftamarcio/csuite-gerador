import { listarMetas } from "@/lib/agents/registry";
import { LOOP_META } from "@/lib/agents/loop";

export const runtime = "nodejs";

// Roster do time (metadados, nao sensivel) — a UI usa pra renderizar a equipe.
export function GET() {
  return Response.json({ time: [...listarMetas(), LOOP_META] });
}
