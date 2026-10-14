import { z } from "zod";

const formFieldSchema = z.object({
  name: z.string().min(1, "Field name is required").regex(/^[a-zA-Z0-9_]+$/, "Field name must be alphanumeric"),
  label: z.string().min(1, "Field label is required"),
  type: z.enum(["text", "email", "number", "tel", "textarea", "select"]).default("text"),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
});

const displaySettingsSchema = z.object({
  primaryColor: z.string().optional().default("#2563eb"),
  backgroundColor: z.string().optional().default("#ffffff"),
  textColor: z.string().optional().default("#1f2937"),
  borderRadius: z.string().optional().default("8px"),
  position: z.enum(["inline", "bottom-right", "bottom-left", "center-modal"]).default("inline"),
});

export const createWidgetSchema = z.object({
  name: z.string().min(1, "Widget name is required").max(255),
  type: z.enum(["form", "contact", "newsletter", "cta", "popover"]).default("form"),
  title: z.string().min(1, "Widget title is required").max(255),
  description: z.string().max(1000).optional(),
  button_text: z.string().max(100).default("Submit"),
  success_message: z.string().max(255).default("Thank you! Your submission has been received."),
  fields: z.array(formFieldSchema).min(1, "Widget must have at least one field").default([
    { name: "name", label: "Full Name", type: "text", required: true, placeholder: "Jane Doe" },
    { name: "email", label: "Email Address", type: "email", required: true, placeholder: "jane@example.com" },
    { name: "message", label: "Message", type: "textarea", required: false, placeholder: "How can we help?" },
  ]),
  display_settings: displaySettingsSchema.default({
    primaryColor: "#2563eb",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    borderRadius: "8px",
    position: "inline",
  }),
  notification_email: z.string().email("Invalid notification email").optional().or(z.literal("")),
  webhook_url: z.string().url("Invalid webhook URL").optional().or(z.literal("")),
});

export const updateWidgetSchema = createWidgetSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const widgetQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
  type: z.enum(["form", "contact", "newsletter", "cta", "popover"]).optional(),
  is_active: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === "true")),
});

export type CreateWidgetInput = z.infer<typeof createWidgetSchema>;
export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>;
export type WidgetQueryInput = z.infer<typeof widgetQuerySchema>;
