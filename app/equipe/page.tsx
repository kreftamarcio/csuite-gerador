import { listarMetas } from "@/lib/agents/registry";
import { LOOP_META } from "@/lib/agents/loop";
import DemoOrquestra from "./DemoOrquestra";

export const metadata = { title: "Equipe C-Suite AI — Agentes CEO" };

const AVATAR: Record<string, string> = {
  ads: "📣",
  whatsapp: "💬",
  comercial: "📈",
  local: "⭐",
  loop: "🔁",
};

const PROTOCOLO: string[] = [
  "Lead fecha → o Loop avisa o CEO Ads (“esse perfil converte, reforça a segmentação”) e agenda o CEO Local pra pedir review em 3 dias.",
  "Campanha traz lead ruim → o CEO Comercial marca 3 leads frios seguidos → o Loop corta o budget em 48h.",
  "Review negativa chega → o Loop cruza com o pipeline: é cliente? sobe pro comercial antes de responder; não é? o CEO Local responde em 2h.",
];

export default function EquipePage() {
  const agentes = listarMetas();

  return (
    <main>
      <nav className="nav">
        <a href="/">Gerador</a>
        <a href="/equipe" className="ativo">Equipe C-Suite</a>
      </nav>

      <div className="header">
        <h1>
          Equipe C-Suite AI<span className="badge">5 agentes</span>
        </h1>
        <p>
          O diferencial: não é um chatbot. É um time de agentes CEO que operam sozinhos e se
          passam o bastão pelo Protocolo Loop Q1 — nenhum lead cai no vão entre setores.
        </p>
      </div>

      <div className="team-grid">
        {agentes.map((a) => (
          <div className="agent-card" key={a.id}>
            <h3>
              <span className="avatar">{AVATAR[a.id] ?? "🤖"}</span>
              {a.nome}
            </h3>
            <div className="fn">{a.funcao}</div>
            <p>{a.descricao}</p>
            <ul className="caps">
              {a.capacidades.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        ))}

        <div className="agent-card loop">
          <h3>
            <span className="avatar">{AVATAR[LOOP_META.id]}</span>
            {LOOP_META.nome}
          </h3>
          <div className="fn">{LOOP_META.funcao}</div>
          <p>{LOOP_META.descricao}</p>
          <ul className="caps">
            {LOOP_META.capacidades.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="section-title">Protocolo Loop Q1 — os 3 handoffs</div>
      <div className="card">
        <ul className="protocol">
          {PROTOCOLO.map((p, i) => (
            <li key={i}>
              <span className="n">{i + 1}</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="section-title">Orquestração ao vivo — jornada de um lead novo</div>
      <DemoOrquestra />
    </main>
  );
}
