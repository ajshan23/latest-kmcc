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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = void 0;
const db_1 = require("../config/db");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token) {
        return next(new apiHandlerHelpers_1.ApiError(401, "Unauthorized: No token provided"));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, "aju");
        const user = yield db_1.prismaClient.user.findUnique({
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
            return next(new apiHandlerHelpers_1.ApiError(401, "Unauthorized: User not found"));
        }
        req.user = {
            userId: user.id,
            name: user.name,
            email: user.email, // Allow null
            isAdmin: user.isAdmin || user.isSuperAdmin,
        };
        next();
    }
    catch (error) {
        return next(new apiHandlerHelpers_1.ApiError(401, "Unauthorized: Invalid token"));
    }
});
exports.authenticateUser = authenticateUser;
