import { Request, Response } from "express";
import sharp from "sharp";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse, ApiError } from "../utils/apiHandlerHelpers";
import { prismaClient } from "../config/db";

// Helper function to convert buffer to SVG data URL
const bufferToSvgDataUrl = (
  buffer: Buffer | Uint8Array | null
): string | null => {
  if (!buffer) return null;
  try {
    const svgString =
      buffer instanceof Buffer
        ? buffer.toString("utf8")
        : new TextDecoder().decode(buffer);
    if (!svgString.includes("<svg") || !svgString.includes("</svg>")) {
      throw new Error("Invalid SVG content");
    }
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  } catch (error) {
    const base64String =
      buffer instanceof Buffer
        ? buffer.toString("base64")
        : Buffer.from(buffer).toString("base64");
    return `data:image/svg+xml;base64,${base64String}`;
  }
};

// Helper function to convert image buffer to base64
const bufferToBase64 = (buffer: Buffer | Uint8Array | null): string | null => {
  if (!buffer) return null;
  return buffer instanceof Buffer
    ? buffer.toString("base64")
    : Buffer.from(buffer).toString("base64");
};

export const createSubWing = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      name,
      description,
      backgroundColor = "#FFFFFF",
      mainColor = "#000000",
    } = req.body;

    if (!name) throw new ApiError(400, "Sub-wing name is required.");

    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (
      !hexColorRegex.test(backgroundColor) ||
      !hexColorRegex.test(mainColor)
    ) {
      throw new ApiError(
        400,
        "Invalid color format. Use hex codes like #FFFFFF or #FFF."
      );
    }

    let iconBuffer: Buffer | null = null;
    if (req.file) {
      if (req.file.mimetype !== "image/svg+xml") {
        throw new ApiError(400, "Only SVG files are allowed for the icon.");
      }
      iconBuffer = req.file.buffer;
    }

    await prismaClient.subWing.create({
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
      .json(new ApiResponse(201, {}, "Sub-wing created successfully."));
  }
);

export const addSubWingMember = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, position } = req.body;
    const subWingId = Number(req.params.subWingId);

    if (!name || !position || isNaN(subWingId)) {
      throw new ApiError(
        400,
        "Name, position, and valid sub-wing ID are required."
      );
    }

    let imageBuffer: Buffer | null = null;
    if (req.file) {
      imageBuffer = await sharp(req.file.buffer)
        .resize(163, 231)
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    await prismaClient.subWingMember.create({
      data: {
        name,
        position,
        image: imageBuffer,
        subWingId,
      },
    });

    res
      .status(201)
      .json(new ApiResponse(201, {}, "Member added successfully."));
  }
);

export const deleteSubWingMember = asyncHandler(
  async (req: Request, res: Response) => {
    const memberId = Number(req.params.memberId);
    if (isNaN(memberId)) throw new ApiError(400, "Invalid member ID.");

    await prismaClient.subWingMember.delete({
      where: { id: memberId },
    });

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Member deleted successfully."));
  }
);

export const updateSubWingMember = asyncHandler(
  async (req: Request, res: Response) => {
    const memberId = Number(req.params.memberId);
    const { name, position } = req.body;

    if (isNaN(memberId)) throw new ApiError(400, "Invalid member ID.");
    if (!name || !position)
      throw new ApiError(400, "Name and position are required.");

    let imageBuffer: Buffer | null = null;
    if (req.file) {
      imageBuffer = await sharp(req.file.buffer)
        .resize(163, 231)
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    const updateData = {
      name,
      position,
      ...(imageBuffer && { image: imageBuffer }),
    };

    const updatedMember = await prismaClient.subWingMember.update({
      where: { id: memberId },
      data: updateData,
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, updatedMember, "Member updated successfully.")
      );
  }
);

export const getAllSubWings = asyncHandler(
  async (req: Request, res: Response) => {
    const subWings = await prismaClient.subWing.findMany({
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

    const formattedSubWings = subWings.map((subWing) => ({
      id: subWing.id,
      name: subWing.name,
      description: subWing.description || null,
      backgroundColor: subWing.backgroundColor,
      mainColor: subWing.mainColor,
      icon: bufferToSvgDataUrl(subWing.icon),
      memberCount: subWing._count?.members || 0,
    }));

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          formattedSubWings,
          "Sub-wings retrieved successfully."
        )
      );
  }
);

export const getSubWingMembers = asyncHandler(
  async (req: Request, res: Response) => {
    const subWingId = Number(req.params.subWingId);
    if (isNaN(subWingId)) throw new ApiError(400, "Invalid sub-wing ID.");

    const members = await prismaClient.subWingMember.findMany({
      where: { subWingId },
      orderBy: [
        { id: 'asc' },    // Newer members have higher IDs
        { position: 'asc' } // Then by position
      ],
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

    res.status(200).json(
      new ApiResponse(200, formattedMembers, "Members retrieved successfully.")
    );
  }
);
export const getSubWingDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const subWingId = Number(req.params.subWingId);
    if (isNaN(subWingId)) throw new ApiError(400, "Invalid sub-wing ID.");

    const subWing = await prismaClient.subWing.findUnique({
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

    if (!subWing) throw new ApiError(404, "Sub-wing not found.");

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
      .json(
        new ApiResponse(
          200,
          formattedSubWing,
          "Sub-wing details retrieved successfully."
        )
      );
  }
);

export const updateSubWing = asyncHandler(
  async (req: Request, res: Response) => {
    const subWingId = Number(req.params.subWingId);
    const { name, description, backgroundColor, mainColor } = req.body;

    if (isNaN(subWingId)) throw new ApiError(400, "Invalid sub-wing ID.");

    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (
      (backgroundColor && !hexColorRegex.test(backgroundColor)) ||
      (mainColor && !hexColorRegex.test(mainColor))
    ) {
      throw new ApiError(
        400,
        "Invalid color format. Use hex codes like #FFFFFF or #FFF."
      );
    }

    let iconBuffer: Buffer | null = null;
    if (req.file) {
      if (req.file.mimetype !== "image/svg+xml") {
        throw new ApiError(400, "Only SVG files are allowed for the icon.");
      }
      iconBuffer = req.file.buffer;
    }

    const updateData = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(iconBuffer !== null && { icon: iconBuffer }),
      ...(backgroundColor && { backgroundColor }),
      ...(mainColor && { mainColor }),
    };

    const updatedSubWing = await prismaClient.subWing.update({
      where: { id: subWingId },
      data: updateData,
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, updatedSubWing, "Sub-wing updated successfully.")
      );
  }
);

