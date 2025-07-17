"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAirport = exports.updateAirport = exports.getAirportById = exports.getAllAirports = exports.addAirport = void 0;
const db_1 = require("../config/db");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const asyncHandler_1 = require("../utils/asyncHandler");
// ✅ Add an airport (Admin Only)
exports.addAirport = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // if (!req.user?.isAdmin) {
    //     throw new ApiError(403, "Forbidden: Admin access required");
    // }
    const { name, code, country } = req.body;
    if (!name || !code || !country) {
        throw new apiHandlerHelpers_1.ApiError(400, "All fields (name, code, country) are required");
    }
    const airport = yield db_1.prismaClient.airport.create({
        data: { name, iataCode: code, country },
    });
    res.status(201).json(new apiHandlerHelpers_1.ApiResponse(201, airport, "Airport added successfully"));
}));
// ✅ Get all airports (Public)
exports.getAllAirports = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const airports = yield db_1.prismaClient.airport.findMany();
    res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, airports, "Airports fetched successfully"));
}));
// ✅ Get airport by ID (Public)
exports.getAirportById = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const airport = yield db_1.prismaClient.airport.findUnique({
        where: { id: Number(req.params.id) },
    });
    if (!airport) {
        throw new apiHandlerHelpers_1.ApiError(404, "Airport not found");
    }
    res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, airport, "Airport fetched successfully"));
}));
// ✅ Update an airport (Admin Only)
exports.updateAirport = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // if (!req.user?.isAdmin) {
    //     throw new ApiError(403, "Forbidden: Admin access required");
    // }
    const { name, code, country } = req.body;
    const airportId = Number(req.params.id);
    const existingAirport = yield db_1.prismaClient.airport.findUnique({
        where: { id: airportId },
    });
    if (!existingAirport) {
        throw new apiHandlerHelpers_1.ApiError(404, "Airport not found");
    }
    const updatedAirport = yield db_1.prismaClient.airport.update({
        where: { id: airportId },
        data: { name, iataCode: code, country },
    });
    res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, updatedAirport, "Airport updated successfully"));
}));
// ✅ Delete an airport (Admin Only)
exports.deleteAirport = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // if (!req.user?.isAdmin) {
    //     throw new ApiError(403, "Forbidden: Admin access required");
    // }
    const airportId = Number(req.params.id);
    const existingAirport = yield db_1.prismaClient.airport.findUnique({
        where: { id: airportId },
    });
    if (!existingAirport) {
        throw new apiHandlerHelpers_1.ApiError(404, "Airport not found");
    }
    yield db_1.prismaClient.airport.delete({
        where: { id: airportId },
    });
    res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, {}, "Airport deleted successfully"));
}));
