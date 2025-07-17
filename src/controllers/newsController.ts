import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError, ApiResponse } from "../utils/apiHandlerHelpers";
import { prismaClient } from "../config/db";
import sharp from "sharp";
import { sendGlobalNotification } from "../utils/notify";

export const createNews = asyncHandler(async (req: Request, res: Response) => {
  const { type, heading, author, body, timeToRead } = req.body;

  if (!type || !heading || !author || !body || !timeToRead || !req.files) {
    throw new ApiError(
      400,
      "All fields are required, including the images and timeToRead."
    );
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  if (!files.image || !files.authorImage) {
    throw new ApiError(400, "Both news image and author image are required.");
  }

  try {
    const compressedImage = await sharp(files.image[0].buffer)
      .resize(800)
      .jpeg({ quality: 70 })
      .toBuffer();

    const compressedAuthorImage = await sharp(files.authorImage[0].buffer)
      .resize(200)
      .jpeg({ quality: 70 })
      .toBuffer();

    const news = await prismaClient.news.create({
      data: {
        type,
        heading,
        author,
        body,
        timeToRead,
        image: compressedImage,
        authorImage: compressedAuthorImage,
      },
    });
    await sendGlobalNotification({
      title: heading,
      body: "Check out the latest update!",
      data: { type: "news", newsId: news.id.toString() },
    });

    res
      .status(201)
      .json(new ApiResponse(201, news, "News created successfully."));
  } catch (error) {
    console.error("Error creating news:", error);
    throw new ApiError(500, "Internal Server Error.");
  }
});

export const getAllNews = asyncHandler(async (req: Request, res: Response) => {
  try {
    let { page, limit } = req.query;
    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const newsList = await prismaClient.news.findMany({
      skip,
      take: pageSize,
      select: {
        id: true,
        type: true,
        heading: true,
        author: true,
        timeToRead: true,
        createdAt: true,
        image: true,
        authorImage: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedNews = newsList.map((news) => ({
      ...news,
      image: news.image
        ? `data:image/jpeg;base64,${Buffer.from(news.image).toString("base64")}`
        : null,
      authorImage: news.authorImage
        ? `data:image/jpeg;base64,${Buffer.from(news.authorImage).toString(
            "base64"
          )}`
        : null,
    }));

    const totalNews = await prismaClient.news.count();
    const totalPages = Math.ceil(totalNews / pageSize);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          currentPage: pageNumber,
          totalPages,
          pageSize,
          totalNews,
          news: formattedNews,
        },
        "News list retrieved successfully."
      )
    );
  } catch (error) {
    console.error("Error fetching news:", error);
    throw new ApiError(500, "Error retrieving news");
  }
});

export const getNewsById = asyncHandler(async (req: Request, res: Response) => {
  const newsId = Number(req.params.id);
  if (isNaN(newsId)) throw new ApiError(400, "Invalid news ID.");

  try {
    // Get the requested news article
    const news = await prismaClient.news.findUnique({
      where: { id: newsId },
    });
    if (!news) throw new ApiError(404, "News not found.");

    // Get related news (excluding the current article)
    const relatedNews = await prismaClient.news.findMany({
      where: {
        NOT: { id: newsId }, // Exclude current news
      },
      take: 3, // Limit to 3 related articles
      select: {
        id: true,
        type: true,
        heading: true,
        timeToRead: true,
        createdAt: true,
        image: true,
        author: true,
        authorImage: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Format the images for both main news and related news
    const formattedNews = {
      ...news,
      image: `data:image/jpeg;base64,${Buffer.from(news.image).toString(
        "base64"
      )}`,
      authorImage: `data:image/jpeg;base64,${Buffer.from(
        news.authorImage
      ).toString("base64")}`,
      relatedNews: relatedNews.map((item) => ({
        ...item,
        image: item.image
          ? `data:image/jpeg;base64,${Buffer.from(item.image).toString(
              "base64"
            )}`
          : null,
        authorImage: item.authorImage
          ? `data:image/jpeg;base64,${Buffer.from(item.authorImage).toString(
              "base64"
            )}`
          : null,
      })),
    };

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          formattedNews,
          "News retrieved successfully with related articles."
        )
      );
  } catch (error) {
    console.error("Error fetching news by ID:", error);
    throw new ApiError(500, "Error retrieving news");
  }
});

export const updateNews = asyncHandler(async (req: Request, res: Response) => {
  const { type, heading, author, body, timeToRead } = req.body;
  const { id } = req.params;

  try {
    const existingNews = await prismaClient.news.findUnique({
      where: { id: Number(id) },
    });
    if (!existingNews) {
      throw new ApiError(404, "News not found.");
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let updatedImage = existingNews.image;
    let updatedAuthorImage = existingNews.authorImage;

    if (files?.image) {
      updatedImage = await sharp(files.image[0].buffer)
        .resize(800)
        .jpeg({ quality: 70 })
        .toBuffer();
    }

    if (files?.authorImage) {
      updatedAuthorImage = await sharp(files.authorImage[0].buffer)
        .resize(200)
        .jpeg({ quality: 70 })
        .toBuffer();
    }

    const updatedNews = await prismaClient.news.update({
      where: { id: Number(id) },
      data: {
        type,
        heading,
        author,
        body,
        timeToRead,
        image: updatedImage,
        authorImage: updatedAuthorImage,
      },
    });

    res
      .status(200)
      .json(new ApiResponse(200, updatedNews, "News updated successfully."));
  } catch (error) {
    console.error("Error updating news:", error);
    throw new ApiError(500, "Error updating news");
  }
});

export const deleteNews = asyncHandler(async (req: Request, res: Response) => {
  const newsId = Number(req.params.id);
  if (isNaN(newsId)) throw new ApiError(400, "Invalid news ID.");

  try {
    const existingNews = await prismaClient.news.findUnique({
      where: { id: newsId },
    });
    if (!existingNews) throw new ApiError(404, "News not found.");

    await prismaClient.news.delete({ where: { id: newsId } });

    res
      .status(200)
      .json(new ApiResponse(200, null, "News deleted successfully."));
  } catch (error) {
    console.error("Error deleting news:", error);
    throw new ApiError(500, "Error deleting news");
  }
});
