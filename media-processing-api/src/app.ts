import express from "express";
import compression from "compression";
import cors from "cors";

import globalErrorHandler from "./middlewares/error.handler.js";

import type { Express, Request, Response } from "express";

function createApp() {
  const app: Express = express();
  app.use(express.json());

  app.use(compression());

  app.use(cors());

  app.all(
    /.*/,
    (
      req: Request,
      res: Response<{ status: string; message: string }>,
    ): void => {
      res.status(404).json({
        status: "fail",
        message: `${req.originalUrl} Does Not Exist.`,
      });
    },
  );

  app.use(globalErrorHandler);
  return app;
}

export default createApp;
