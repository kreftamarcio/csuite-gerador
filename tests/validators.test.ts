import { validar } from "../lib/validators";

const FAKE_MD = `## Variáveis usadas\n## Prospecção\n## Landing\n## Tiers\n## Demo\n## Objeções\n## Follow-up\n`;
const permitidos = new Set(["R$ 2.997", "R$ 15.000", "R$ 27.000"]);

test("aceita output valido", () => {
  expect(validar(FAKE_MD + "custa R$ 2.997/mes", permitidos, null)).toHaveLength(0);
});

test("pega numero sem procedencia", () => {
  const v = validar(FAKE_MD + "custa R$ 8.888", permitidos, null);
  expect(v.some((x) => x.detalhe.includes("R$ 8.888"))).toBe(true);
});

test("pega vocabulario proibido", () => {
  const v = validar(FAKE_MD + "nosso chatbot responde", permitidos, null);
  expect(v.some((x) => x.detalhe.includes("chatbot"))).toBe(true);
});

test("pega placeholder orfao", () => {
  const v = validar(FAKE_MD + "{TICKET_MEDIO}", permitidos, null);
  expect(v.some((x) => x.tipo === "placeholder")).toBe(true);
});

test("pega cidade omitida", () => {
  const v = validar(FAKE_MD, permitidos, "Joinville");
  expect(v.some((x) => x.tipo === "cidade")).toBe(true);
});

test("aceita quando cidade esta presente", () => {
  const v = validar(FAKE_MD + "atuamos em Joinville", permitidos, "Joinville");
  expect(v.filter((x) => x.tipo === "cidade")).toHaveLength(0);
});
