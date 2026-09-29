import fs from "fs";
import swaggerUi from "swagger-ui-express";
import { Application } from "express";

/**
 * Attaches Swagger API documentation to the Express application globally.
 * @param {import("express").Application} app - The Express application instance.
 */
export default function setupSwagger(app: Application) {
  try {
    const swaggerDocument = JSON.parse(
      fs.readFileSync(new URL("../../openapi.json", import.meta.url), "utf-8"),
    );

    app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log("📘 Swagger UI loaded globally at /docs");
  } catch (error) {
    if (error instanceof Error) {
      console.error("⚠️ Failed to load Swagger UI:", error.message);
    } else {
      console.error("⚠️ Failed to load Swagger UI:", error);
    }
  }
}
