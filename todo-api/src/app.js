import express, { json } from "express";
import swaggerUi from "swagger-ui-express";
import fs from "fs";

import taskRouter from "./routes/task.routes.js";
import metaRouter from "./routes/meta.routes.js";

import globalErrorHandler from "./middlewares/error.handler.js";

function createApp() {
  const app = express();
  app.use(express.json());

  const swaggerDocument = JSON.parse(
    fs.readFileSync(new URL("../openapi.json", import.meta.url)),
  );

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // Mount Swagger UI at /docs
  app.use("/", metaRouter);
  app.use("/tasks", taskRouter);

  app.all(/.*/, (req, res) =>
    res.status(404).json({
      status: "fail",
      message: `Can't find ${req.originalUrl} on this server.`,
    }),
  );

  app.use(globalErrorHandler);
}

export default createApp;
