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
exports.login = exports.signup = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const asyncHandler_1 = require("../utils/asyncHandler");
const db_1 = require("../config/db");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
// Helper function to remove leading zeros
const normalizeId = (id) => parseInt(id, 10).toString();
// Helper function to create survey progress for a new user
function createSurveyProgressForUser(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const surveys = yield db_1.prismaClient.survey.findMany();
        return surveys.map((survey) => ({
            userId,
            surveyId: survey.id,
            completed: false,
            lastQuestionId: null,
        }));
    });
}
// ✅ Signup Route
exports.signup = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { memberId, iqamaNumber, phoneNumber, password } = req.body;
    // Normalize memberId (remove leading zeros)
    const normalizedMemberId = normalizeId(memberId);
    // Fetch all memberships and normalize `memberId` before checking
    const memberships = yield db_1.prismaClient.membership.findMany();
    const existingMember = memberships.find((m) => normalizeId(m.memberId) === normalizedMemberId &&
        m.iqamaNumber === iqamaNumber);
    if (!existingMember) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid memberId or iqamaNumber");
    }
    // Extract the name and areaName from Membership table
    const { name, areaName } = existingMember;
    // Create the kmccPosition dynamically
    const kmccPosition = `kmcc ${areaName} member`;
    // Check if the user is already registered
    const existingUser = yield db_1.prismaClient.user.findFirst({
        where: { OR: [{ memberId: normalizedMemberId }, { iqamaNumber }] },
    });
    if (existingUser) {
        throw new apiHandlerHelpers_1.ApiError(400, "User already registered");
    }
    // Hash the password
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    // Check if this is the first user to assign as Super Admin
    const isFirstUser = (yield db_1.prismaClient.user.count()) === 0;
    // Create the user
    const newUser = yield db_1.prismaClient.user.create({
        data: {
            memberId: normalizedMemberId,
            iqamaNumber,
            phoneNumber,
            password: hashedPassword,
            name,
            isSuperAdmin: isFirstUser, // First user is super admin
            isAdmin: false, // Admins will be set manually
            profile: {
                create: {
                    kmccPosition, // Store dynamically created kmccPosition
                },
            },
            areaName: existingMember.areaName,
        },
    });
    // Automatically create a survey progress entry for the new user
    yield db_1.prismaClient.userSurveyProgress.createMany({
        data: yield createSurveyProgressForUser(newUser.id),
    });
    res
        .status(201)
        .json(new apiHandlerHelpers_1.ApiResponse(201, newUser, "User registered successfully"));
}));
// ✅ Login Route
exports.login = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { identifier, password } = req.body;
    if (!identifier || !password) {
        throw new apiHandlerHelpers_1.ApiError(400, "Identifier and password are required");
    }
    // Normalize identifier (remove leading zeros if it's a memberId)
    const normalizedIdentifier = normalizeId(identifier);
    // Fetch all users and normalize `memberId` before checking
    const users = yield db_1.prismaClient.user.findMany();
    const user = users.find((u) => normalizeId(u.memberId) === normalizedIdentifier ||
        u.iqamaNumber === identifier);
    if (!user) {
        throw new apiHandlerHelpers_1.ApiError(401, "Invalid credentials");
    }
    const isPasswordValid = yield bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw new apiHandlerHelpers_1.ApiError(401, "Invalid credentials");
    }
    // ✅ Generate JWT Token
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, "aju", { expiresIn: "7d" });
    res.json(new apiHandlerHelpers_1.ApiResponse(200, {
        token,
        user: {
            id: user.id,
            name: user.name,
            isAdmin: user.isAdmin,
            isSuperAdmin: user.isSuperAdmin,
        },
    }, "Login successful"));
}));
// ✅ Make Admin Route (Only Super Admin Can Promote Users)
// export const makeAdmin = asyncHandler(async (req: Request, res: Response) => {
//     const { userId } = req.body;
//     const adminId = req.user.userId; // Assuming you have auth middleware that extracts user ID
//     // Check if the requester is a super admin
//     const adminUser = await prismaClient.user.findUnique({
//         where: { id: adminId }
//     });
//     if (!adminUser || !adminUser.isSuperAdmin) {
//         throw new ApiError(403, "Only super admins can promote users to admin");
//     }
//     // Update user to admin
//     const updatedUser = await prismaClient.user.update({
//         where: { id: userId },
//         data: { isAdmin: true }
//     });
//     res.json(new ApiResponse(200, updatedUser, "User promoted to admin successfully"));
// });
