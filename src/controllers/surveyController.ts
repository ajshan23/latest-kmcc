import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError, ApiResponse } from "../utils/apiHandlerHelpers";
import { prismaClient } from "../config/db";
import { AuthRequest } from "../middlewares/authMiddleware";
import sharp from "sharp";
import ExcelJS from "exceljs";

// ✅ Create a new survey
export const createSurvey = asyncHandler(
  async (req: Request, res: Response) => {
    const { title, questions } = req.body;

    // Create new survey
    const newSurvey = await prismaClient.survey.create({
      data: {
        title,
        questions,
      },
    });

    // Get all existing users
    const users = await prismaClient.user.findMany();

    // Create survey progress for existing users
    const surveyProgressEntries = users.map((user) => ({
      userId: user.id,
      surveyId: newSurvey.id,
      completed: false,
      lastQuestionId: null,
    }));

    if (surveyProgressEntries.length > 0) {
      await prismaClient.userSurveyProgress.createMany({
        data: surveyProgressEntries,
      });
    }

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          newSurvey,
          "Survey created successfully, and progress updated for users"
        )
      );
  }
);

// ✅ Get all active surveys
export const getSurveys = asyncHandler(async (req: Request, res: Response) => {
  const surveys = await prismaClient.survey.findMany({
    where: { isActive: true },
    include: {
      questions: {
        orderBy: { position: "asc" },
      },
    },
  });
  res
    .status(200)
    .json(new ApiResponse(200, { surveys }, "Fetched all active surveys"));
});

// ✅ Add a question to a survey
export const addQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const { surveyId, text, type, options } = req.body;
    if (!surveyId || !text || !type) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "All fields are required"));
    }

    const survey = await prismaClient.survey.findUnique({
      where: { id: parseInt(surveyId) },
    });
    if (!survey) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Invalid survey ID"));
    }

    if (!req.file) {
      throw new ApiError(400, "Image is required.");
    }
    const compressedImage = await sharp(req.file.buffer)
      .resize(300, 200)
      .jpeg({ quality: 80 })
      .toBuffer();

    // Get current count to set position
    const questionCount = await prismaClient.question.count({
      where: { surveyId: parseInt(surveyId) },
    });

    const question = await prismaClient.question.create({
      data: {
        surveyId: parseInt(surveyId),
        text,
        type,
        options:
          type === "multiple_choice"
            ? Array.isArray(options)
              ? options
              : JSON.parse(options)
            : null,
        image: compressedImage,
        position: questionCount, // Set position as the next in sequence
      },
    });

    res
      .status(200)
      .json(new ApiResponse(200, { question }, "Question added successfully"));
  }
);

// ✅ Reorder questions in a survey
export const reorderQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const { surveyId } = req.params;
    const { questionIds } = req.body;

    // Validate input
    if (!surveyId || isNaN(parseInt(surveyId))) {
      throw new ApiError(400, "Valid survey ID is required");
    }

    if (!questionIds || !Array.isArray(questionIds)) {
      throw new ApiError(400, "Ordered question IDs array is required");
    }

    const surveyIdNum = parseInt(surveyId);

    // Check survey exists
    const surveyExists = await prismaClient.survey.findUnique({
      where: { id: surveyIdNum },
    });

    if (!surveyExists) {
      throw new ApiError(404, "Survey not found");
    }

    // Verify all questions belong to this survey
    const questions = await prismaClient.question.findMany({
      where: {
        id: { in: questionIds },
        surveyId: surveyIdNum,
      },
    });

    if (questions.length !== questionIds.length) {
      const foundIds = questions.map((q) => q.id);
      const missingIds = questionIds.filter((id) => !foundIds.includes(id));
      throw new ApiError(
        400,
        `Some questions don't belong to this survey. Missing IDs: ${missingIds.join(
          ", "
        )}`
      );
    }

    // Check for duplicate IDs
    const uniqueIds = new Set(questionIds);
    if (uniqueIds.size !== questionIds.length) {
      throw new ApiError(400, "Duplicate question IDs in request");
    }

    // Update positions in a transaction
    try {
      await prismaClient.$transaction(
        questionIds.map((questionId, index) =>
          prismaClient.question.update({
            where: { id: questionId },
            data: { position: index },
          })
        )
      );

      res
        .status(200)
        .json(new ApiResponse(200, {}, "Questions reordered successfully"));
    } catch (error) {
      console.error("Error reordering questions:", error);
      throw new ApiError(500, "Failed to reorder questions");
    }
  }
);

