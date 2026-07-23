import { createHash, timingSafeEqual } from "node:crypto";

// Comparacao constante no tempo (evita timing attack) + fail-closed:
// sem API_SECRET no ambiente, NENHUMA requisicao e autorizada.
export function segredoConfere(fornecido: string | null): boolean {
  const esperado = process.env.API_SECRET;
  if (!esperado || !fornecido) return false;
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(fornecido), h(esperado));
}
