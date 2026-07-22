// Rate limit em memória (suficiente pra uso interno)
// Em produção com múltiplos instances, migrar pra Upstash Redis
const hits = new Map<string, number[]>();
const JANELA_MS = 60_000;
const MAX_POR_MINUTO = 10;

export function rateLimit(ip: string): boolean {
  const agora = Date.now();
  const lista = (hits.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  lista.push(agora);
  hits.set(ip, lista);
  return lista.length <= MAX_POR_MINUTO;
}
