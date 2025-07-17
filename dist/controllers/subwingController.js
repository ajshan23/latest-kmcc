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
exports.updateSubWing = exports.getSubWingDetails = exports.getSubWingMembers = exports.getAllSubWings = exports.updateSubWingMember = exports.deleteSubWingMember = exports.addSubWingMember = exports.createSubWing = void 0;
const sharp_1 = __importDefault(require("sharp"));
const asyncHandler_1 = require("../utils/asyncHandler");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const db_1 = require("../config/db");
// Helper function to convert buffer to SVG data URL
const bufferToSvgDataUrl = (buffer) => {
    if (!buffer)
        return null;
    try {
        const svgString = buffer instanceof Buffer
            ? buffer.toString("utf8")
            : new TextDecoder().decode(buffer);
        if (!svgString.includes("<svg") || !svgString.includes("</svg>")) {
            throw new Error("Invalid SVG content");
        }
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    }
    catch (error) {
        const base64String = buffer instanceof Buffer
            ? buffer.toString("base64")
            : Buffer.from(buffer).toString("base64");
        return `data:image/svg+xml;base64,${base64String}`;
    }
};
// Helper function to convert image buffer to base64
const bufferToBase64 = (buffer) => {
    if (!buffer)
        return null;
    return buffer instanceof Buffer
        ? buffer.toString("base64")
        : Buffer.from(buffer).toString("base64");
};
exports.createSubWing = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, backgroundColor = "#FFFFFF", mainColor = "#000000", } = req.body;
    if (!name)
        throw new apiHandlerHelpers_1.ApiError(400, "Sub-wing name is required.");
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(backgroundColor) ||
        !hexColorRegex.test(mainColor)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid color format. Use hex codes like #FFFFFF or #FFF.");
    }
    let iconBuffer = null;
    if (req.file) {
        if (req.file.mimetype !== "image/svg+xml") {
            throw new apiHandlerHelpers_1.ApiError(400, "Only SVG files are allowed for the icon.");
        }
        iconBuffer = req.file.buffer;
    }
    yield db_1.prismaClient.subWing.create({
        data: {
            name,
            description: description || null,
            icon: iconBuffer,
            backgroundColor,
            mainColor,
        },
    });
    res
        .status(201)
        .json(new apiHandlerHelpers_1.ApiResponse(201, {}, "Sub-wing created successfully."));
}));
exports.addSubWingMember = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, position } = req.body;
    const subWingId = Number(req.params.subWingId);
    if (!name || !position || isNaN(subWingId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Name, position, and valid sub-wing ID are required.");
    }
    let imageBuffer = null;
    if (req.file) {
        imageBuffer = yield (0, sharp_1.default)(req.file.buffer)
            .resize(163, 231)
            .jpeg({ quality: 80 })
            .toBuffer();
    }
    yield db_1.prismaClient.subWingMember.create({
        data: {
            name,
            position,
            image: imageBuffer,
            subWingId,
        },
    });
    res
        .status(201)
        .json(new apiHandlerHelpers_1.ApiResponse(201, {}, "Member added successfully."));
}));
exports.deleteSubWingMember = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const memberId = Number(req.params.memberId);
    if (isNaN(memberId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid member ID.");
    yield db_1.prismaClient.subWingMember.delete({
        where: { id: memberId },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, {}, "Member deleted successfully."));
}));
exports.updateSubWingMember = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const memberId = Number(req.params.memberId);
    const { name, position } = req.body;
    if (isNaN(memberId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid member ID.");
    if (!name || !position)
        throw new apiHandlerHelpers_1.ApiError(400, "Name and position are required.");
    let imageBuffer = null;
    if (req.file) {
        imageBuffer = yield (0, sharp_1.default)(req.file.buffer)
            .resize(163, 231)
            .jpeg({ quality: 80 })
            .toBuffer();
    }
    const updateData = Object.assign({ name,
        position }, (imageBuffer && { image: imageBuffer }));
    const updatedMember = yield db_1.prismaClient.subWingMember.update({
        where: { id: memberId },
        data: updateData,
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, updatedMember, "Member updated successfully."));
}));
exports.getAllSubWings = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const subWings = yield db_1.prismaClient.subWing.findMany({
        select: {
            id: true,
            name: true,
            description: true,
            backgroundColor: true,
            mainColor: true,
            icon: true,
            _count: {
                select: {
                    members: true,
                },
            },
        },
    });
    const formattedSubWings = subWings.map((subWing) => {
        var _a;
        return ({
            id: subWing.id,
            name: subWing.name,
            description: subWing.description || null,
            backgroundColor: subWing.backgroundColor,
            mainColor: subWing.mainColor,
            icon: bufferToSvgDataUrl(subWing.icon),
            memberCount: ((_a = subWing._count) === null || _a === void 0 ? void 0 : _a.members) || 0,
        });
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, formattedSubWings, "Sub-wings retrieved successfully."));
}));
exports.getSubWingMembers = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const subWingId = Number(req.params.subWingId);
    if (isNaN(subWingId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid sub-wing ID.");
    const members = yield db_1.prismaClient.subWingMember.findMany({
        where: { subWingId },
        orderBy: { position: "asc" },
    });
    const formattedMembers = members.map((member) => ({
        id: member.id,
        name: member.name,
        position: member.position,
        subWingId: member.subWingId,
        image: member.image
            ? `data:image/jpeg;base64,${bufferToBase64(member.image)}`
            : null,
    }));
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, formattedMembers, "Members retrieved successfully."));
}));
exports.getSubWingDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const subWingId = Number(req.params.subWingId);
    if (isNaN(subWingId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid sub-wing ID.");
    const subWing = yield db_1.prismaClient.subWing.findUnique({
        where: { id: subWingId },
        include: {
            members: {
                orderBy: { position: "asc" },
                select: {
                    id: true,
                    name: true,
                    position: true,
                    image: true,
                },
            },
        },
    });
    if (!subWing)
        throw new apiHandlerHelpers_1.ApiError(404, "Sub-wing not found.");
    const formattedSubWing = {
        id: subWing.id,
        name: subWing.name,
        description: subWing.description || null,
        backgroundColor: subWing.backgroundColor,
        mainColor: subWing.mainColor,
        icon: bufferToSvgDataUrl(subWing.icon),
        members: subWing.members.map((member) => ({
            id: member.id,
            name: member.name,
            position: member.position,
            image: member.image
                ? `data:image/jpeg;base64,${bufferToBase64(member.image)}`
                : null,
        })),
    };
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, formattedSubWing, "Sub-wing details retrieved successfully."));
}));
exports.updateSubWing = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const subWingId = Number(req.params.subWingId);
    const { name, description, backgroundColor, mainColor } = req.body;
    if (isNaN(subWingId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid sub-wing ID.");
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if ((backgroundColor && !hexColorRegex.test(backgroundColor)) ||
        (mainColor && !hexColorRegex.test(mainColor))) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid color format. Use hex codes like #FFFFFF or #FFF.");
    }
    let iconBuffer = null;
    if (req.file) {
        if (req.file.mimetype !== "image/svg+xml") {
            throw new apiHandlerHelpers_1.ApiError(400, "Only SVG files are allowed for the icon.");
        }
        iconBuffer = req.file.buffer;
    }
    const updateData = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (name && { name })), (description !== undefined && { description })), (iconBuffer !== null && { icon: iconBuffer })), (backgroundColor && { backgroundColor })), (mainColor && { mainColor }));
    const updatedSubWing = yield db_1.prismaClient.subWing.update({
        where: { id: subWingId },
        data: updateData,
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, updatedSubWing, "Sub-wing updated successfully."));
}));
