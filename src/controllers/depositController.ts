import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse, ApiError } from "../utils/apiHandlerHelpers";
import { prismaClient } from "../config/db";

// Add Deposit
export const addDeposit = asyncHandler(async (req: Request, res: Response) => {
  const investmentId = parseInt(req.params.id);
  const { amount, notes } = req.body;

  if (isNaN(investmentId)) {
    throw new ApiError(400, "Invalid investment ID");
  }

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Valid deposit amount is required");
  }

  try {
    const [deposit, updatedInvestment] = await prismaClient.$transaction([
      prismaClient.investmentDeposit.create({
        data: {
          investmentId,
          amount: parseFloat(amount),
          notes,
        },
      }),
      prismaClient.longTermInvestment.update({
        where: { id: investmentId },
        data: {
          totalDeposited: { increment: parseFloat(amount) },
        },
      }),
    ]);

    res
      .status(201)
      .json(new ApiResponse(201, deposit, "Deposit recorded successfully"));
  } catch (error) {
    console.error("Error recording deposit:", error);
    throw new ApiError(500, "Failed to record deposit");
  }
});

// Get All Deposits for Investment
export const getInvestmentDeposits = asyncHandler(
  async (req: Request, res: Response) => {
    const investmentId = parseInt(req.params.id);

    if (isNaN(investmentId)) {
      throw new ApiError(400, "Invalid investment ID");
    }

    try {
      const deposits = await prismaClient.investmentDeposit.findMany({
        where: { investmentId },
        orderBy: { depositDate: "desc" },
      });

      res
        .status(200)
        .json(
          new ApiResponse(200, deposits, "Deposits retrieved successfully")
        );
    } catch (error) {
      console.error("Error fetching deposits:", error);
      throw new ApiError(500, "Failed to fetch deposits");
    }
  }
);
