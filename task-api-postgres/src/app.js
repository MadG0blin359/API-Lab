import express, { json } from "express";

import taskRouter from "./routes/task.routes.js";
import metaRouter from "./routes/meta.routes.js";
import globalErrorHandler from "./middlewares/error.handler.js";

import setupSwagger from "./config/swagger.js";

function createApp() {
  const app = express();
  app.use(express.json());

  setupSwagger(app);

  app.use("/", metaRouter);
  app.use("/tasks", taskRouter);

  app.all(/.*/, (req, res) =>
    res.status(404).json({
      status: "fail",
      message: `Can't find ${req.originalUrl} on this server.`,
    }),
  );

  app.use(globalErrorHandler);

  return app;
}

export default createApp;
