import { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service.js";

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const stats = await dashboardService.getStats(userId, req.token);

  res.status(200).json({
    success: true,
    data: stats,
  });
};
