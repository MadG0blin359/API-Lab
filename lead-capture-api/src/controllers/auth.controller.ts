import { Request, Response } from "express";
import { authService } from "../services/auth.service.js";

export const signUp = async (req: Request, res: Response): Promise<void> => {
  const data = await authService.signUp(req.body);
  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user: data.user,
      token: data.token,
    },
  });
};

export const signIn = async (req: Request, res: Response): Promise<void> => {
  const data = await authService.signIn(req.body);
  res.status(200).json({
    success: true,
    message: "Authentication successful",
    data: {
      user: data.user,
      session: (data as any).session,
      token: data.token,
    },
  });
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
};

export const signOut = async (req: Request, res: Response): Promise<void> => {
  if (req.token) {
    await authService.signOut(req.token);
  }
  res.status(200).json({
    success: true,
    message: "Signed out successfully",
  });
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  await authService.resetPassword(req.body.email);
  res.status(200).json({
    success: true,
    message: "Password reset email sent if account exists",
  });
};
