import { z } from "zod";

/**
 * Shared validators used across client and server
 */

export const emailSchema = z.string().email("Email inválido");
export const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");
export const usernameSchema = z
  .string()
  .min(3, "Nome de usuário deve ter pelo menos 3 caracteres")
  .max(30, "Nome de usuário deve ter no máximo 30 caracteres")
  .regex(/^[a-zA-Z0-9_-]+$/, "Nome de usuário pode conter apenas letras, números, _ e -");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha é obrigatória"),
});

export const signupSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const progressUpdateSchema = z.object({
  unit: z.number().int().min(0).optional(),
  status: z.enum(["planning", "watching", "paused", "completed", "dropped", "rewatching"]).optional(),
  score: z.number().min(0).max(10).step(0.1).optional(),
  increment: z.boolean().optional(),
});

export const insightsSchema = z.object({
  content: z.string().max(50000, "Insights muito longo (máx 50k chars)"),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum([
    "movie", "tv_series", "anime",
    "manga", "manhwa", "manhua",
    "novel", "book", "game", "all"
  ]).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const importSchema = z.object({
  source: z.enum(["letterboxd", "anilist", "mal", "trakt"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;
export type InsightsInput = z.infer<typeof insightsSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type ImportInput = z.infer<typeof importSchema>;