// ✅ Get user's pending active survey for admin
export const getPendingSurveyForAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User ID is required"));
    }

    const pendingSurvey = await prismaClient.userSurveyProgress.findFirst({
      where: {
        userId: parseInt(userId),
        completed: false,
        survey: { isActive: true },
      },
      include: {
        survey: {
          include: {
            questions: {
              orderBy: { position: "asc" },
            },
          },
        },
      },
      orderBy: { surveyId: "asc" },
    });

    if (!pendingSurvey) {
      return res
        .status(200)
        .json(new ApiResponse(200, { completed: true }, "No pending surveys"));
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { survey: pendingSurvey.survey },
          "Pending survey found"
        )
      );
  }
);

// ✅ Ensure survey progress exists before checking pending surveys
async function ensureSurveyProgressForUser(userId: number) {
  const surveys = await prismaClient.survey.findMany();
  const existingProgress = await prismaClient.userSurveyProgress.findMany({
    where: { userId },
  });

  const existingSurveyIds = new Set(existingProgress.map((sp) => sp.surveyId));
  const missingSurveys = surveys.filter((s) => !existingSurveyIds.has(s.id));

  if (missingSurveys.length > 0) {
    await prismaClient.userSurveyProgress.createMany({
      data: missingSurveys.map((survey) => ({
        userId,
        surveyId: survey.id,
        completed: false,
        lastQuestionId: null,
      })),
    });
  }
}

// ✅ Get survey questions
export const getSurveyQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const { surveyId } = req.params;

    if (!surveyId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Survey ID is required"));
    }

    // Fetch the survey to ensure it exists
    const survey = await prismaClient.survey.findUnique({
      where: { id: parseInt(surveyId) },
    });

    if (!survey) {
      return res.status(404).json(new ApiResponse(404, {}, "Survey not found"));
    }

    // Fetch all questions associated with the survey
    const questions = await prismaClient.question.findMany({
      where: { surveyId: parseInt(surveyId) },
      orderBy: { position: "asc" },
    });

    // Convert image to Base64 format for each question
    const questionsWithBase64Images = questions.map((question) => ({
      ...question,
      image: question.image
        ? `data:image/jpeg;base64,${Buffer.from(question.image).toString(
            "base64"
          )}`
        : null,
    }));

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { questions: questionsWithBase64Images },
          "Questions fetched successfully"
        )
      );
  }
);

