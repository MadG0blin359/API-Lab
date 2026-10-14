import { Request, Response } from "express";
import { widgetService } from "../services/widget.service.js";

export const getWidgets = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const result = await widgetService.getAll(userId, req.query as any, req.token);
  res.status(200).json({
    success: true,
    data: result.widgets,
    pagination: result.pagination,
  });
};

export const getWidgetById = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const widget = await widgetService.getById(req.params.id as string, userId, req.token);
  res.status(200).json({
    success: true,
    data: widget,
  });
};

export const createWidget = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const widget = await widgetService.create(userId, req.body, req.token);
  const snippetData = widgetService.generateSnippet(widget.id, baseUrl);

  res.status(201).json({
    success: true,
    message: "Widget created successfully",
    data: {
      ...widget,
      embedSnippet: snippetData.snippet,
      scriptUrl: snippetData.scriptUrl,
    },
  });
};

export const updateWidget = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const widget = await widgetService.update(
    req.params.id as string,
    userId,
    req.body,
    req.token
  );
  res.status(200).json({
    success: true,
    message: "Widget updated successfully",
    data: widget,
  });
};

export const deleteWidget = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  await widgetService.delete(req.params.id as string, userId, req.token);
  res.status(200).json({
    success: true,
    message: "Widget deleted successfully",
  });
};

export const getWidgetSnippet = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const widget = await widgetService.getById(req.params.id as string, userId, req.token);
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const snippetData = widgetService.generateSnippet(widget.id, baseUrl);

  res.status(200).json({
    success: true,
    data: {
      widgetId: widget.id,
      snippet: snippetData.snippet,
      scriptUrl: snippetData.scriptUrl,
    },
  });
};

/**
 * Public Config Endpoint: Served with HTTP Caching headers and CORS.
 * Teaches: HTTP caching + small payloads (Section 4 & Section 6 of Brief).
 */
export const getPublicWidgetConfig = async (req: Request, res: Response): Promise<void> => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const config = await widgetService.getPublicConfig(req.params.id as string, baseUrl);

  // Set HTTP Cache-Control: short-lived cache (60 seconds) with revalidation
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=30");
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.status(200).json({
    success: true,
    data: config,
  });
};
