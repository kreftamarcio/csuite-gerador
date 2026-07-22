import { calcRoi, tierPorLeads } from "../lib/roi";

describe("calcRoi", () => {
  test("golden: 60 leads, ticket 3000, perda 0.58", () => {
    const r = calcRoi({ ticket_medio: 3000, leads_por_mes: 60, taxa_perda_atual: 0.58 });
    expect(r.leads_perdidos).toBe(35);
    expect(r.clientes_perdidos).toBe(9);
    expect(r.prejuizo_atual).toBe(27000);
    expect(r.leads_recuperados).toBe(21);
    expect(r.novos_clientes).toBe(5);
    expect(r.receita_recuperada).toBe(15000);
    expect(r.prejuizo_atual_fmt).toBe("R$ 27.000");
    expect(r.receita_recuperada_fmt).toBe("R$ 15.000");
    expect(r.roi_alto).toBe(false);
    expect(r.ganho_baixo).toBe(false);
  });

  test("golden: 80 leads, ticket 3500, perda 0.52", () => {
    const r = calcRoi({ ticket_medio: 3500, leads_por_mes: 80, taxa_perda_atual: 0.52 });
    expect(r.leads_perdidos).toBe(42);
    expect(r.leads_recuperados).toBe(25);
    expect(r.novos_clientes).toBe(6);
    expect(r.receita_recuperada).toBe(21000);
  });

  test("zero-guard: volume minusculo aciona ganho_baixo", () => {
    const r = calcRoi({ ticket_medio: 100, leads_por_mes: 5, taxa_perda_atual: 0.5 });
    expect(r.ganho_baixo).toBe(true);
  });

  test("roi_alto dispara acima de 20x", () => {
    const r = calcRoi({ ticket_medio: 50000, leads_por_mes: 200, taxa_perda_atual: 0.8 });
    expect(r.roi_alto).toBe(true);
  });
});

describe("tierPorLeads", () => {
  test("Starter ate 50", () => expect(tierPorLeads(50).nome).toBe("Starter"));
  test("Growth 51-200", () => expect(tierPorLeads(51).nome).toBe("Growth"));
  test("Full C-Suite 201+", () => expect(tierPorLeads(201).nome).toBe("Full C-Suite"));
  test("fmt correto", () => expect(tierPorLeads(100).mensal_fmt).toBe("R$ 2.997"));
});
