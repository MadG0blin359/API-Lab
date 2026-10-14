import { Request, Response } from "express";
import { itemService } from "../services/item.service.js";

export const getItems = async (req: Request, res: Response): Promise<void> => {
  const result = await itemService.getAll(req.query as any, req.token);
  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
};

export const getItemById = async (req: Request, res: Response): Promise<void> => {
  const item = await itemService.getById(req.params.id as string, req.token);
  res.status(200).json({
    success: true,
    data: item,
  });
};

export const createItem = async (req: Request, res: Response): Promise<void> => {
  const item = await itemService.create(req.body, req.user?.id, req.token);
  res.status(201).json({
    success: true,
    message: "Item created successfully",
    data: item,
  });
};

export const updateItem = async (req: Request, res: Response): Promise<void> => {
  const item = await itemService.update(
    req.params.id as string,
    req.body,
    req.token
  );
  res.status(200).json({
    success: true,
    message: "Item updated successfully",
    data: item,
  });
};

export const deleteItem = async (req: Request, res: Response): Promise<void> => {
  await itemService.delete(req.params.id as string, req.token);
  res.status(200).json({
    success: true,
    message: "Item deleted successfully",
  });
};
