import { processarEvento } from "../lib/agents/loop";
import { listarMetas, getAgente, AGENTES } from "../lib/agents/registry";
import { InputSchema as WppInput } from "../lib/agents/ceoWhatsapp";

describe("registry do time", () => {
  test("time tem exatamente os 4 agentes CEO executaveis", () => {
    const ids = listarMetas().map((m) => m.id).sort();
    expect(ids).toEqual(["ads", "comercial", "local", "whatsapp"]);
  });

  test("cada agente tem meta completa e schema de entrada", () => {
    for (const a of Object.values(AGENTES)) {
      expect(a.meta.nome).toBeTruthy();
      expect(a.meta.funcao).toBeTruthy();
      expect(a.meta.capacidades.length).toBeGreaterThan(0);
      expect(a.inputSchema).toBeTruthy();
      expect(typeof a.executar).toBe("function");
    }
  });

  test("getAgente inexistente retorna undefined", () => {
    expect(getAgente("naoexiste")).toBeUndefined();
  });
});

describe("CEO WhatsApp — schema de entrada", () => {
  test("rejeita mensagem vazia", () => {
    expect(WppInput.safeParse({ nicho: "clinica", mensagem_do_lead: "" }).success).toBe(false);
  });

  test("aceita entrada minima e aplica defaults", () => {
    const p = WppInput.safeParse({ nicho: "clinica", mensagem_do_lead: "tem horario amanha?" });
    expect(p.success).toBe(true);
    if (p.success) {
      expect(p.data.cidade).toBeNull();
      expect(p.data.historico).toEqual([]);
    }
  });
});

describe("Loop Agent — roteamento deterministico (Protocolo Loop Q1)", () => {
  test("lead_fechado -> avisa CEO Ads e agenda review no CEO Local (3 dias)", () => {
    const r = processarEvento({ tipo: "lead_fechado", lead: "Joao" });
    expect(r.handoffs.map((h) => h.para)).toEqual(["CEO Ads", "CEO Local"]);
    expect(r.handoffs[1].prazo).toBe("em 3 dias");
  });

  test("3 leads frios seguidos -> corta budget em 48h", () => {
    const r = processarEvento({ tipo: "leads_frios_seguidos", quantidade: 3, campanha: "X" });
    expect(r.handoffs[0].de).toBe("CEO Comercial");
    expect(r.handoffs[0].para).toBe("CEO Ads");
    expect(r.handoffs[0].prazo).toBe("em 48h");
  });

  test("2 leads frios -> abaixo do gatilho, apenas monitora", () => {
    const r = processarEvento({ tipo: "leads_frios_seguidos", quantidade: 2 });
    expect(r.handoffs[0].para).toBe("CEO Comercial");
    expect(r.handoffs[0].prazo).toBe("continuo");
  });

  test("review negativa de CLIENTE -> sobe pro comercial antes de responder", () => {
    const r = processarEvento({ tipo: "review_negativa", autor: "Ana", nota: 1, e_cliente: true });
    expect(r.handoffs[0].para).toBe("CEO Comercial");
    expect(r.handoffs[0].prazo).toBe("antes de responder");
  });

  test("review negativa de NAO-cliente -> CEO Local responde em 2h", () => {
    const r = processarEvento({ tipo: "review_negativa", autor: "Rui", nota: 2, e_cliente: false });
    expect(r.handoffs[0].para).toBe("CEO Local");
    expect(r.handoffs[0].prazo).toBe("em 2h");
  });
});
