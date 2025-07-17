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
exports.deleteCommitteeMember = exports.deleteCommittee = exports.updateCommitteeMember = exports.updateCommittee = exports.getCommitteeDetails = exports.getCommitteeMember = exports.getCommitteeMembers = exports.getAllCommittees = exports.addCommitteeMember = exports.createCommittee = void 0;
const sharp_1 = __importDefault(require("sharp"));
const asyncHandler_1 = require("../utils/asyncHandler");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const db_1 = require("../config/db");
// Helper function to convert image buffer to data URL
const bufferToImageDataUrl = (buffer) => {
    if (!buffer)
        return null;
    try {
        const base64String = buffer instanceof Buffer
            ? buffer.toString("base64")
            : Buffer.from(buffer).toString("base64");
        return `data:image/jpeg;base64,${base64String}`;
    }
    catch (error) {
        console.error("Failed to convert image buffer to data URL:", error);
        return null;
    }
};
// Create a new constitution committee
exports.createCommittee = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, description } = req.body;
    if (!title) {
        throw new apiHandlerHelpers_1.ApiError(400, "Committee title is required.");
    }
    const committee = yield db_1.prismaClient.constitutionCommittee.create({
        data: {
            title,
            description,
        },
    });
    res
        .status(201)
        .json(new apiHandlerHelpers_1.ApiResponse(201, committee, "Committee created successfully."));
}));
// Add a member to a constitution committee
exports.addCommitteeMember = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, position } = req.body;
    const committeeId = Number(req.params.committeeId);
    if (!name || !position || isNaN(committeeId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Name, position, and valid committee ID are required.");
    }
    let imageBuffer = null;
    if (req.file) {
        imageBuffer = yield (0, sharp_1.default)(req.file.buffer)
            .resize(163, 231) // Standard size for consistency
            .jpeg({ quality: 80 })
            .toBuffer();
    }
    const member = yield db_1.prismaClient.constitutionCommitteeMember.create({
        data: {
            name,
            position,
            image: imageBuffer,
            committeeId,
        },
    });
    res
        .status(201)
        .json(new apiHandlerHelpers_1.ApiResponse(201, member, "Member added successfully."));
}));
// Get all constitution committees with member counts
exports.getAllCommittees = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const committees = yield db_1.prismaClient.constitutionCommittee.findMany({
        select: {
            id: true,
            title: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            _count: {
                select: { members: true },
            },
        },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, committees, "Committees retrieved successfully."));
}));
// Get members of a specific committee
exports.getCommitteeMembers = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const committeeId = Number(req.params.committeeId);
    if (isNaN(committeeId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid committee ID.");
    const members = yield db_1.prismaClient.constitutionCommitteeMember.findMany({
        where: { committeeId },
        orderBy: { position: "asc" },
    });
    const formattedMembers = members.map((member) => ({
        id: member.id,
        name: member.name,
        position: member.position,
        committeeId: member.committeeId,
        image: bufferToImageDataUrl(member.image),
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
    }));
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, formattedMembers, "Committee members retrieved successfully."));
}));
// Get single committee member
exports.getCommitteeMember = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const memberId = Number(req.params.memberId);
    if (isNaN(memberId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid member ID.");
    const member = yield db_1.prismaClient.constitutionCommitteeMember.findUnique({
        where: { id: memberId },
    });
    if (!member) {
        throw new apiHandlerHelpers_1.ApiError(404, "Member not found.");
    }
    res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, Object.assign(Object.assign({}, member), { image: bufferToImageDataUrl(member.image) }), "Member retrieved successfully."));
}));
// Get full details of a committee including members
exports.getCommitteeDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const committeeId = Number(req.params.committeeId);
    if (isNaN(committeeId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid committee ID.");
    const committee = yield db_1.prismaClient.constitutionCommittee.findUnique({
        where: { id: committeeId },
        include: {
            members: {
                orderBy: { position: "asc" },
            },
        },
    });
    if (!committee) {
        throw new apiHandlerHelpers_1.ApiError(404, "Committee not found.");
    }
    const formattedCommittee = Object.assign(Object.assign({}, committee), { members: committee.members.map((member) => (Object.assign(Object.assign({}, member), { image: bufferToImageDataUrl(member.image) }))) });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, formattedCommittee, "Committee details retrieved successfully."));
}));
// Update committee information
exports.updateCommittee = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const committeeId = Number(req.params.committeeId);
    const { title, description } = req.body;
    if (isNaN(committeeId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid committee ID.");
    }
    const updatedCommittee = yield db_1.prismaClient.constitutionCommittee.update({
        where: { id: committeeId },
        data: {
            title,
            description,
        },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, updatedCommittee, "Committee updated successfully."));
}));
// Update committee member
exports.updateCommitteeMember = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const memberId = Number(req.params.memberId);
    const { name, position } = req.body;
    if (isNaN(memberId) || !name || !position) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid member ID or missing required fields.");
    }
    let imageBuffer = null;
    if (req.file) {
        imageBuffer = yield (0, sharp_1.default)(req.file.buffer)
            .resize(163, 231)
            .jpeg({ quality: 80 })
            .toBuffer();
    }
    const updateData = {
        name,
        position,
    };
    if (imageBuffer) {
        updateData.image = imageBuffer;
    }
    const updatedMember = yield db_1.prismaClient.constitutionCommitteeMember.update({
        where: { id: memberId },
        data: updateData,
    });
    res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, Object.assign(Object.assign({}, updatedMember), { image: bufferToImageDataUrl(updatedMember.image) }), "Member updated successfully."));
}));
// Delete a committee (will cascade delete members)
exports.deleteCommittee = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const committeeId = Number(req.params.committeeId);
    if (isNaN(committeeId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid committee ID.");
    yield db_1.prismaClient.constitutionCommittee.delete({
        where: { id: committeeId },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, {}, "Committee deleted successfully."));
}));
// Delete a committee member
exports.deleteCommitteeMember = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const memberId = Number(req.params.memberId);
    if (isNaN(memberId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid member ID.");
    yield db_1.prismaClient.constitutionCommitteeMember.delete({
        where: { id: memberId },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, {}, "Member deleted successfully."));
}));
