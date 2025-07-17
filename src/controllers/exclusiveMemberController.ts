import { Request, Response } from "express";
import sharp from "sharp";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse, ApiError } from "../utils/apiHandlerHelpers";
import { prismaClient } from "../config/db";

// Create Exclusive Member
export const createExclusiveMember = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, position } = req.body;

    if (!name || !position) {
      throw new ApiError(400, "Name and position are required.");
    }

    if (!req.file) {
      throw new ApiError(400, "Image is required.");
    }

    try {
      const imageBuffer = await sharp(req.file.buffer)
        .resize(300, 300) // Added consistent image sizing
        .jpeg({ quality: 80 })
        .toBuffer();

      // Get current count to set position
      const memberCount = await prismaClient.exclusiveMember.count();
      const newPriority = memberCount;

      const member = await prismaClient.exclusiveMember.create({
        data: {
          name,
          position,
          image: imageBuffer,
          priority: newPriority,
        },
      });

      res
        .status(201)
        .json(new ApiResponse(201, member, "Member created successfully"));
    } catch (error) {
      console.error("Error creating member:", error);
      throw new ApiError(500, "Failed to create member");
    }
  }
);

// Get All Members (Ordered by priority)
export const getAllExclusiveMembers = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const members = await prismaClient.exclusiveMember.findMany({
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

      const formattedMembers = members.map((member) => ({
        ...member,
        image: member.image
          ? `data:image/jpeg;base64,${Buffer.from(member.image).toString(
              "base64"
            )}`
          : null,
      }));

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { members: formattedMembers },
            "Members retrieved"
          )
        );
    } catch (error) {
      console.error("Error fetching members:", error);
      throw new ApiError(500, "Failed to fetch members");
    }
  }
);

// Get Single Member
export const getExclusiveMember = asyncHandler(
  async (req: Request, res: Response) => {
    const memberId = parseInt(req.params.id);

    if (isNaN(memberId)) {
      throw new ApiError(400, "Invalid member ID");
    }

    try {
      const member = await prismaClient.exclusiveMember.findUnique({
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
        throw new ApiError(404, "Member not found");
      }

      const formattedMember = {
        ...member,
        image: member.image
          ? `data:image/jpeg;base64,${Buffer.from(member.image).toString(
              "base64"
            )}`
          : null,
      };

      res
        .status(200)
        .json(
          new ApiResponse(200, formattedMember, "Member retrieved successfully")
        );
    } catch (error) {
      console.error("Error fetching member:", error);
      throw new ApiError(500, "Failed to fetch member");
    }
  }
);

// Update Member
export const updateExclusiveMember = asyncHandler(
  async (req: Request, res: Response) => {
    const memberId = parseInt(req.params.id);
    const { name, position } = req.body;

    if (isNaN(memberId)) {
      throw new ApiError(400, "Invalid member ID");
    }

    try {
      const updateData: {
        name?: string;
        position?: string;
        image?: Buffer;
      } = {
        name,
        position,
      };

      if (req.file) {
        const imageBuffer = await sharp(req.file.buffer)
          .resize(300, 300) // Added consistent image sizing
          .jpeg({ quality: 80 })
          .toBuffer();
        updateData.image = imageBuffer;
      }

      const updatedMember = await prismaClient.exclusiveMember.update({
        where: { id: memberId },
        data: updateData,
      });

      res
        .status(200)
        .json(new ApiResponse(200, updatedMember, "Member updated"));
    } catch (error) {
      console.error("Error updating member:", error);
      throw new ApiError(500, "Failed to update member");
    }
  }
);

// Reorder Members
export const reorderExclusiveMembers = asyncHandler(
  async (req: Request, res: Response) => {
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds)) {
      throw new ApiError(400, "Member IDs array required");
    }

    // Check for duplicate IDs
    const uniqueIds = new Set(memberIds);
    if (uniqueIds.size !== memberIds.length) {
      throw new ApiError(400, "Duplicate member IDs in request");
    }

    try {
      // Verify all members exist
      const members = await prismaClient.exclusiveMember.findMany({
        where: { id: { in: memberIds } },
      });

      if (members.length !== memberIds.length) {
        const foundIds = members.map((m) => m.id);
        const missingIds = memberIds.filter((id) => !foundIds.includes(id));
        throw new ApiError(
          400,
          `Some members don't exist. Missing IDs: ${missingIds.join(", ")}`
        );
      }

      // Update priorities in a transaction
      await prismaClient.$transaction(
        memberIds.map((id, index) =>
          prismaClient.exclusiveMember.update({
            where: { id },
            data: { priority: index },
          })
        )
      );

      res
        .status(200)
        .json(new ApiResponse(200, {}, "Members reordered successfully"));
    } catch (error) {
      console.error("Error reordering members:", error);
      throw new ApiError(500, "Failed to reorder members");
    }
  }
);

// Delete Member
export const deleteExclusiveMember = asyncHandler(
  async (req: Request, res: Response) => {
    const memberId = parseInt(req.params.id);

    if (isNaN(memberId)) {
      throw new ApiError(400, "Invalid member ID");
    }

    try {
      // First verify member exists
      const member = await prismaClient.exclusiveMember.findUnique({
        where: { id: memberId },
      });

      if (!member) {
        throw new ApiError(404, "Member not found");
      }

      // Delete the member
      await prismaClient.exclusiveMember.delete({ where: { id: memberId } });

      // Reorder remaining members
      const remainingMembers = await prismaClient.exclusiveMember.findMany({
        orderBy: { priority: "asc" },
      });

      await prismaClient.$transaction(
        remainingMembers.map((member, index) =>
          prismaClient.exclusiveMember.update({
            where: { id: member.id },
            data: { priority: index },
          })
        )
      );

      res
        .status(200)
        .json(new ApiResponse(200, null, "Member deleted successfully"));
    } catch (error) {
      console.error("Error deleting member:", error);
      throw new ApiError(500, "Failed to delete member");
    }
  }
);