// ✅ Get user's pending active survey
export const getPendingSurvey = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User ID is required"));
    }

    // ✅ Ensure survey progress exists for this user
    await ensureSurveyProgressForUser(userId);

    // ✅ Find the first pending survey
    const pendingSurvey = await prismaClient.userSurveyProgress.findFirst({
      where: {
        userId,
        completed: false,
      },
      include: {
        survey: true,
      },
      orderBy: { surveyId: "asc" },
    });

    if (!pendingSurvey || !pendingSurvey.survey.isActive) {
      return res
        .status(200)
        .json(new ApiResponse(200, { completed: true }, "No pending surveys"));
    }

    const surveyId = pendingSurvey.surveyId;

    // ✅ Get total questions in the survey
    const totalQuestions = await prismaClient.question.count({
      where: { surveyId },
    });

    if (totalQuestions === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Survey has no questions"));
    }

    // ✅ Get answered questions count
    const answeredQuestions = await prismaClient.userSurveyAnswer.count({
      where: { surveyId, userId },
    });

    // ✅ Get all questions in survey (ordered by position)
    const allQuestions = await prismaClient.question.findMany({
      where: { surveyId },
      orderBy: { position: "asc" },
    });

    // ✅ Find unanswered questions
    const answeredQuestions1 = await prismaClient.userSurveyAnswer.findMany({
      where: { surveyId, userId },
      select: { questionId: true },
    });

    const answeredQuestionIds = new Set(
      answeredQuestions1.map((q) => q.questionId)
    );
    const pendingQuestion = allQuestions.find(
      (q) => !answeredQuestionIds.has(q.id)
    );

    // ✅ Mark survey as completed if all questions are answered
    if (!pendingQuestion) {
      await prismaClient.userSurveyProgress.updateMany({
        where: { userId, surveyId },
        data: { completed: true },
      });
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Survey already completed"));
    }

    // ✅ Convert image to Base64 format
    const output = {
      ...pendingQuestion,
      image: pendingQuestion.image
        ? `data:image/jpeg;base64,${Buffer.from(pendingQuestion.image).toString(
            "base64"
          )}`
        : null,
    };

    // ✅ Calculate progress
    const progress = {
      totalQuestions,
      answeredQuestions,
      remainingQuestions: totalQuestions - answeredQuestions,
      percentage:
        totalQuestions > 0
          ? Math.round((answeredQuestions / totalQuestions) * 100)
          : 0,
    };

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { surveyId, progress, output },
          "Pending survey found"
        )
      );
  }
);

// ✅ Get pending question for a user in a survey
export const getPendingQuestion = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { surveyId } = req.params;
    const userId = req.user?.userId;

    if (!surveyId || !userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Survey ID and User ID are required"));
    }

    const allQuestions = await prismaClient.question.findMany({
      where: { surveyId: parseInt(surveyId) },
      orderBy: { position: "asc" },
    });

    const answeredQuestions = await prismaClient.userSurveyAnswer.findMany({
      where: { surveyId: parseInt(surveyId), userId: userId },
      select: { questionId: true },
    });

    const answeredQuestionIds = new Set(
      answeredQuestions.map((q) => q.questionId)
    );

    const pendingQuestion = allQuestions.find(
      (q) => !answeredQuestionIds.has(q.id)
    );

    if (!pendingQuestion) {
      await prismaClient.userSurveyProgress.updateMany({
        where: { userId: userId, surveyId: parseInt(surveyId) },
        data: { completed: true },
      });
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Survey already completed"));
    }

    const output = {
      ...pendingQuestion,
      image: `data:image/jpeg;base64,${Buffer.from(
        pendingQuestion.image
      ).toString("base64")}`,
    };

    res
      .status(200)
      .json(new ApiResponse(200, { output }, "Next pending question"));
  }
);

