import { z } from "zod";
import type { AgenteMeta } from "./core";
import * as ads from "./ceoAds";
import * as whatsapp from "./ceoWhatsapp";
import * as comercial from "./ceoComercial";
import * as local from "./ceoLocal";

export interface AgenteRegistrado {
  meta: AgenteMeta;
  inputSchema: z.ZodTypeAny;
  executar: (input: any) => Promise<unknown>;
}

export const AGENTES: Record<string, AgenteRegistrado> = {
  [ads.meta.id]: { meta: ads.meta, inputSchema: ads.InputSchema, executar: (i) => ads.executar(i) },
  [whatsapp.meta.id]: { meta: whatsapp.meta, inputSchema: whatsapp.InputSchema, executar: (i) => whatsapp.executar(i) },
  [comercial.meta.id]: { meta: comercial.meta, inputSchema: comercial.InputSchema, executar: (i) => comercial.executar(i) },
  [local.meta.id]: { meta: local.meta, inputSchema: local.InputSchema, executar: (i) => local.executar(i) },
};

export function getAgente(id: string): AgenteRegistrado | undefined {
  return AGENTES[id];
}

export function listarMetas(): AgenteMeta[] {
  return Object.values(AGENTES).map((a) => a.meta);
}
