import express, { json } from "express";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import taskRouter from "./routes/taskRoutes.js";

const app = express();
app.use(express.json());

// Serve static assets from the public folder
app.use(express.static("public"));

const swaggerDocument = JSON.parse(
  fs.readFileSync(new URL("../openapi.json", import.meta.url)),
);

// Mount Swagger UI at /api/docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    data: {
      name: "Task API",
      version: "1.0",
      endpoints: ["/tasks", "/health", "/docs"],
    },
  });
});

app.use("/tasks", taskRouter);

app.get("/health", (req, res) =>
  res.status(200).json({
    status: "success",
    message: "Server is up and running.",
  }),
);

app.all(/.*/, (req, res) =>
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server.`,
  }),
);

export default app;
