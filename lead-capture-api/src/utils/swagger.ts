import { Application } from "express";
import swaggerUi from "swagger-ui-express";

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Lead-Capture & Embeddable Widget Platform API",
    version: "1.0.0",
    description:
      "Production-ready backend platform for embeddable lead-capture widgets, dynamic config delivery, abuse-protected submissions, and owner analytics.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development / Local server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Supabase Auth access token obtained from /api/auth/login",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error details and description" },
          statusCode: { type: "number", example: 400 },
        },
      },
      FormField: {
        type: "object",
        required: ["name", "label", "type"],
        properties: {
          name: { type: "string", example: "email" },
          label: { type: "string", example: "Email Address" },
          type: {
            type: "string",
            enum: ["text", "email", "number", "tel", "textarea", "select"],
            example: "email",
          },
          required: { type: "boolean", example: true },
          placeholder: { type: "string", example: "jane@company.com" },
          options: { type: "array", items: { type: "string" } },
        },
      },
      DisplaySettings: {
        type: "object",
        properties: {
          primaryColor: { type: "string", example: "#2563eb" },
          backgroundColor: { type: "string", example: "#ffffff" },
          textColor: { type: "string", example: "#1f2937" },
          borderRadius: { type: "string", example: "8px" },
          position: {
            type: "string",
            enum: ["inline", "bottom-right", "bottom-left", "center-modal"],
            example: "inline",
          },
        },
      },
      CreateWidgetRequest: {
        type: "object",
        required: ["name", "title"],
        properties: {
          name: { type: "string", example: "SaaS Sales Contact Form" },
          type: {
            type: "string",
            enum: ["form", "contact", "newsletter", "cta", "popover"],
            example: "form",
          },
          title: { type: "string", example: "Request a Demo" },
          description: {
            type: "string",
            example: "Leave your work email and our team will get in touch.",
          },
          button_text: { type: "string", example: "Submit" },
          success_message: {
            type: "string",
            example: "Thank you! We will reach out shortly.",
          },
          fields: {
            type: "array",
            items: { $ref: "#/components/schemas/FormField" },
          },
          display_settings: { $ref: "#/components/schemas/DisplaySettings" },
          notification_email: { type: "string", example: "team@company.com" },
          webhook_url: { type: "string", example: "https://webhook.site/test" },
        },
      },
      PublicSubmissionRequest: {
        type: "object",
        required: ["widget_id", "data"],
        properties: {
          widget_id: {
            type: "string",
            format: "uuid",
            example: "00000000-0000-0000-0000-000000000001",
          },
          data: {
            type: "object",
            example: {
              name: "Jane Doe",
              email: "jane@example.com",
              message: "Interested in your solution.",
            },
          },
          _hp: {
            type: "string",
            description: "Honeypot field (must be left empty by human visitors)",
            example: "",
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Liveness probe",
        responses: { 200: { description: "Service is running" } },
      },
    },
    "/ready": {
      get: {
        summary: "Readiness probe",
        description: "Checks Supabase DB connectivity",
        responses: { 200: { description: "Service and Supabase are ready" } },
      },
    },
    "/api/widgets/{id}/config": {
      get: {
        tags: ["Widget Delivery"],
        summary: "Get public widget configuration (Cached)",
        description:
          "Public endpoint accessed by the embedded JavaScript widget. Includes Cache-Control headers.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Public widget configuration" },
          404: { description: "Widget not found" },
        },
      },
    },
    "/api/submissions": {
      post: {
        tags: ["Public Submissions"],
        summary: "Submit lead via embeddable widget (Public & Abuse Protected)",
        description:
          "Accepts cross-origin submissions, validates boundary schemas, filters honeypot bots, enforces rate limits, enriches visitor IP via geo fallback chain, and dispatches safe side effects.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PublicSubmissionRequest" },
            },
          },
        },
        responses: {
          201: { description: "Submission stored and processed" },
          400: { description: "Validation error or Honeypot bot rejected" },
          429: { description: "Too many submissions (Rate limit exceeded)" },
        },
      },
      get: {
        tags: ["Submissions (Owner)"],
        summary: "List submissions owned by the authenticated tenant",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "widget_id", in: "query", schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Paginated submissions list" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/widgets": {
      get: {
        tags: ["Widgets (Owner)"],
        summary: "List all widgets for the authenticated owner",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "List of widgets" },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Widgets (Owner)"],
        summary: "Create a new embeddable widget",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateWidgetRequest" },
            },
          },
        },
        responses: {
          201: { description: "Widget created with generated embed snippet" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/widgets/{id}": {
      get: {
        tags: ["Widgets (Owner)"],
        summary: "Get widget by ID",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Widget details" },
          404: { description: "Widget not found" },
        },
      },
      delete: {
        tags: ["Widgets (Owner)"],
        summary: "Delete widget by ID",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Widget deleted" },
        },
      },
    },
    "/api/widgets/{id}/snippet": {
      get: {
        tags: ["Widgets (Owner)"],
        summary: "Get one-line embed script tag for widget",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "HTML script snippet returned" },
        },
      },
    },
    "/api/dashboard/stats": {
      get: {
        tags: ["Dashboard (Owner)"],
        summary: "Get owner analytics, time series, and geo breakdown",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Aggregated analytics" },
          401: { description: "Unauthorized" },
        },
      },
    },
  },
};

export const setupSwagger = (app: Application): void => {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};

export default setupSwagger;
