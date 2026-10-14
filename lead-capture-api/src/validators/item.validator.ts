import { z } from "zod";

export const createItemSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }).max(255),
  description: z.string().optional(),
  completed: z.boolean().default(false),
});

export const updateItemSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
});

export const itemQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(parseInt(val, 10), 100) : 10)),
  search: z.string().optional(),
  completed: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => (val !== undefined ? val === "true" : undefined)),
  sortBy: z.enum(["created_at", "title", "updated_at"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const itemIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid UUID format for item ID" }),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ItemQueryInput = z.infer<typeof itemQuerySchema>;
