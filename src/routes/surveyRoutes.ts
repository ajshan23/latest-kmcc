import { Router } from "express";
import {
  createSurvey,
  getSurveys,
  addQuestions,
  getPendingSurvey,
  getPendingQuestion,
  submitAnswer,
  getSurveyProgress,
  getPendingSurveyForAdmin,
  getSurveyQuestions,
  deleteSurvey,
  deleteQuestion,
  getQuestionById,
  updateQuestion,
  getSurveyAnswers,
  reorderQuestions,
  exportSurveyAnswers, // Import the deleteSurvey controller
} from "../controllers/surveyController";
import { authenticateUser } from "../middlewares/authMiddleware";
import { upload } from "../controllers/adminController";

const router = Router();

// Survey routes
router
  .route("/")
  .post(createSurvey) // Create a new survey
  .get(getSurveys); // Get all surveys

// Delete a survey
router.route("/:surveyId").delete(deleteSurvey);

// Question routes
router.route("/question").post(upload.single("image"), addQuestions); // Add questions to a survey
router.route("/answers/:surveyId").get(getSurveyAnswers);
router.delete("/question/:questionId", deleteQuestion);
router
  .route("/question/:questionId")
  .get(getQuestionById) // Get question by ID
  .put(upload.single("image"), updateQuestion);
router.get("/surveys/:surveyId/questions", getSurveyQuestions);

// Get pending survey for a user admin
router.route("/pending/user/:userId").get(getPendingSurveyForAdmin);

// Get pending survey for a user
router.route("/pending").get(authenticateUser, getPendingSurvey);

router.get("/export/:surveyId", exportSurveyAnswers);
// Get pending question for a user in a survey
router
  .route("/pending/survey/:surveyId")
  .get(authenticateUser, getPendingQuestion);

// Submit an answer
router.route("/submit").post(authenticateUser, submitAnswer);
//order re
router.route("/surveys/:surveyId/reorder-questions").post(reorderQuestions);
router.route("/:surveyId/progress").get(authenticateUser, getSurveyProgress);
export default router;
