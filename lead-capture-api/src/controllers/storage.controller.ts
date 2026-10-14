import { Request, Response } from "express";
import { storageService } from "../services/storage.service.js";
import { AppError } from "../utils/app-error.js";

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw new AppError(400, "No file uploaded. Key 'file' is required.");
  }

  const folder = (req.body.folder as string) || "uploads";
  const result = await storageService.uploadFile(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype,
    undefined,
    folder
  );

  res.status(201).json({
    success: true,
    message: "File uploaded successfully",
    data: result,
  });
};

export const createSignedUrl = async (req: Request, res: Response): Promise<void> => {
  const { path } = req.body;
  if (!path || typeof path !== "string") {
    throw new AppError(400, "Path string is required in request body");
  }

  const expiresIn = Number(req.body.expiresIn) || 3600;
  const signedUrl = await storageService.createSignedUrl(path, expiresIn);

  res.status(200).json({
    success: true,
    data: {
      signedUrl,
      expiresIn,
    },
  });
};

export const listFiles = async (req: Request, res: Response): Promise<void> => {
  const folder = (req.query.folder as string) || "";
  const files = await storageService.listFiles(folder);

  res.status(200).json({
    success: true,
    data: files,
  });
};

export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  const { paths } = req.body;
  if (!paths || !Array.isArray(paths) || paths.length === 0) {
    throw new AppError(400, "Array of file 'paths' is required in request body");
  }

  const result = await storageService.deleteFiles(paths);

  res.status(200).json({
    success: true,
    message: "Files deleted successfully",
    data: result,
  });
};
