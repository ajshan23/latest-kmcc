import { Request, Response } from "express";
import { prismaClient } from "../config/db";
import { AuthRequest } from "../middlewares/authMiddleware";
import { ApiError, ApiResponse } from "../utils/apiHandlerHelpers";
import { asyncHandler } from "../utils/asyncHandler";

// ✅ Add an airport (Admin Only)
export const addAirport = asyncHandler(async (req: AuthRequest, res: Response) => {
    // if (!req.user?.isAdmin) {
    //     throw new ApiError(403, "Forbidden: Admin access required");
    // }

    const { name, code, country } = req.body;

    if (!name || !code || !country) {
        throw new ApiError(400, "All fields (name, code, country) are required");
    }

    const airport = await prismaClient.airport.create({
        data: { name, iataCode: code, country },
    });

    res.status(201).json(new ApiResponse(201, airport, "Airport added successfully"));
});

// ✅ Get all airports (Public)
export const getAllAirports = asyncHandler(async (req: Request, res: Response) => {
    const airports = await prismaClient.airport.findMany();
    res.status(200).json(new ApiResponse(200, airports, "Airports fetched successfully"));
});

// ✅ Get airport by ID (Public)
export const getAirportById = asyncHandler(async (req: Request, res: Response) => {
    const airport = await prismaClient.airport.findUnique({
        where: { id: Number(req.params.id) },
    });

    if (!airport) {
        throw new ApiError(404, "Airport not found");
    }

    res.status(200).json(new ApiResponse(200, airport, "Airport fetched successfully"));
});

// ✅ Update an airport (Admin Only)
export const updateAirport = asyncHandler(async (req: AuthRequest, res: Response) => {
    // if (!req.user?.isAdmin) {
    //     throw new ApiError(403, "Forbidden: Admin access required");
    // }

    const { name, code, country } = req.body;
    const airportId = Number(req.params.id);

    const existingAirport = await prismaClient.airport.findUnique({
        where: { id: airportId },
    });

    if (!existingAirport) {
        throw new ApiError(404, "Airport not found");
    }

    const updatedAirport = await prismaClient.airport.update({
        where: { id: airportId },
        data: { name, iataCode: code, country },
    });

    res.status(200).json(new ApiResponse(200, updatedAirport, "Airport updated successfully"));
});

// ✅ Delete an airport (Admin Only)
export const deleteAirport = asyncHandler(async (req: AuthRequest, res: Response) => {
    // if (!req.user?.isAdmin) {
    //     throw new ApiError(403, "Forbidden: Admin access required");
    // }

    const airportId = Number(req.params.id);

    const existingAirport = await prismaClient.airport.findUnique({
        where: { id: airportId },
    });

    if (!existingAirport) {
        throw new ApiError(404, "Airport not found");
    }

    await prismaClient.airport.delete({
        where: { id: airportId },
    });

    res.status(200).json(new ApiResponse(200, {}, "Airport deleted successfully"));
});
