const CONV_BASE = 0.25; // conversao-base conservadora (declarada)
const REC_RATE = 0.60;  // taxa de recuperacao conservadora (declarada)

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

// Intl usa NBSP (U+00A0) e narrow NBSP (U+202F) entre "R$" e o numero.
// Normalizamos para espaco comum: senao o Set `permitidos` (que guarda os _fmt)
// nunca casa com os valores que o validador extrai e normaliza do markdown,
// e todo R$ derivado do ROI seria marcado como "sem procedencia".
const fmtBRL = (n: number): string =>
  brl.format(n).replace(/[  ]/g, " ");

export interface Tier {
  nome: string;
  mensal: number;
  setup: number;
  mensal_fmt: string;
  setup_fmt: string;
}

export function tierPorLeads(leads: number): Tier {
  if (leads <= 50)
    return { nome: "Starter", mensal: 1997, setup: 4997, mensal_fmt: "R$ 1.997", setup_fmt: "R$ 4.997" };
  if (leads <= 200)
    return { nome: "Growth", mensal: 2997, setup: 6997, mensal_fmt: "R$ 2.997", setup_fmt: "R$ 6.997" };
  return { nome: "Full C-Suite", mensal: 4997, setup: 9997, mensal_fmt: "R$ 4.997", setup_fmt: "R$ 9.997" };
}

export interface RoiResult {
  leads_perdidos: number;
  clientes_perdidos: number;
  prejuizo_atual: number;
  leads_recuperados: number;
  novos_clientes: number;
  receita_recuperada: number;
  tres_tickets: number;
  roi_mult: number;
  roi_alto: boolean;
  ganho_baixo: boolean;
  // campos _fmt: o LLM usa SÓ estes
  prejuizo_atual_fmt: string;
  receita_recuperada_fmt: string;
  tres_tickets_fmt: string;
  ticket_medio_fmt: string;
  leads_perdidos_fmt: string;
  leads_recuperados_fmt: string;
  novos_clientes_fmt: string;
}

export function calcRoi(i: {
  ticket_medio: number;
  leads_por_mes: number;
  taxa_perda_atual: number;
}): RoiResult {
  const leads_perdidos = Math.round(i.leads_por_mes * i.taxa_perda_atual);
  const clientes_perdidos = Math.round(leads_perdidos * CONV_BASE);
  const prejuizo_atual = clientes_perdidos * i.ticket_medio;

  const leads_recuperados = Math.round(leads_perdidos * REC_RATE);
  const novos_clientes = Math.round(leads_recuperados * CONV_BASE);
  const receita_recuperada = novos_clientes * i.ticket_medio;

  const tres_tickets = 3 * i.ticket_medio;

  const custo = tierPorLeads(i.leads_por_mes).mensal;
  const roi_mult = custo > 0 ? Number((receita_recuperada / custo).toFixed(1)) : 0;

  return {
    leads_perdidos,
    clientes_perdidos,
    prejuizo_atual,
    leads_recuperados,
    novos_clientes,
    receita_recuperada,
    tres_tickets,
    roi_mult,
    roi_alto: roi_mult > 20,
    ganho_baixo: novos_clientes < 1 || receita_recuperada < custo,
    // Formatados (fonte da verdade pro LLM)
    prejuizo_atual_fmt: fmtBRL(prejuizo_atual),
    receita_recuperada_fmt: fmtBRL(receita_recuperada),
    tres_tickets_fmt: fmtBRL(tres_tickets),
    ticket_medio_fmt: fmtBRL(i.ticket_medio),
    leads_perdidos_fmt: String(leads_perdidos),
    leads_recuperados_fmt: String(leads_recuperados),
    novos_clientes_fmt: String(novos_clientes),
  };
}
