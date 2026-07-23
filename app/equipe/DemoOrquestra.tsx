"use client";

import { useState } from "react";

type Handoff = { de: string; para: string; acao: string; prazo: string };
type Passo = { agente: string; papel: string; saida: any };
type Resultado = { timeline: Passo[]; handoffs: Handoff[]; decisao: string };
type Resposta = { reqId: string; resultado: Resultado; latencia_ms: number };

const AVATAR: Record<string, string> = {
  "CEO WhatsApp": "💬",
  "CEO Comercial": "📈",
  "CEO Ads": "📣",
  "CEO Local": "⭐",
};

function BantView({ bant }: { bant: Record<string, string> }) {
  return (
    <div className="bant">
      {Object.entries(bant).map(([k, v]) => (
        <span className={`b ${v}`} key={k}>
          {k}: {v}
        </span>
      ))}
    </div>
  );
}

function SaidaView({ agente, saida }: { agente: string; saida: any }) {
  // CEO WhatsApp
  if (saida && typeof saida.resposta === "string" && saida.bant) {
    return (
      <>
        <div className="quote">{saida.resposta}</div>
        <BantView bant={saida.bant} />
        <div className="kv">
          <b>Score:</b> {saida.score}/100 · <b>{saida.qualificado ? "qualificado ✓" : "ainda frio"}</b>
          {saida.precisa_handoff ? " · pediu handoff" : ""}
        </div>
        <div className="kv"><b>Próxima ação:</b> {saida.proxima_acao}</div>
      </>
    );
  }
  // CEO Comercial
  if (saida && Array.isArray(saida.follow_ups)) {
    return (
      <>
        {saida.relatorio_diario?.acao_do_dia && (
          <div className="kv"><b>Ação do dia:</b> {saida.relatorio_diario.acao_do_dia}</div>
        )}
        {saida.follow_ups.map((f: any, i: number) => (
          <div className="kv" key={i}>
            <b>{f.nome}</b> · {f.quando} · {f.canal}: “{f.mensagem}”
          </div>
        ))}
        {Array.isArray(saida.alertas) && saida.alertas.length > 0 && (
          <div className="kv"><b>Alertas:</b> {saida.alertas.join(" · ")}</div>
        )}
      </>
    );
  }
  return <div className="kv">{JSON.stringify(saida)}</div>;
}

export default function DemoOrquestra() {
  const [secret, setSecret] = useState("");
  const [nicho, setNicho] = useState("clínica odontológica");
  const [cidade, setCidade] = useState("Curitiba");
  const [ticket, setTicket] = useState(3500);
  const [nomeLead, setNomeLead] = useState("Carlos");
  const [mensagem, setMensagem] = useState(
    "Vi o anúncio de vocês. Quanto custa? Preciso resolver o atendimento da minha clínica ainda esse mês."
  );

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [resp, setResp] = useState<Resposta | null>(null);

  async function rodar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    setResp(null);
    try {
      const r = await fetch("/api/orquestrar", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-secret": secret },
        body: JSON.stringify({
          nicho,
          cidade: cidade || null,
          ticket_medio: Number(ticket),
          nome_lead: nomeLead,
          mensagem_do_lead: mensagem,
        }),
      });
      const j = await r.json();
      if (!r.ok) setErro(`${r.status} — ${j.erro ?? "erro"}`);
      else setResp(j as Resposta);
    } catch (err) {
      setErro("Falha de rede: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      <form className="card" onSubmit={rodar}>
        <h2>Lead chegou no WhatsApp</h2>

        <label>Senha de acesso (x-api-secret)</label>
        <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="API_SECRET" />

        <label>Nicho</label>
        <input value={nicho} onChange={(e) => setNicho(e.target.value)} />

        <div className="row">
          <div>
            <label>Cidade</label>
            <input value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </div>
          <div>
            <label>Ticket médio (R$)</label>
            <input type="number" value={ticket} min={1} onChange={(e) => setTicket(+e.target.value)} />
          </div>
        </div>

        <label>Nome do lead</label>
        <input value={nomeLead} onChange={(e) => setNomeLead(e.target.value)} />

        <label>Mensagem do lead</label>
        <input value={mensagem} onChange={(e) => setMensagem(e.target.value)} />

        <button type="submit" disabled={loading}>
          {loading ? "Orquestrando o time…" : "Rodar orquestração"}
        </button>
        <p className="hint">
          CEO WhatsApp qualifica → o Loop decide (por regra) → se esquentou, o CEO Comercial assume.
        </p>
      </form>

      <div className="card">
        <h2>O time em ação</h2>

        {!resp && !erro && !loading && (
          <div className="placeholder">Envie a mensagem e veja os agentes se passarem o bastão.</div>
        )}
        {loading && <div className="placeholder">Os CEOs estão trabalhando (pode levar alguns segundos)…</div>}
        {erro && <div className="err-box">⚠ {erro}</div>}

        {resp && (
          <>
            <div className="decisao">🔁 <b>Decisão do Loop:</b> {resp.resultado.decisao}</div>

            <div className="section-title" style={{ margin: "6px 0 8px" }}>Handoffs</div>
            {resp.resultado.handoffs.map((h, i) => (
              <div className="handoff" key={i}>
                <span>{h.de}</span>
                <span className="arrow">→</span>
                <span>{h.para}</span>
                <span>· {h.acao}</span>
                <span className="prazo">{h.prazo}</span>
              </div>
            ))}

            <div className="section-title" style={{ margin: "18px 0 8px" }}>Timeline</div>
            {resp.resultado.timeline.map((p, i) => (
              <div className="step" key={i}>
                <div className="step-head">
                  <span className="avatar">{AVATAR[p.agente] ?? "🤖"}</span>
                  {p.agente} <small>· {p.papel}</small>
                </div>
                <SaidaView agente={p.agente} saida={p.saida} />
                <details className="raw">
                  <summary>ver JSON bruto</summary>
                  <pre>{JSON.stringify(p.saida, null, 2)}</pre>
                </details>
              </div>
            ))}

            <div className="kv" style={{ marginTop: 10 }}>
              {resp.resultado.timeline.length} agente(s) · {resp.latencia_ms} ms · {resp.reqId.slice(0, 8)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
