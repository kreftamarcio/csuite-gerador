const PROIBIDAS = [
  "chatbot", "assistente virtual", "inteligencia artificial",
  "inteligência artificial", "algoritmo", "machine learning",
  "otimiz", "integracao", "integração", " api ",
  "onboarding", "dashboard", "automacao", "automação",
  "disruptiv", "revolucao", "revolução", "plataforma",
  "ecossistema", "escalav", "escaláv", "jornada do cliente",
];

const SECOES_OBRIGATORIAS = [
  "Variáveis usadas", "Prospecção", "Landing",
  "Tiers", "Demo", "Objeções", "Follow-up",
];

function contaPalavras(s: string): number {
  return (s.trim().match(/\S+/g) ?? []).length;
}

function extrairSecao(md: string, titulo: string): string {
  const regex = new RegExp(`## [^\n]*${titulo}[\\s\\S]*?(?=\n## |$)`, "i");
  return md.match(regex)?.[0] ?? "";
}

function extrairMensagens(s: string): string[] {
  return s
    .split(/\n(?=[-*]|\*\*(?:Dia|Vers)|(?:Dia|Vers))/i)
    .map((x) => x.trim())
    .filter((x) => x.length > 30);
}

export interface Violacao {
  tipo: "estrutura" | "placeholder" | "vocabulario" | "numero" | "limite" | "cidade";
  detalhe: string;
}

export function validar(
  md: string,
  permitidos: Set<string>,
  cidade: string | null
): Violacao[] {
  const v: Violacao[] = [];

  // 1. Estrutura (7 seções obrigatórias)
  for (const s of SECOES_OBRIGATORIAS) {
    if (!new RegExp(s, "i").test(md)) {
      v.push({ tipo: "estrutura", detalhe: `secao ausente: ${s}` });
    }
  }

  // 2. Placeholder órfão
  const orf = md.match(/\{[A-Z_]+(_(fmt|FMT))?\}/g);
  if (orf) {
    v.push({ tipo: "placeholder", detalhe: `placeholder orfao: ${[...new Set(orf)].join(", ")}` });
  }

  // 3. Vocabulário proibido
  const low = md.toLowerCase();
  for (const p of PROIBIDAS) {
    if (low.includes(p)) {
      v.push({ tipo: "vocabulario", detalhe: `termo proibido: "${p.trim()}"` });
    }
  }

  // 4. Procedência numérica (todo R$ deve estar no set permitido)
  const valoresEncontrados = md.match(/R\$\s?[\d.]+/g) ?? [];
  for (const raw of valoresEncontrados) {
    const normalizado = raw.replace(/\s+/g, " ").trim();
    if (!permitidos.has(normalizado)) {
      v.push({ tipo: "numero", detalhe: `numero sem procedencia: ${normalizado}` });
    }
  }

  // 5. Limites duros
  const landing = extrairSecao(md, "Landing");
  if (landing && contaPalavras(landing) > 470) {
    v.push({ tipo: "limite", detalhe: `landing ${contaPalavras(landing)} palavras (max 450)` });
  }

  const prospeccao = extrairSecao(md, "Prospecção");
  for (const m of extrairMensagens(prospeccao)) {
    if (m.length > 320) {
      v.push({ tipo: "limite", detalhe: `prospeccao ${m.length} chars (max 300)` });
    }
  }

  const followup = extrairSecao(md, "Follow-up");
  for (const m of extrairMensagens(followup)) {
    if (m.length > 540) {
      v.push({ tipo: "limite", detalhe: `follow-up ${m.length} chars (max 500)` });
    }
  }

  // 6. Cidade fornecida mas não mencionada
  if (cidade && cidade.length > 1 && !md.toLowerCase().includes(cidade.toLowerCase())) {
    v.push({ tipo: "cidade", detalhe: "cidade fornecida mas nao citada no output" });
  }

  return v;
}
