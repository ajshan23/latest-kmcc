import { prismaClient } from "../config/db";
import { ApiError } from "../utils/apiHandlerHelpers";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Request type to include user
export interface AuthRequest extends Request {
  user?: {
    userId: number; // Fix type to match JWT
    name: string;
    email: string | null; // Allow null
    isAdmin: boolean;
  };
}

export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return next(new ApiError(401, "Unauthorized: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, "aju") as { userId: number };

    const user = await prismaClient.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        isSuperAdmin: true,
      },
    });

    if (!user) {
      return next(new ApiError(401, "Unauthorized: User not found"));
    }

    req.user = {
      userId: user.id,
      name: user.name,
      email: user.email, // Allow null
      isAdmin: user.isAdmin || user.isSuperAdmin,
    };

    next();
  } catch (error) {
    return next(new ApiError(401, "Unauthorized: Invalid token"));
  }
};
