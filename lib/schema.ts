import { z } from "zod";

export const EntradaSchema = z.object({
  modo: z.enum(["single_shot", "discovery"]).default("single_shot"),
  nicho: z
    .string()
    .trim()
    .min(2, "nicho obrigatorio")
    .max(120)
    .transform((s) => s.replace(/[<>{}]/g, "")), // sanitize
  cidade: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .transform((s) => s.replace(/[<>{}]/g, ""))
    .optional()
    .nullable()
    .default(null),
  ticket_medio: z.number().positive("ticket deve ser positivo").max(1_000_000),
  leads_por_mes: z.number().int().positive().max(100_000).default(75),
  taxa_perda_atual: z.number().min(0.05).max(0.95).default(0.5),
  caso: z.enum(["real", "simulacao"]).default("simulacao"),
});

export type Entrada = z.infer<typeof EntradaSchema>;