// ✅ Submit an answer and track progress
export const submitAnswer = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { surveyId, questionId, answer } = req.body;
    const userId = req.user?.userId;

    if (!userId || !surveyId || !questionId || answer === undefined) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "All fields are required"));
    }

    const survey = await prismaClient.survey.findUnique({
      where: { id: parseInt(surveyId) },
    });
    if (!survey) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Invalid survey ID"));
    }

    const question = await prismaClient.question.findUnique({
      where: { id: parseInt(questionId) },
    });
    if (!question) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Invalid question ID"));
    }

    await prismaClient.userSurveyAnswer.create({
      data: { userId, surveyId, questionId, answer },
    });

    // Get all questions in the survey (ordered by position)
    const allQuestions = await prismaClient.question.findMany({
      where: { surveyId: parseInt(surveyId) },
      orderBy: { position: "asc" },
    });

    // Get answered questions count
    const answeredQuestions = await prismaClient.userSurveyAnswer.count({
      where: { userId, surveyId: parseInt(surveyId) },
    });

    // Calculate progress
    const totalQuestions = allQuestions.length;
    const progress = {
      totalQuestions,
      answeredQuestions,
      remainingQuestions: totalQuestions - answeredQuestions,
      percentage:
        totalQuestions > 0
          ? Math.round((answeredQuestions / totalQuestions) * 100)
          : 0,
    };

    // Find the next unanswered question
    const answeredQuestionsList = await prismaClient.userSurveyAnswer.findMany({
      where: { userId, surveyId: parseInt(surveyId) },
    });

    const remainingQuestion = allQuestions.find(
      (q) => !answeredQuestionsList.some((a) => a.questionId === q.id)
    );

    if (!remainingQuestion) {
      await prismaClient.userSurveyProgress.updateMany({
        where: { userId, surveyId: parseInt(surveyId) },
        data: { completed: true, lastQuestionId: null },
      });
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            completed: true,
            progress,
          },
          "Survey completed!"
        )
      );
    }

    await prismaClient.userSurveyProgress.updateMany({
      where: { userId, surveyId: parseInt(surveyId) },
      data: { lastQuestionId: remainingQuestion.id },
    });

    // Prepare next question with base64 image
    const nextQuestion = {
      ...remainingQuestion,
      image: remainingQuestion.image
        ? `data:image/jpeg;base64,${Buffer.from(
            remainingQuestion.image
          ).toString("base64")}`
        : null,
    };

    res.status(200).json(
      new ApiResponse(
        200,
        {
          nextQuestion,
          progress,
          completed: false,
        },
        "Next question retrieved"
      )
    );
  }
);

// ✅ Get survey progress
export const getSurveyProgress = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { surveyId } = req.params;
    const userId = req.user?.userId;
    if (!surveyId || !userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Survey ID and User ID are required"));
    }

    // Get total questions in the survey
    const totalQuestions = await prismaClient.question.count({
      where: { surveyId: parseInt(surveyId) },
    });

    // Get answered questions count
    const answeredQuestions = await prismaClient.userSurveyAnswer.count({
      where: { surveyId: parseInt(surveyId), userId: userId },
    });

    const progress = {
      totalQuestions,
      answeredQuestions,
      remainingQuestions: totalQuestions - answeredQuestions,
      percentage:
        totalQuestions > 0
          ? Math.round((answeredQuestions / totalQuestions) * 100)
          : 0,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, { progress }, "Survey progress fetched"));
  }
);

// ✅ Delete survey
export const deleteSurvey = asyncHandler(
  async (req: Request, res: Response) => {
    const { surveyId } = req.params;

    if (!surveyId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Survey ID is required"));
    }

    const survey = await prismaClient.survey.findUnique({
      where: { id: parseInt(surveyId) },
    });

    if (!survey) {
      return res.status(404).json(new ApiResponse(404, {}, "Survey not found"));
    }

    // Delete related data
    await prismaClient.userSurveyAnswer.deleteMany({
      where: { surveyId: parseInt(surveyId) },
    });

    await prismaClient.userSurveyProgress.deleteMany({
      where: { surveyId: parseInt(surveyId) },
    });

    await prismaClient.question.deleteMany({
      where: { surveyId: parseInt(surveyId) },
    });

    // Delete the survey
    await prismaClient.survey.delete({
      where: { id: parseInt(surveyId) },
    });

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Survey deleted successfully"));
  }
);

// ✅ Delete question
export const deleteQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const { questionId } = req.params;

    if (!questionId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Question ID is required"));
    }

    // Check if the question exists
    const question = await prismaClient.question.findUnique({
      where: { id: parseInt(questionId) },
    });

    if (!question) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Question not found"));
    }

    // Delete associated answers first to avoid foreign key constraint errors
    await prismaClient.userSurveyAnswer.deleteMany({
      where: { questionId: parseInt(questionId) },
    });

    // Delete the question
    await prismaClient.question.delete({
      where: { id: parseInt(questionId) },
    });

    // Reorder remaining questions in the survey
    const remainingQuestions = await prismaClient.question.findMany({
      where: { surveyId: question.surveyId },
      orderBy: { position: "asc" },
    });

    await prismaClient.$transaction(
      remainingQuestions.map((q, index) =>
        prismaClient.question.update({
          where: { id: q.id },
          data: { position: index },
        })
      )
    );

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Question deleted successfully"));
  }
);

