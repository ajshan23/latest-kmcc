import express from "express";
import { authenticateUser } from "../middlewares/authMiddleware";
import {
    addAirport,
    getAllAirports,
    getAirportById,
    updateAirport,
    deleteAirport
} from "../controllers/AirportController";

const router = express.Router();

// Public routes
router.get("/", getAllAirports);
router.get("/:id", getAirportById);

// Protected routes (Only Admins)
router.post("/",  addAirport);
router.put("/:id",  updateAirport);
router.delete("/:id",deleteAirport);

export default router;
