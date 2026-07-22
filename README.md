# C-Suite AI — Gerador (v5.5)

Gerador interno de **sistema de vendas** (6 entregáveis em Markdown) para a Q1 Digital.
Next.js 15 (App Router) + TypeScript. O modelo escreve a copy; o **servidor é a fonte da verdade dos números** e um **juiz (validador)** reprova qualquer saída fora do contrato.

## Como funciona (contrato zero-número-errado)

```
entrada JSON ──▶ zod (schema)
             ──▶ calcRoi()  ← TODOS os R$ nascem aqui, em código testado
             ──▶ system prompt (com ENTRADA_JSON injetada)
             ──▶ loop: LLM gera ──▶ validar() (o juiz) ──▶ corrige (máx 3x)
             ──▶ resposta: markdown + tabela de variáveis (montada 100% em código)
```

- **Números**: só existem os que `lib/roi.ts` calcula/formata (`*_fmt`) + preços fixos dos tiers. O juiz (`lib/validators.ts`) reprova qualquer `R$` sem procedência.
- **Estrutura/limites/vocabulário/cidade**: checados por regex a cada tentativa.
- **Degradação determinística**: se reprovar 3x, retorna `status:"revisar"` — mas a **tabela de variáveis vem correta de qualquer jeito** (gerada fora do modelo).

## Rodando local

```bash
npm install
cp .env.example .env.local   # preencha LLM_API_KEY, LLM_MODEL e API_SECRET
npm run dev                  # http://localhost:3000  (UI com formulário)
```

Verificação:

```bash
npm run typecheck   # tsc --noEmit
npm test            # golden tests do ROI + testes do juiz
```

### Variáveis de ambiente (`.env.local`)

| Var | Descrição |
|-----|-----------|
| `LLM_API_KEY` | chave da Groq (`gsk_...`) |
| `LLM_MODEL` | default `llama-3.3-70b-versatile` |
| `API_SECRET` | senha do header `x-api-secret` (protege a rota) |

## API

`POST /api/gerar` (header `x-api-secret: <API_SECRET>`)

```bash
curl -X POST http://localhost:3000/api/gerar \
  -H "content-type: application/json" \
  -H "x-api-secret: sua-senha" \
  -d '{"nicho":"clínica odontológica","cidade":"Curitiba","ticket_medio":3500,"leads_por_mes":80,"taxa_perda_atual":0.52,"caso":"simulacao"}'
```

`GET /api/health` → `{ ok, versao, timestamp }`

## Deploy (Vercel)

1. Suba o repositório (privado) no GitHub.
2. Vercel → Add New → Project → importe o repo (framework Next.js detectado).
3. Settings → Environment Variables: `LLM_API_KEY`, `LLM_MODEL`, `API_SECRET`.
4. Branch protection exigindo o check `CI` verde — o cálculo do ROI fica travado por teste.

## O que mudou na v5.5 (refino a partir da v5.4)

1. **Prompt alinhado ao juiz** — títulos de saída agora batem com os acentos que o validador exige (`Variáveis usadas`, `Prospecção`, `Objeções`…). Antes o prompt mandava ASCII (`PROSPECCAO`) e o regex nunca casava → reprovava sempre.
2. **BLOCO 11 (checklist final)** no prompt, espelhando o validador — o modelo se auto-valida e passa de primeira (menos retries, menos custo/latência).
3. **Bug do NBSP corrigido** — `Intl.NumberFormat` usa espaço não-quebrável; os `_fmt` não casavam com o `permitidos`, marcando todo número do ROI como "sem procedência". Normalizado em `lib/roi.ts`.
4. **Modelo Groq atualizado** — `llama-3.1-70b-versatile` foi desativado pela Groq; default agora é `llama-3.3-70b-versatile`.
5. **Build/CI de verdade** — versões de `react`/`react-dom` alinhadas (resolvia conflito de peer dep), `package-lock.json` gerado (`npm ci`), jest configurado para CommonJS (os testes rodam de fato). **14/14 testes verdes.**
6. **UI** — formulário em `app/page.tsx` para gerar e copiar os entregáveis pelo navegador.
