import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse, ApiError } from "../utils/apiHandlerHelpers";
import { prismaClient } from "../config/db";

// Add Profit (total profit earned)
export const addProfit = asyncHandler(async (req: Request, res: Response) => {
  const investmentId = parseInt(req.params.id);
  const { amount, notes } = req.body;

  if (isNaN(investmentId)) {
    throw new ApiError(400, "Invalid investment ID");
  }

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Valid profit amount is required");
  }

  try {
    const updatedInvestment = await prismaClient.longTermInvestment.update({
      where: { id: investmentId },
      data: {
        totalProfit: { increment: parseFloat(amount) },
        profitPending: { increment: parseFloat(amount) },
      },
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, updatedInvestment, "Profit added successfully")
      );
  } catch (error) {
    console.error("Error adding profit:", error);
    throw new ApiError(500, "Failed to add profit");
  }
});

// Add Profit Payout (amount given to user)
export const addProfitPayout = asyncHandler(
  async (req: Request, res: Response) => {
    const investmentId = parseInt(req.params.id);
    const { amount, notes, payoutDate } = req.body;

    if (isNaN(investmentId)) {
      throw new ApiError(400, "Invalid investment ID");
    }

    if (!amount || amount <= 0) {
      throw new ApiError(400, "Valid payout amount is required");
    }

    try {
      // Check if enough pending profit exists
      const investment = await prismaClient.longTermInvestment.findUnique({
        where: { id: investmentId },
      });

      if (!investment) {
        throw new ApiError(404, "Investment not found");
      }

      if (investment.profitPending < parseFloat(amount)) {
        throw new ApiError(400, "Not enough pending profit to distribute");
      }

      const [payout, updatedInvestment] = await prismaClient.$transaction([
        prismaClient.profitPayout.create({
          data: {
            investmentId,
            amount: parseFloat(amount),
            notes,
            payoutDate: payoutDate ? new Date(payoutDate) : new Date(),
          },
        }),
        prismaClient.longTermInvestment.update({
          where: { id: investmentId },
          data: {
            profitDistributed: { increment: parseFloat(amount) },
            profitPending: { decrement: parseFloat(amount) },
          },
        }),
      ]);

      res
        .status(201)
        .json(
          new ApiResponse(201, payout, "Profit payout recorded successfully")
        );
    } catch (error) {
      console.error("Error recording profit payout:", error);
      throw new ApiError(500, "Failed to record profit payout");
    }
  }
);

// Get All Profit Payouts for Investment
export const getInvestmentProfitPayouts = asyncHandler(
  async (req: Request, res: Response) => {
    const investmentId = parseInt(req.params.id);

    if (isNaN(investmentId)) {
      throw new ApiError(400, "Invalid investment ID");
    }

    try {
      const payouts = await prismaClient.profitPayout.findMany({
        where: { investmentId },
        orderBy: { payoutDate: "desc" },
      });

      res
        .status(200)
        .json(
          new ApiResponse(200, payouts, "Profit payouts retrieved successfully")
        );
    } catch (error) {
      console.error("Error fetching profit payouts:", error);
      throw new ApiError(500, "Failed to fetch profit payouts");
    }
  }
);

// Get Profit Summary
export const getProfitSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const investmentId = parseInt(req.params.id);

    if (isNaN(investmentId)) {
      throw new ApiError(400, "Invalid investment ID");
    }

    try {
      const investment = await prismaClient.longTermInvestment.findUnique({
        where: { id: investmentId },
        select: {
          totalProfit: true,
          profitDistributed: true,
          profitPending: true,
        },
      });

      if (!investment) {
        throw new ApiError(404, "Investment not found");
      }

      res
        .status(200)
        .json(new ApiResponse(200, investment, "Profit summary retrieved"));
    } catch (error) {
      console.error("Error fetching profit summary:", error);
      throw new ApiError(500, "Failed to fetch profit summary");
    }
  }
);
