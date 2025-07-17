"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const serviceController_1 = require("../controllers/serviceController");
const router = express_1.default.Router();
// Service routes
router.post("/new", serviceController_1.uploadMiddleware, serviceController_1.createService);
router.get("/", serviceController_1.getAllServices);
router.get("/:id", serviceController_1.getServiceById);
router.put("/:id", serviceController_1.uploadMiddleware, serviceController_1.updateService); // Combined update endpoint
router.delete("/:id", serviceController_1.deleteService);
exports.default = router;
