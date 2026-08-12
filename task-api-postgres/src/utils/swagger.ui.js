import fs from "fs";
import swaggerUi from "swagger-ui-express";

/**
 * Attaches Swagger API documentation to the Express application globally.
 * @param {import("express").Application} app - The Express application instance.
 */
export default function setupSwagger(app) {
  try {
    const swaggerDocument = JSON.parse(
      fs.readFileSync(new URL("../../openapi.json", import.meta.url)),
    );

    app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log("📘 Swagger UI loaded globally at /docs");
  } catch (error) {
    console.error("⚠️ Failed to load Swagger UI:", error.message);
  }
}