// ✅ Get question by ID
export const getQuestionById = asyncHandler(
  async (req: Request, res: Response) => {
    const { questionId } = req.params;

    if (!questionId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Question ID is required"));
    }

    const question = await prismaClient.question.findUnique({
      where: { id: parseInt(questionId) },
    });

    if (!question) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Question not found"));
    }

    // Convert image to Base64 format
    const questionWithImage = {
      ...question,
      image: question.image
        ? `data:image/jpeg;base64,${Buffer.from(question.image).toString(
            "base64"
          )}`
        : null,
    };

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { question: questionWithImage },
          "Question retrieved successfully"
        )
      );
  }
);

// ✅ Update question
export const updateQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const { questionId } = req.params;
    const { text, type, options } = req.body;

    if (!questionId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Question ID is required"));
    }

    // Check if question exists
    const existingQuestion = await prismaClient.question.findUnique({
      where: { id: parseInt(questionId) },
    });

    if (!existingQuestion) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Question not found"));
    }

    let compressedImage: Buffer | undefined;
    if (req.file) {
      compressedImage = await sharp(req.file.buffer)
        .resize(300, 200)
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    const updateData: {
      text?: string;
      type?: string;
      options?: any;
      image?: Buffer;
      required?: boolean;
    } = {
      ...(text && { text }),
      ...(type && { type }),
      ...(options && {
        options:
          type === "multiple_choice"
            ? Array.isArray(options)
              ? options
              : JSON.parse(options)
            : null,
      }),
      ...(compressedImage && { image: compressedImage }),
    };

    const updatedQuestion = await prismaClient.question.update({
      where: { id: parseInt(questionId) },
      data: updateData,
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { updatedQuestion },
          "Question updated successfully"
        )
      );
  }
);

// ✅ Get survey answers
export const getSurveyAnswers = asyncHandler(
  async (req: Request, res: Response) => {
    const { surveyId } = req.params;

    if (!surveyId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Survey ID is required"));
    }

    // Get survey details
    const survey = await prismaClient.survey.findUnique({
      where: { id: parseInt(surveyId) },
      include: {
        questions: {
          select: {
            id: true,
            text: true,
            type: true,
            options: true,
          },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!survey) {
      return res.status(404).json(new ApiResponse(404, {}, "Survey not found"));
    }

    // Get all answers for this survey with user information
    const answers = await prismaClient.userSurveyAnswer.findMany({
      where: { surveyId: parseInt(surveyId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            memberId: true,
            email: true,
          },
        },
        question: {
          select: {
            id: true,
            text: true,
          },
        },
      },
      orderBy: {
        userId: "asc",
      },
    });

    // Group answers by user
    const answersByUser = answers.reduce((acc, answer) => {
      if (!acc[answer.userId]) {
        acc[answer.userId] = {
          user: answer.user,
          answers: {},
        };
      }
      acc[answer.userId].answers[answer.questionId] = answer.answer;
      return acc;
    }, {} as Record<number, { user: any; answers: Record<number, string> }>);

    // Calculate statistics for each question
    const questionStats = survey.questions
      .map((question) => {
        // Only process multiple choice questions
        if (question.type !== "multiple_choice") return null;

        // Safely handle options - could be string, array, or other JSON value
        let options: string[] = [];

        if (Array.isArray(question.options)) {
          // If options is already an array (direct from Prisma)
          options = question.options.filter((opt) => typeof opt === "string");
        } else if (typeof question.options === "string") {
          // If options is a JSON string (legacy format)
          try {
            const parsed = JSON.parse(question.options);
            if (Array.isArray(parsed)) {
              options = parsed.filter((opt) => typeof opt === "string");
            }
          } catch (e) {
            console.error(
              `Error parsing options for question ${question.id}:`,
              e
            );
          }
        }

        // Initialize stats with all options set to 0
        const stats: Record<string, number> = {};
        options.forEach((option) => {
          stats[option] = 0;
        });

        let totalAnswers = 0;

        // Count answers for each option
        Object.values(answersByUser).forEach((userData) => {
          const answer = userData.answers[question.id];
          if (typeof answer === "string" && stats.hasOwnProperty(answer)) {
            stats[answer]++;
            totalAnswers++;
          }
        });

        return {
          questionId: question.id,
          questionText: question.text,
          options: Object.entries(stats).map(([option, count]) => ({
            option,
            count,
            percentage:
              totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0,
          })),
          totalAnswers,
        };
      })
      .filter(Boolean);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          survey,
          answers: answersByUser,
          statistics: questionStats,
          totalRespondents: Object.keys(answersByUser).length,
        },
        "Survey answers fetched successfully"
      )
    );
  }
);

