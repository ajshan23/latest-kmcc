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
exports.deleteExclusiveMember = exports.reorderExclusiveMembers = exports.updateExclusiveMember = exports.getExclusiveMember = exports.getAllExclusiveMembers = exports.createExclusiveMember = void 0;
const sharp_1 = __importDefault(require("sharp"));
const asyncHandler_1 = require("../utils/asyncHandler");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const db_1 = require("../config/db");
// Create Exclusive Member
exports.createExclusiveMember = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, position } = req.body;
    if (!name || !position) {
        throw new apiHandlerHelpers_1.ApiError(400, "Name and position are required.");
    }
    if (!req.file) {
        throw new apiHandlerHelpers_1.ApiError(400, "Image is required.");
    }
    try {
        const imageBuffer = yield (0, sharp_1.default)(req.file.buffer)
            .resize(300, 300) // Added consistent image sizing
            .jpeg({ quality: 80 })
            .toBuffer();
        // Get current count to set position
        const memberCount = yield db_1.prismaClient.exclusiveMember.count();
        const newPriority = memberCount;
        const member = yield db_1.prismaClient.exclusiveMember.create({
            data: {
                name,
                position,
                image: imageBuffer,
                priority: newPriority,
            },
        });
        res
            .status(201)
            .json(new apiHandlerHelpers_1.ApiResponse(201, member, "Member created successfully"));
    }
    catch (error) {
        console.error("Error creating member:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to create member");
    }
}));
// Get All Members (Ordered by priority)
exports.getAllExclusiveMembers = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const members = yield db_1.prismaClient.exclusiveMember.findMany({
            orderBy: { priority: "asc" },
            select: {
                id: true,
                name: true,
                position: true,
                image: true,
                priority: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        const formattedMembers = members.map((member) => (Object.assign(Object.assign({}, member), { image: member.image
                ? `data:image/jpeg;base64,${Buffer.from(member.image).toString("base64")}`
                : null })));
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, { members: formattedMembers }, "Members retrieved"));
    }
    catch (error) {
        console.error("Error fetching members:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to fetch members");
    }
}));
// Get Single Member
exports.getExclusiveMember = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const memberId = parseInt(req.params.id);
    if (isNaN(memberId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid member ID");
    }
    try {
        const member = yield db_1.prismaClient.exclusiveMember.findUnique({
            where: { id: memberId },
            select: {
                id: true,
                name: true,
                position: true,
                image: true,
                priority: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!member) {
            throw new apiHandlerHelpers_1.ApiError(404, "Member not found");
        }
        const formattedMember = Object.assign(Object.assign({}, member), { image: member.image
                ? `data:image/jpeg;base64,${Buffer.from(member.image).toString("base64")}`
                : null });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, formattedMember, "Member retrieved successfully"));
    }
    catch (error) {
        console.error("Error fetching member:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to fetch member");
    }
}));
// Update Member
exports.updateExclusiveMember = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const memberId = parseInt(req.params.id);
    const { name, position } = req.body;
    if (isNaN(memberId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid member ID");
    }
    try {
        const updateData = {
            name,
            position,
        };
        if (req.file) {
            const imageBuffer = yield (0, sharp_1.default)(req.file.buffer)
                .resize(300, 300) // Added consistent image sizing
                .jpeg({ quality: 80 })
                .toBuffer();
            updateData.image = imageBuffer;
        }
        const updatedMember = yield db_1.prismaClient.exclusiveMember.update({
            where: { id: memberId },
            data: updateData,
        });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, updatedMember, "Member updated"));
    }
    catch (error) {
        console.error("Error updating member:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to update member");
    }
}));
// Reorder Members
exports.reorderExclusiveMembers = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { memberIds } = req.body;
    if (!memberIds || !Array.isArray(memberIds)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Member IDs array required");
    }
    // Check for duplicate IDs
    const uniqueIds = new Set(memberIds);
    if (uniqueIds.size !== memberIds.length) {
        throw new apiHandlerHelpers_1.ApiError(400, "Duplicate member IDs in request");
    }
    try {
        // Verify all members exist
        const members = yield db_1.prismaClient.exclusiveMember.findMany({
            where: { id: { in: memberIds } },
        });
        if (members.length !== memberIds.length) {
            const foundIds = members.map((m) => m.id);
            const missingIds = memberIds.filter((id) => !foundIds.includes(id));
            throw new apiHandlerHelpers_1.ApiError(400, `Some members don't exist. Missing IDs: ${missingIds.join(", ")}`);
        }
        // Update priorities in a transaction
        yield db_1.prismaClient.$transaction(memberIds.map((id, index) => db_1.prismaClient.exclusiveMember.update({
            where: { id },
            data: { priority: index },
        })));
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, {}, "Members reordered successfully"));
    }
    catch (error) {
        console.error("Error reordering members:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to reorder members");
    }
}));
// Delete Member
exports.deleteExclusiveMember = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const memberId = parseInt(req.params.id);
    if (isNaN(memberId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid member ID");
    }
    try {
        // First verify member exists
        const member = yield db_1.prismaClient.exclusiveMember.findUnique({
            where: { id: memberId },
        });
        if (!member) {
            throw new apiHandlerHelpers_1.ApiError(404, "Member not found");
        }
        // Delete the member
        yield db_1.prismaClient.exclusiveMember.delete({ where: { id: memberId } });
        // Reorder remaining members
        const remainingMembers = yield db_1.prismaClient.exclusiveMember.findMany({
            orderBy: { priority: "asc" },
        });
        yield db_1.prismaClient.$transaction(remainingMembers.map((member, index) => db_1.prismaClient.exclusiveMember.update({
            where: { id: member.id },
            data: { priority: index },
        })));
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, null, "Member deleted successfully"));
    }
    catch (error) {
        console.error("Error deleting member:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to delete member");
    }
}));
