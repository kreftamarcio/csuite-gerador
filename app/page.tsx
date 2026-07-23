"use client";

import { useState } from "react";

type Resposta = {
  reqId: string;
  status: "ok" | "revisar";
  tentativas: number;
  violacoes: string[];
  variaveis: Record<string, unknown>;
  markdown: string;
  latencia_ms: number;
};

const CAMPOS_VARIAVEIS: [string, string][] = [
  ["nicho", "Nicho"],
  ["cidade", "Cidade"],
  ["caso", "Caso"],
  ["ticket_medio", "Ticket médio"],
  ["leads_por_mes", "Leads/mês"],
  ["prejuizo_atual", "Prejuízo atual"],
  ["receita_recuperada", "Receita recuperada"],
  ["tier", "Tier"],
  ["mensal", "Mensalidade"],
  ["setup", "Setup"],
  ["roi_mult", "ROI (x)"],
];

export default function Home() {
  const [secret, setSecret] = useState("");
  const [nicho, setNicho] = useState("clínica odontológica");
  const [cidade, setCidade] = useState("Curitiba");
  const [ticket, setTicket] = useState(3500);
  const [leads, setLeads] = useState(80);
  const [taxa, setTaxa] = useState(0.52);
  const [caso, setCaso] = useState<"simulacao" | "real">("simulacao");

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [resp, setResp] = useState<Resposta | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    setResp(null);
    try {
      const r = await fetch("/api/gerar", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-secret": secret },
        body: JSON.stringify({
          nicho,
          cidade: cidade || null,
          ticket_medio: Number(ticket),
          leads_por_mes: Number(leads),
          taxa_perda_atual: Number(taxa),
          caso,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErro(`${r.status} — ${j.erro ?? "erro"}${j.detalhe ? ": " + JSON.stringify(j.detalhe) : ""}`);
      } else {
        setResp(j as Resposta);
      }
    } catch (err) {
      setErro("Falha de rede: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  async function copiar() {
    if (!resp) return;
    await navigator.clipboard.writeText(resp.markdown);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <main>
      <nav className="nav">
        <a href="/" className="ativo">Gerador</a>
        <a href="/equipe">Equipe C-Suite</a>
      </nav>

      <div className="header">
        <h1>
          C-Suite AI — Gerador<span className="badge">v5.5</span>
        </h1>
        <p>Gerador interno de sistema de vendas · Q1 Digital. Preencha e gere os 6 entregáveis.</p>
      </div>

      <div className="grid">
        <form className="card" onSubmit={gerar}>
          <h2>Entrada</h2>

          <label>Senha de acesso (x-api-secret)</label>
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="API_SECRET" />

          <label>Nicho</label>
          <input value={nicho} onChange={(e) => setNicho(e.target.value)} required minLength={2} />

          <label>Cidade (opcional)</label>
          <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="deixe vazio se não usar" />

          <div className="row">
            <div>
              <label>Ticket médio (R$)</label>
              <input type="number" value={ticket} min={1} onChange={(e) => setTicket(+e.target.value)} required />
            </div>
            <div>
              <label>Leads / mês</label>
              <input type="number" value={leads} min={1} onChange={(e) => setLeads(+e.target.value)} required />
            </div>
          </div>

          <div className="row">
            <div>
              <label>Taxa de perda (0.05–0.95)</label>
              <input type="number" step="0.01" min={0.05} max={0.95} value={taxa} onChange={(e) => setTaxa(+e.target.value)} required />
            </div>
            <div>
              <label>Caso</label>
              <select value={caso} onChange={(e) => setCaso(e.target.value as "simulacao" | "real")}>
                <option value="simulacao">Simulação</option>
                <option value="real">Real</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Gerando… (pode levar até 2 min)" : "Gerar entregáveis"}
          </button>
          <p className="hint">A senha precisa bater com a env <code>API_SECRET</code> do servidor.</p>
        </form>

        <div className="card">
          <h2>Saída</h2>

          {!resp && !erro && !loading && (
            <div className="placeholder">Preencha a entrada e clique em “Gerar entregáveis”.</div>
          )}
          {loading && <div className="placeholder">Consultando o modelo e validando com o juiz…</div>}
          {erro && <div className="err-box">⚠ {erro}</div>}

          {resp && (
            <>
              <div className="status">
                <span className={`pill ${resp.status === "ok" ? "ok" : "revisar"}`}>
                  {resp.status === "ok" ? "✓ aprovado" : "⚠ revisar"}
                </span>
                <span>{resp.tentativas} tentativa(s)</span>
                <span>· {resp.latencia_ms} ms</span>
                <span>· {resp.reqId.slice(0, 8)}</span>
              </div>

              {resp.violacoes.length > 0 && (
                <div className="violacoes">
                  <strong>Violações restantes:</strong>
                  <ul>
                    {resp.violacoes.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}

              <table>
                <tbody>
                  {CAMPOS_VARIAVEIS.map(([k, rot]) =>
                    resp.variaveis[k] != null ? (
                      <tr key={k}>
                        <th>{rot}</th>
                        <td>{String(resp.variaveis[k])}</td>
                      </tr>
                    ) : null
                  )}
                </tbody>
              </table>

              <div className="output-head">
                <strong style={{ fontSize: "0.9rem" }}>Markdown</strong>
                <button type="button" className="copy-btn" onClick={copiar}>
                  {copiado ? "✓ copiado" : "copiar"}
                </button>
              </div>
              <pre className="md">{resp.markdown}</pre>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
