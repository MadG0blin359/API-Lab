import { z } from "zod";

export const publicSubmissionSchema = z.object({
  widget_id: z.string().uuid("Invalid widget ID format. Must be a valid UUID."),
  data: z
    .record(z.any())
    .refine((data) => Object.keys(data).length > 0, "Submission payload 'data' cannot be empty."),
  // Honeypot fields: Hidden inputs in the widget that human visitors never populate
  _hp: z.string().max(255).optional().default(""),
  website_url_hp: z.string().max(255).optional().default(""),
});

export const submissionQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  widget_id: z.string().uuid().optional(),
  search: z.string().optional(),
  is_spam: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === "true")),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});

export type PublicSubmissionInput = z.infer<typeof publicSubmissionSchema>;
export type SubmissionQueryInput = z.infer<typeof submissionQuerySchema>;
