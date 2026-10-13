import { z } from "zod";
import AppError from "../utils/app.error.js";

const priorityEnum = z.enum(["low", "medium", "high", "urgent"], {
  errorMap: () => ({ message: "Priority must be 'low', 'medium', 'high', or 'urgent'." }),
});

export const createTaskSchema = z.object({
  title: z
    .string({ required_error: "Title is required." })
    .trim()
    .min(1, "Title cannot be empty.")
    .max(255, "Title must be at most 255 characters."),
  description: z.string().trim().nullable().optional(),
  priority: priorityEnum.optional().default("medium"),
  due_date: z
    .string()
    .datetime({ message: "due_date must be a valid ISO 8601 timestamp (e.g. 2026-12-31T23:59:59Z)." })
    .nullable()
    .optional(),
  dueDate: z
    .string()
    .datetime({ message: "dueDate must be a valid ISO 8601 timestamp." })
    .nullable()
    .optional(),
  tags: z
    .array(z.string().trim().min(1).max(50))
    .max(20, "Maximum of 20 tags allowed per task.")
    .optional()
    .default([]),
});

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty.")
      .max(255, "Title must be at most 255 characters.")
      .optional(),
    description: z.string().trim().nullable().optional(),
    is_complete: z.boolean().optional(),
    isComplete: z.boolean().optional(),
    priority: priorityEnum.optional(),
    due_date: z
      .string()
      .datetime({ message: "due_date must be a valid ISO 8601 timestamp." })
      .nullable()
      .optional(),
    dueDate: z
      .string()
      .datetime({ message: "dueDate must be a valid ISO 8601 timestamp." })
      .nullable()
      .optional(),
    tags: z
      .array(z.string().trim().min(1).max(50))
      .max(20, "Maximum of 20 tags allowed.")
      .optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.is_complete !== undefined ||
      data.isComplete !== undefined ||
      data.priority !== undefined ||
      data.due_date !== undefined ||
      data.dueDate !== undefined ||
      data.tags !== undefined,
    {
      message:
        "Please provide at least one field to update (title, description, isComplete, priority, dueDate, or tags).",
    },
  );

export const taskQuerySchema = z.object({
  search: z.string().trim().optional(),
  is_complete: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  isComplete: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  priority: priorityEnum.optional(),
  tag: z.string().trim().optional(),
  status: z.enum(["all", "completed", "pending", "overdue"]).optional(),
  sortBy: z
    .enum(["created_at", "updated_at", "due_date", "priority", "title"])
    .optional()
    .default("updated_at"),
  sortOrder: z
    .enum(["asc", "desc", "ASC", "DESC"])
    .transform((val) => val.toLowerCase())
    .optional()
    .default("desc"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  includeDeleted: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional()
    .default("false"),
});

export const bulkTaskSchema = z
  .object({
    taskIds: z
      .array(z.coerce.number().int().positive())
      .min(1, "Please provide an array with at least one task ID."),
    action: z.enum(
      ["complete", "incomplete", "delete", "permanent_delete", "restore", "set_priority"],
      {
        errorMap: () => ({
          message:
            "Action must be one of: 'complete', 'incomplete', 'delete', 'permanent_delete', 'restore', 'set_priority'.",
        }),
      },
    ),
    priority: priorityEnum.optional(),
  })
  .refine(
    (data) => data.action !== "set_priority" || !!data.priority,
    {
      message: "Priority is required when action is 'set_priority'.",
      path: ["priority"],
    },
  );

export const validateRequest = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const messages = issues.map((e) => e.message).join("; ") || "Validation error";
      return next(new AppError(400, messages));
    }
    req[`validated${source.charAt(0).toUpperCase() + source.slice(1)}`] =
      result.data;
    next();
  };
};
