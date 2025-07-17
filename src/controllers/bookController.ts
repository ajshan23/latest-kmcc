import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError, ApiResponse } from "../utils/apiHandlerHelpers";
import { prismaClient } from "../config/db";
import sharp from "sharp";

export const createBook = asyncHandler(async (req: Request, res: Response) => {
  const { title, author, description } = req.body;

  if (!title || !author || !req.files) {
    throw new ApiError(
      400,
      "Title, author, and both PDF and cover image are required."
    );
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  if (!files.pdf || !files.coverImage) {
    throw new ApiError(400, "Both PDF file and cover image are required.");
  }

  try {
    // Compress the cover image
    const compressedCoverImage = await sharp(files.coverImage[0].buffer)
      .resize(800)
      .jpeg({ quality: 80 })
      .toBuffer();

    const book = await prismaClient.book.create({
      data: {
        title,
        author,
        description: description || null,
        pdfData: files.pdf[0].buffer, // Store PDF as-is
        coverImage: compressedCoverImage,
      },
    });

    res
      .status(201)
      .json(new ApiResponse(201, book, "Book created successfully."));
  } catch (error) {
    console.error("Error creating book:", error);
    throw new ApiError(500, "Internal Server Error.");
  }
});

export const getAllBooks = asyncHandler(async (req: Request, res: Response) => {
  try {
    let { page, limit } = req.query;
    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const books = await prismaClient.book.findMany({
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        coverImage: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedBooks = books.map((book) => ({
      ...book,
      coverImage: book.coverImage
        ? `data:image/jpeg;base64,${Buffer.from(book.coverImage).toString(
            "base64"
          )}`
        : null,
    }));

    const totalBooks = await prismaClient.book.count();
    const totalPages = Math.ceil(totalBooks / pageSize);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          currentPage: pageNumber,
          totalPages,
          pageSize,
          totalBooks,
          books: formattedBooks,
        },
        "Books retrieved successfully."
      )
    );
  } catch (error) {
    console.error("Error fetching books:", error);
    throw new ApiError(500, "Error retrieving books");
  }
});

export const getBookById = asyncHandler(async (req: Request, res: Response) => {
  const bookId = Number(req.params.id);
  if (isNaN(bookId)) throw new ApiError(400, "Invalid book ID.");

  try {
    const book = await prismaClient.book.findUnique({
      where: { id: bookId },
    });

    if (!book) throw new ApiError(404, "Book not found.");

    const formattedBook = {
      ...book,
      coverImage: `data:image/jpeg;base64,${Buffer.from(
        book.coverImage
      ).toString("base64")}`,
      pdfData: `data:application/pdf;base64,${Buffer.from(
        book.pdfData
      ).toString("base64")}`,
    };

    res
      .status(200)
      .json(
        new ApiResponse(200, formattedBook, "Book retrieved successfully.")
      );
  } catch (error) {
    console.error("Error fetching book:", error);
    throw new ApiError(500, "Error retrieving book");
  }
});

export const updateBook = asyncHandler(async (req: Request, res: Response) => {
  const { title, author, description } = req.body;
  const { id } = req.params;

  try {
    const existingBook = await prismaClient.book.findUnique({
      where: { id: Number(id) },
    });
    if (!existingBook) {
      throw new ApiError(404, "Book not found.");
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let updatedCoverImage = existingBook.coverImage;
    let updatedPdfData = existingBook.pdfData;

    if (files?.coverImage) {
      updatedCoverImage = await sharp(files.coverImage[0].buffer)
        .resize(800)
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    if (files?.pdf) {
      updatedPdfData = files.pdf[0].buffer;
    }

    const updatedBook = await prismaClient.book.update({
      where: { id: Number(id) },
      data: {
        title: title || existingBook.title,
        author: author || existingBook.author,
        description: description || existingBook.description,
        coverImage: updatedCoverImage,
        pdfData: updatedPdfData,
      },
    });

    res
      .status(200)
      .json(new ApiResponse(200, updatedBook, "Book updated successfully."));
  } catch (error) {
    console.error("Error updating book:", error);
    throw new ApiError(500, "Error updating book");
  }
});

export const deleteBook = asyncHandler(async (req: Request, res: Response) => {
  const bookId = Number(req.params.id);
  if (isNaN(bookId)) throw new ApiError(400, "Invalid book ID.");

  try {
    const existingBook = await prismaClient.book.findUnique({
      where: { id: bookId },
    });
    if (!existingBook) throw new ApiError(404, "Book not found.");

    await prismaClient.book.delete({ where: { id: bookId } });

    res
      .status(200)
      .json(new ApiResponse(200, null, "Book deleted successfully."));
  } catch (error) {
    console.error("Error deleting book:", error);
    throw new ApiError(500, "Error deleting book");
  }
});

export const getRecentBooks = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { limit } = req.query;
      const bookLimit = parseInt(limit as string) || 5; // Default to 5 recent books

      const recentBooks = await prismaClient.book.findMany({
        take: bookLimit,
        select: {
          id: true,
          title: true,
          author: true,
          coverImage: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const formattedBooks = recentBooks.map((book) => ({
        ...book,
        coverImage: book.coverImage
          ? `data:image/jpeg;base64,${Buffer.from(book.coverImage).toString(
              "base64"
            )}`
          : null,
      }));

      res.status(200).json(
        new ApiResponse(
          200,
          {
            count: recentBooks.length,
            books: formattedBooks,
          },
          "Recent books retrieved successfully."
        )
      );
    } catch (error) {
      console.error("Error fetching recent books:", error);
      throw new ApiError(500, "Error retrieving recent books");
    }
  }
);
export const downloadBookPdf = asyncHandler(
  async (req: Request, res: Response) => {
    const bookId = Number(req.params.id);
    if (isNaN(bookId)) throw new ApiError(400, "Invalid book ID.");

    try {
      const book = await prismaClient.book.findUnique({
        where: { id: bookId },
        select: {
          title: true,
          author: true,
          pdfData: true,
        },
      });

      if (!book) throw new ApiError(404, "Book not found.");
      if (!book.pdfData)
        throw new ApiError(404, "PDF not available for this book.");

      // Sanitize filename
      const sanitizeFilename = (str: string) =>
        str.replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");

      const safeTitle = sanitizeFilename(book.title);
      const safeAuthor = sanitizeFilename(book.author);
      const filename = `${safeTitle}-${safeAuthor}.pdf`;

      // Set headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", book.pdfData.length);

      // Send the PDF buffer directly
      res.end(book.pdfData);
    } catch (error) {
      console.error("Error downloading book PDF:", error);
      throw new ApiError(500, "Error downloading book PDF");
    }
  }
);

