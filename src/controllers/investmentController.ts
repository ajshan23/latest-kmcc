import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse, ApiError } from "../utils/apiHandlerHelpers";
import { prismaClient } from "../config/db";

// Create Investment
// Create Investment - Updated to check for existing active investment
export const createInvestment = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, initialDeposit, notes } = req.body;

    if (!userId) {
      throw new ApiError(400, "User ID is required");
    }

    const userIdNumber = parseInt(userId);
    if (isNaN(userIdNumber)) {
      throw new ApiError(400, "Invalid user ID format");
    }

    try {
      // Check for existing active investment
      const existingActive = await prismaClient.longTermInvestment.findFirst({
        where: {
          userId: userIdNumber,
          isActive: true,
        },
      });

      if (existingActive) {
        throw new ApiError(400, "User already has an active investment");
      }

      const investment = await prismaClient.longTermInvestment.create({
        data: {
          userId: userIdNumber,
          totalDeposited: initialDeposit ? parseFloat(initialDeposit) : 0,
          deposits: initialDeposit
            ? {
                create: [
                  {
                    amount: parseFloat(initialDeposit),
                    notes: notes || null, // Include notes in the deposit record
                  },
                ],
              }
            : undefined,
        },
        include: {
          user: true,
          deposits: true,
        },
      });

      res
        .status(201)
        .json(
          new ApiResponse(201, investment, "Investment created successfully")
        );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Error creating investment:", error);
      throw new ApiError(500, "Failed to create investment");
    }
  }
);

// Get All Investments for User
export const getUserInvestments = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      throw new ApiError(400, "Invalid user ID");
    }

    try {
      const investments = await prismaClient.longTermInvestment.findMany({
        where: { userId },
        include: {
          deposits: { orderBy: { depositDate: "desc" } },
          profitPayouts: { orderBy: { payoutDate: "desc" } },
          user: true,
        },
        orderBy: { startDate: "desc" },
      });

      res
        .status(200)
        .json(new ApiResponse(200, investments, "Investments retrieved"));
    } catch (error) {
      console.error("Error fetching investments:", error);
      throw new ApiError(500, "Failed to fetch investments");
    }
  }
);
export const checkActiveInvestment = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate userId parameter
    if (!req.query.userId) {
      throw new ApiError(400, "User ID query parameter is required");
    }

    const userId = parseInt(req.query.userId as string);

    if (isNaN(userId) || userId <= 0) {
      throw new ApiError(400, "Invalid user ID - must be a positive number");
    }

    try {
      const activeInvestment = await prismaClient.longTermInvestment.findFirst({
        where: {
          userId,
          isActive: true,
        },
        select: {
          id: true,
          startDate: true,
          totalDeposited: true,
        },
      });

      res.status(200).json(
        new ApiResponse(
          200,
          {
            hasActiveInvestment: !!activeInvestment,
            activeInvestment: activeInvestment || null,
          },
          "Active investment check completed"
        )
      );
    } catch (error) {
      console.error("Error checking active investment:", error);
      throw new ApiError(500, "Failed to check active investment");
    }
  }
);
// Get All Investments
export const getInvestments = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const investments = await prismaClient.longTermInvestment.findMany({
        include: {
          user: true,
          deposits: { orderBy: { depositDate: "desc" }, take: 1 },
          profitPayouts: { orderBy: { payoutDate: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      });

      res
        .status(200)
        .json(new ApiResponse(200, investments, "Investments retrieved"));
    } catch (error) {
      console.error("Error fetching investments:", error);
      throw new ApiError(500, "Failed to fetch investments");
    }
  }
);

// Get Investment Details
export const getInvestmentDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const investmentId = parseInt(req.params.id);

    if (isNaN(investmentId)) {
      throw new ApiError(400, "Invalid investment ID");
    }

    try {
      const investment = await prismaClient.longTermInvestment.findUnique({
        where: { id: investmentId },
        include: {
          user: true,
          deposits: { orderBy: { depositDate: "desc" } },
          profitPayouts: { orderBy: { payoutDate: "desc" } },
        },
      });

      if (!investment) {
        throw new ApiError(404, "Investment not found");
      }

      res
        .status(200)
        .json(new ApiResponse(200, investment, "Investment details retrieved"));
    } catch (error) {
      console.error("Error fetching investment:", error);
      throw new ApiError(500, "Failed to fetch investment details");
    }
  }
);

// Close Investment
export const closeInvestment = asyncHandler(
  async (req: Request, res: Response) => {
    const investmentId = parseInt(req.params.id);

    if (isNaN(investmentId)) {
      throw new ApiError(400, "Invalid investment ID");
    }

    try {
      // Check if there's any pending profit
      const investment = await prismaClient.longTermInvestment.findUnique({
        where: { id: investmentId },
      });

      if (!investment) {
        throw new ApiError(404, "Investment not found");
      }

      if (investment.profitPending > 0) {
        throw new ApiError(400, "Cannot close investment with pending profit");
      }

      const updatedInvestment = await prismaClient.longTermInvestment.update({
        where: { id: investmentId },
        data: {
          isActive: false,
          endDate: new Date(),
        },
      });

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            updatedInvestment,
            "Investment closed successfully"
          )
        );
    } catch (error) {
      console.error("Error closing investment:", error);
      throw new ApiError(500, "Failed to close investment");
    }
  }
);

