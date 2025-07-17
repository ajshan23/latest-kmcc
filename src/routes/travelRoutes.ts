import { Router } from "express";
import {
  addTravel,
  getAllTravels,
  updateTravel,
  deleteTravel,
  getUpcomingTravels,
} from "../controllers/TravelController";
import { authenticateUser } from "../middlewares/authMiddleware";

const router = Router();

router.post("/", authenticateUser, addTravel);
router.get("/", getAllTravels);
router.get("/upcoming", authenticateUser, getUpcomingTravels); // Add this new route
router.put("/:id", authenticateUser, updateTravel);
router.delete("/:id", authenticateUser, deleteTravel); // ✅ Secure delete route

export default router;