interface SurveyAnswer {
  userId: number;
  user: {
    name: string;
    iqamaNumber: string;
  };
  questionId: number;
  answer: string;
  question: {
    text: string;
  };
}

interface UserAnswers {
  [userId: number]: {
    user: {
      name: string;
      iqamaNumber: string;
    };
    answers: {
      [questionId: number]: string;
    };
  };
}

export const exportSurveyAnswers = asyncHandler(
  async (req: Request, res: Response) => {
    const { surveyId } = req.params;

    if (!surveyId || isNaN(parseInt(surveyId))) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Valid survey ID is required"));
    }

    const numericSurveyId = parseInt(surveyId);

    try {
      // Get survey with questions
      const survey = await prismaClient.survey.findUnique({
        where: { id: numericSurveyId },
        include: {
          questions: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              text: true,
            },
          },
        },
      });

      if (!survey) {
        return res
          .status(404)
          .json(new ApiResponse(404, {}, "Survey not found"));
      }

      // Get all answers for this survey with user information
      const answers = (await prismaClient.userSurveyAnswer.findMany({
        where: { surveyId: numericSurveyId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              iqamaNumber: true,
            },
          },
          question: {
            select: {
              id: true,
              text: true,
            },
          },
        },
        orderBy: {
          userId: "asc",
        },
      })) as SurveyAnswer[];

      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Survey Answers");

      // Prepare headers
      const headers = ["Username", "Iqama Number"];
      const questionColumns: { [key: number]: string } = {};

      // Add question columns (dynamically named qn1, qn2, etc.)
      survey.questions.forEach((question, index) => {
        const columnName = `qn${index + 1}`;
        headers.push(columnName);
        questionColumns[question.id] = columnName;
      });

      // Add headers to worksheet
      worksheet.addRow(headers);

      // Group answers by user
      const answersByUser: UserAnswers = {};
      answers.forEach((answer) => {
        if (!answersByUser[answer.userId]) {
          answersByUser[answer.userId] = {
            user: answer.user,
            answers: {},
          };
        }
        answersByUser[answer.userId].answers[answer.questionId] = answer.answer;
      });

      // Add data rows
      Object.values(answersByUser).forEach((userData) => {
        const row: any[] = [userData.user.name, userData.user.iqamaNumber];

        // Add answers in the correct order
        survey.questions.forEach((question) => {
          row.push(userData.answers[question.id] || "");
        });

        worksheet.addRow(row);
      });

      // Set response headers for file download
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=survey_${surveyId}_answers.xlsx`
      );

      // Write the workbook to the response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error exporting survey answers:", error);
      return res
        .status(500)
        .json(new ApiResponse(500, {}, "Failed to export survey answers"));
    }
  }
);
